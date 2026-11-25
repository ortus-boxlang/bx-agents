---
title: Embeds
icon: phosphor-duotone:chat-teardrop-dots
summary: Put your agent on another website as a chat widget for anonymous visitors.
description: An embed is a stored definition (look, tools, allowed websites, limits) that lets visitors of another site chat with the agent. This page is the spec for the first increment, the anonymous docs agent.
tags: [conventions, embeds, web-ui, security]
---

# Embeds

!!! info "Status"
    This page is the **spec** for increment 1, written before the code. Anything marked *proposed* is open to change. What is
    built is listed in the [changelog](https://github.com/ortus-boxlang/bx-agents/blob/development/changelog.md).

An **embed** lets a visitor of another website chat with your agent. An admin defines it in the web app (Admin, Embeds), copies
a snippet, and pastes it into the other site. Increment 1 supports one case: an **anonymous docs agent**. The visitor is not
signed in, may only ask questions, and the agent may only use the tools the embed lists.

Out of scope for now: signed-in visitors (identity tokens), approvals, the temporary history mode, host-side helpers, extension
hooks, bot protection, variables and context.

## The record

An embed lives in the agent's **database**, next to the access tokens. It is never written in `Agent.yml`: it is changed from the
web app while the agent runs, and it holds a key.

```text
{
  id         "emb_7Kq2xV9nR4"     generated; public, like a site key; not a secret
  name       "Docs helper"
  enabled    true
  expires    optional date        an expired embed answers like an unknown one
  keyVersion 1                    goes up when the key is rotated
  target     { agent, profile }   which agent and which model profile answer
  look       { title, welcome, placeholder, suggestions[<=3], color, position, theme }
  tools      [ "docs_search" ]    names; the ONLY tools a visitor's turn may use
  limits     { allowedOrigins[], perVisitorPerMinute, dailyMessages, maxMessageChars }
}
```

The signing key is kept beside the record on the server and is **never** returned by any route. Only `look` is ever sent to a
browser. Every field is validated on save and again on use.

| Field | Rule |
|---|---|
| `id` | `emb_` plus 10 characters from `[A-Za-z0-9]`, made by the server |
| `allowedOrigins` | at least one; each exactly `scheme://host[:port]`, no path, no wildcard, no `null` |
| `tools` | each must be a tool the agent has; an unknown name is refused on save and ignored on use |
| `perVisitorPerMinute` | default 10 |
| `dailyMessages` | default 200, for the whole embed |
| `maxMessageChars` | default 2000 |
| `look.color` | `#rrggbb` only; `look.position` `bottom-right` or `bottom-left`; `look.theme` `light`, `dark` or `auto` |
| `look.suggestions` | up to 3 strings, each up to 120 characters |

The server uses **only the stored record**. A page can send an agent, profile, model, tool list, limit or user id and it changes
nothing.

## Routes

All sit under the agent API path (`/__bxagents` unless moved), so `<api>` below.

### Public (for visitors)

```text
GET  <api>/embed/widget.js        the script and the <bx-agent> element
GET  <api>/embed/<id>/config      look and text only; origin checked; cached briefly
POST <api>/embed/<id>/session     origin checked, rate limited; answers { token, expiresAt }
POST <api>/embed/<id>/events      Authorization: Bearer <token>; body { input, conversationId? }; answers an SSE stream
POST <api>/embed/<id>/cancel      Bearer; body { threadId }; stops the visitor's own run          (proposed)
GET  <api>/embed/<id>/history     Bearer; ?conversationId=...; the visitor's own saved chat      (proposed)
GET  <api>/embed/<id>/frame       the hosted chat page for an iframe; CSP frame-ancestors
OPTIONS on each of the above      the CORS preflight, answered for listed origins only
```

`cancel` and `history` are added to the proposed list because the brief says a visitor can stop its own run and read its own
saved chats, and those need a route each.

**Where they sit.** The public routes are **outside** the token gate and the address guards of the agent API
(`models/api/Guards.bx`: `AllowedIPs@cbsecurity` and `Throttle@cbsecurity`), and have their own checks. Reasons, from reading
`Guards.bx` and `Authenticator.bx`:

- `Throttle@cbsecurity` counts by IP in **one counter shared by the whole API** (`bxagents-api`). A crowd of visitors behind
  one proxy would spend the budget the admin and the web app need.
- `allowedIPs` is meant to keep a private API private. Visitors come from anywhere.
- The token check proves a caller who holds a token. A visitor holds none, and gets a signed session instead.

An embed route never reaches an admin route, because it is a different set of handlers and the caller it builds has the
`embed` scope (below).

### Admin (admin scope only)

```text
GET    <api>/embeds                   list
POST   <api>/embeds                   create; the answer carries the new id
GET    <api>/embeds/<id>              one embed, without the key
PUT    <api>/embeds/<id>              replace the editable fields (validated); enable and disable are the field `enabled`
POST   <api>/embeds/<id>/rotate       new signing key; every open session stops working
GET    <api>/embeds/<id>/snippets     the HTML script tag, iframe, web component and curl, with the id filled in
GET    <api>/embeds/<id>/usage        counters: messages in the last 7 days, blocked for a wrong origin, visitors who hit a limit
```

CLI: `bxAgents embed create|list|show|disable|rotate`. They are added to `ApiContract`, so the OpenAPI document and the route
specs pick them up.

## A visit, step by step

1. The page loads `widget.js` from the agent: `<script src="https://agent.example/__bxagents/embed/widget.js" data-embed="emb_..." defer></script>`. The widget works out its base address from its own script URL.
2. At connect time the widget reads its **attributes** (not properties set later by page script) and calls `GET /config`.
   The server answers only if the `Origin` header is on the embed's list, with `Access-Control-Allow-Origin` set to that origin.
3. On the first message it calls `POST /session`. The server checks the origin and the per-visitor limit, makes a visitor id and answers a signed **session token**.
4. `POST /events` sends the message with `Authorization: Bearer <token>`. The server checks the token, the origin it was issued to, the limits and the length, then runs the agent **in process** and re-emits its frames as SSE. An empty `message` frame every 30 seconds is forwarded, so a long silent run survives a proxy's 60 second read timeout.
5. The widget keeps a readable transcript in `localStorage` (the server also stores the chat under the visitor, see below).

## The session token

A signed token (the `jwt` class of cbsecurity's jwtcfml, which takes a key on each call), HS256, signed with the **embed's own**
key. Claims: `emb` (the embed id), `v` (the visitor id), `o` (the origin it was issued to), `exp` (1 hour), `kv` (the key version).

A token is refused with **401** when the signature is wrong, it is expired, `emb` is another embed, `o` is not the `Origin` of this
request, `kv` is not the current key version, or it is missing. The same token sent from another origin is refused.

Limits run on the **server's clock**, never on a time the client sends:

| Limit | Over it |
|---|---|
| per visitor, per minute | `429` with `Retry-After` |
| daily messages for the embed | `429` |
| message longer than `maxMessageChars` | `400` |

## The embed caller and its scope

Today a Caller (`models/api/Caller.bx`) has scope `chat` or `admin`. This adds a third, least-privilege scope **`embed`**. An
embed caller has id `v:<visitorId>` and is built from the verified session, never from the request body.

| An `embed` caller can | An `embed` caller can never |
|---|---|
| send a message (`events`) | read or write notes, memory or the vault |
| stream and stop **its own** run | read another visitor's conversations or runs |
| read **its own** saved chats | reach any admin, token, log, backup, settings, gateway, routine or connector route |
| | choose the agent, profile, model, params or tools of a turn |

Run ids are already scoped by caller (`TurnRunner` hands bx-ai `u:<caller id>:<thread id>`), so a visitor cannot reach another
visitor's run even if it guesses the id.

**Conversation ids are issued by the server**, never trusted from the client: `c-<first 12 characters of the visitor id>-<client
label>`, where the label is the client's own text cut to `a-z0-9-` and 24 characters. A spike found that two callers sharing a
client-chosen id silently lose the second one's listing.

History in this increment: conversations are stored under the visitor like any other caller's. The temporary mode is a later increment.

## The embed filter

A middleware that ships with the agent and is **always on**. A request that is not an embed call is left alone. For an embed call
only the tools on the embed's list may run. Proven by a spike (`plans/embed-filter-findings.md`), it does both:

- `beforeLLMCall` removes the unlisted tools from `dataPacket.tools`, so the model is never offered them.
- `beforeToolCall` rejects a call to an unlisted tool, so a model that names one anyway (from training or an earlier turn) gets a refusal and the tool body never runs.

Hiding alone is not a guard. How the filter knows it is an embed call is decided with task 5.

## Threat model

Visitors are anonymous and anyone on the internet can become one, so **the Origin check is not authentication**.

**What the Origin check does.** It stops a *browser* on an unlisted site from reading the config or getting a session, and (with
the origin bound into the token) from reusing a token it was handed. CORS headers are only sent for listed origins, and the hosted
frame can only be embedded by listed sites (`frame-ancestors`).

**What it does not do.** The `Origin` header is set by the browser, so any program (`curl`, a script) can send whatever it likes.
It does not stop a person from calling the embed directly. Do not rely on it for that.

**What does protect you**, in order of importance:

1. **The tool list.** A visitor's turn can only use the tools the embed lists. Do not list a tool you would not let a stranger run.
2. **The `embed` scope.** Even a fully scripted attacker can only chat. No notes, memory, vault, other chats or admin routes.
3. **The limits.** Per visitor per minute, a daily cap for the whole embed, a maximum message length. The daily cap is also the cost cap.
4. **Server-side truth.** The record decides the agent, profile, model and tools. A forged `userId`, `agent`, `profile` or `tools` in a body changes nothing.
5. **Key rotation and disable.** Rotating the key ends every session at once. A disabled or expired embed answers like an unknown one (same status, same body), so a visitor cannot tell which ids exist.

**Accepted for now:** a script can mint many visitor ids (each session call is rate limited, but not by identity). The daily cap
bounds the damage. Bot protection is a later increment. Prompt injection through a visitor's message is possible for any agent that
takes text: keep the tool list to read-only tools.

`SSE( cors : origin )` also sends `Access-Control-Allow-Credentials: true`. The embed routes use **no cookies**, so credentials
are not needed and the embed routes send the CORS headers by hand without it.

## The hosted frame

`GET /embed/<id>/frame` returns the chat page for an `<iframe>`, with `Content-Security-Policy: frame-ancestors <the allowed
origins>`. A site that is not listed cannot frame it. The page loads the same widget.

## The Embeds admin page

A page in the web app (`bxagentsui`), under **Admin**, next to Gateways, admin scope only, themed like the other pages (system,
light, dark) and usable by keyboard.

```text
+ Embeds ------------------------------------------------------------------------+
| [ Docs helper    on  ]  [ Pricing bot  off ]   [ New embed ]                      |
+----------------------------------------------+-----------------------------------+
| Agent        name, agent, profile            |  Live preview of the widget       |
| Look & text  title, placeholder, welcome,    |  (updates as you type)            |
|              up to 3 suggestions, color,     |                                   |
|              position, theme                 |  Snippet   [HTML][iframe][web     |
| What visitors can use   [x] docs_search      |            component][curl] [Copy]|
|              [ ] note_remember (all off=none)|                                   |
| Allowed websites   (chips, no wildcards)     |  Last 7 days                      |
| Limits       per minute, per day, max chars  |  messages | wrong origin | limit  |
| [Save] [Disable] [Rotate key...]             |                                   |
+----------------------------------------------+-----------------------------------+
```

The counters are real numbers read from stored usage, or an honest empty state ("No visits yet"). They are never invented.

## Open points (proposed, tell me if you disagree)

1. Admin routes need no opt-in flag (unlike `agentApi.manageTokens`), only the admin scope. They need a flag on the **public** side: `agentApi.enabled` must be true for embeds to work, and `agentApi.embeds: false` turns the public routes off. *Proposed.*
2. Daily and counter numbers are kept in the database (so a restart does not reset the cap); the per-minute window is in memory. *Proposed, to verify against the database layer in task 3.*
