---
title: Embeds
icon: phosphor-duotone:chat-teardrop-dots
summary: Put your agent on another website as a chat widget for anonymous visitors.
description: An embed is a stored definition (look, tools, allowed websites, limits) that lets visitors of another site chat with the agent. This page is the spec for the first increment, the anonymous docs agent.
tags: [conventions, embeds, web-ui, security]
---

# Embeds

!!! info "Status"
    This page is the **spec** for increment 1. Built so far: the record and its store, the admin routes, the `bxAgents embed`
    verb, and the public routes (config, session, events, cancel, history, frame) with the origin check, the signed session and
    the limits. The embed filter and the widget (with the hosted page) are built too. The Embeds admin page is still to come. Anything marked *proposed* is open to change.

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

Like every other route of the agent API, the id goes in the query or the body, not in the path.

```text
GET  <api>/embeds               list, with the names of the tools an embed may list
POST <api>/embeds               create; the answer carries the new id
GET  <api>/embeds/get?id=       one embed, without the key
POST <api>/embeds/update        body { id, ...fields }; fields not sent keep their value; { enabled: false } turns it off
POST <api>/embeds/rotate        body { id }; new signing key; every open session stops working
GET  <api>/embeds/snippets?id=&base=   the HTML script tag, iframe, web component and curl, with the id filled in
GET  <api>/embeds/usage?id=     counters for the last 7 days: messages, refused for a wrong origin, refused for a limit
```

They are in `ApiContract`, so the OpenAPI document and the route specs have them. Embed management needs the app's shared database;
without one the routes answer `not_found`. There is no opt-in flag like `manageTokens`: admin scope is the only gate.

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

Hiding alone is not a guard.

**How it knows.** `TurnRunner` sets `options.usageMetadata.embedId` on a turn whose caller has the `embed` scope, after it has dropped everything a client sent (a client cannot send it). `usageMetadata` is a property of every bx-ai request, so the filter reads `chatRequest.getUsageMetadata().embedId` in both hooks. A request with none is not an embed turn: the filter returns at once and reads no database. It reads the embed's list for each call, so an admin's change takes effect at once, and it fails closed: an embed that is off, expired, gone or unreadable allows no tool. A tool is compared without its `@module` suffix (`now@bxai` on the list is `now` to the model). It is attached to every agent the build makes, the main one and each sub-agent.

**Measured on a served app** (scripted model, an agent with `docs_search` and a `delete_all` that writes a file): asked which tools it had, the model said `docs_search` to a visitor of an embed that lists only that, and `delete_all, docs_search, loadSkill, skill_save` to the admin on the same agent. Asked to wipe, the visitor's turn left no file; the admin's turn created it.

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

## Measured on a served app

Run against a built app with a scripted model (a throwaway demo, not a real model):

- A visitor's message streamed as 35 content deltas in 44 frames (`thread`, `chunk`, two `tool`, `done`), with `Access-Control-Allow-Origin` set to the visitor's own website and no `Access-Control-Allow-Credentials`. The CORS headers set before `SSE()` survive.
- With the API behind a token, a visitor's session token on `GET /embeds`, `/notes`, `/vault`, `/sessions`, `/logs`, `/info`, `/tools` and `POST /invoke` gives `401`, also when sent as `x-bxagents-token`. The public routes work with no `x-bxagents-token` at all.
- A forged signature, no token, a token from another listed website and a garbage token give `401`; an unlisted website gives `403`; 2001 characters give `400`; the sixth message in a minute (limit 5) gives `429`.
- Every response of the app carries `X-Frame-Options: SAMEORIGIN` from the app's own security headers. The frame route also sends `frame-ancestors`; whether a browser lets another website frame it is tested in a real browser, not assumed.
- **An open API (no `agentApi` token) lets anyone call the admin routes, as it always has.** Before an embed goes on the public internet, give the API a token. Visitors are not affected by it: they do not use it.

`chunk` frames carry the model's own tool-call arguments (`delta.tool_calls`), as they do for every client of the stream; the `tool` frames a visitor gets carry the tool's name, its status and the time it took, not its arguments.

## The widget

`widget.js` is one file of plain JavaScript with no dependencies: a `<bx-agent>` element with a shadow root, a launcher and a panel (or, with `mode="page"`, the chat filling the page). Attributes: `embed`, `base` (taken from the script's own address when left out), `mode`, `storage` (`local` or `none`), `storage-key` and `credentials`. They are read **once, when the element connects**, because the saved transcript is restored then; a page script that sets them later changes nothing. `headers` (an async function) and `onUnauthorized` are properties read at each request. It sends `bx-done` and `bx-error` events.

Accessibility: the launcher is a real button with `aria-expanded`; the panel is a labelled dialog; opening moves focus to the input and Esc closes and gives it back to the launcher; the conversation is a `role="log"` that is not read piece by piece while streaming, and the finished answer is announced once from a status region; colours come from tokens with the text colour chosen for contrast on the embed's colour; `prefers-reduced-motion` and `prefers-color-scheme` are respected; answers are shown as text, never as HTML.

Measured in Chromium against real loopback servers on other ports (an allowed website on 9100, another on 9200): the allowed website got the launcher, focus moved to the input and back on Esc, the answer arrived as 35 DOM updates (not one block), and the transcript came back after a reload; the other website got no launcher, because its `config` request was refused with no CORS header; the hosted frame drew on the allowed website and Chromium blocked it on the other (`frame-ancestors`), although the app also sends `X-Frame-Options: SAMEORIGIN`.

The hosted page runs on the agent's own origin, so a request from it is from that origin: a browser sends no `Origin` header on a same-origin `GET`, so the agent reads `Sec-Fetch-Site: same-origin` (which a page script cannot set) as "from my own origin". The agent's own origin is accepted whether or not the embed lists it. A visitor who opens the frame address directly is a visitor like any other.

Known limit: a visitor's conversation belongs to its session (one hour, kept in `localStorage` so a reload keeps it). After it expires the widget still shows the saved transcript, but the agent starts without the earlier messages.

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

1. `agentApi.embeds: false` to turn the public routes off. *Proposed, optional, not built.*
2. The daily cap and the counters are kept in the database (`embed_usage`, one row per embed per day), so a restart does not reset the cap. The per-minute window is in memory. *Built: the table and the counters. The window comes with the public routes.*
3. The signing key is stored as it is in the `embeds` table, not sealed like a vault secret: a stolen database file would let someone mint sessions, which an anonymous visitor can already get. It is never returned by any route.
4. "Visitors who hit the limit" is shown as **requests refused for a limit**, a count of refusals, because counting distinct visitors would need to store visitor ids.
