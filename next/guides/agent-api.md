---
title: "Call your agent from code"
icon: phosphor-duotone:plugs
summary: "One HTTP API runs the web page, the terminal and your own programs. Open on your machine, behind tokens when you share it. Call it with curl, the BoxLang client or any OpenAPI tool."
description: "The agent API: open or token access, curl and BoxLang examples, the streaming frames, run control, conversations, managing access tokens over the API, and the OpenAPI document."
tags: [guides, api, tokens, client]
---

# Call your agent from code

Every built agent serves one HTTP API at `/__bxagents`. The web chat page, the terminal chat and the gateways use the same one, so anything they do, your program can do. This guide is the tour; every route, with its request and answer, is in the [OpenAPI document](#the-openapi-document) the server hands out, and the settings are in [agentApi](../conventions/agent-bx.md#the-always-on-agent-route).

The project in [`examples/api-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/api-agent) runs everything below.

## Open or behind a token

Two ways to run, chosen by `agentApi` in `Agent.yaml`.

| | Settings | Who may call |
|---|---|---|
| Open (the default) | nothing | Anyone who can reach the port. Everyone is one user, `local`. Keep it on `127.0.0.1`; `serve` prints a warning when an open API listens on every interface. |
| Token | `tokenEnvVar: MY_SECRET`, and/or `tokens: true` | Callers that send `x-bxagents-token`. The shared secret is an admin; issued tokens are `chat` or `admin`. Everything else gets `401`. |

You can also narrow who may call with `allowedIPs` and cap how often with `rateLimit`; both work open or closed.

```yaml
agentApi:
  tokenEnvVar: TOKEN_FOR_ADMIN   # the NAME of an environment variable
  tokens: true                   # also accept tokens made with `bxAgents token create`
  manageTokens: true             # an admin may make and revoke tokens over the API
```

## With curl

```bash
export T="x-bxagents-token: $TOKEN_FOR_ADMIN"

curl -H "$T" http://127.0.0.1:8080/__bxagents/whoami

curl -H "$T" -H "Content-Type: application/json" \
     -d '{"input":"What can you do?"}' \
     http://127.0.0.1:8080/__bxagents/invoke
```

`invoke` answers `{ "success": true, "output": "...", "threadId": "..." }`. Send `conversationId` to carry on a conversation; the agent remembers it for you.

## With BoxLang

```javascript
import bxModules.bxagents.models.api.AgentApiClient;

client = new AgentApiClient( url = "http://127.0.0.1:8080", token = getSystemSetting( "TOKEN_FOR_ADMIN" ) );

first = client.invoke( "What can you do?" );
println( first.output );

// the text as it is written
client.stream( "Say it shorter.", ( text ) => print( text ), first.threadId );
```

Build the client with named arguments. There is one method for each route: `invoke`, `stream`, `events`, `resume`, `cancel`, `steer`, `sessions`, `history`, `export`, `notes`, `preferences`, `command`, `tokens` and the rest. A bad request comes back as `{ success: false, error, code }`; a refused token, a missing route or a server failure is thrown. Pass `path` when the server moved the API with `agentApi.path`, and `source` to name your program in the conversation list.

## Streams

`stream` and `events` answer server-sent events: each frame is `event: <name>` then `data: <json>`.

| Frame | Meaning |
|---|---|
| `thread` | First frame: the run's id, for `cancel`, `steer` and `resume`. |
| `chunk` | A piece of what the model is saying. |
| `tool` | A tool call started (`running`) or finished (`ok`). `events` only. |
| `suspended` | The run paused for approval. Answer with `resume`. `events` only. |
| `error` | The run failed. |
| `done` | Last frame. |

`stream` carries `thread`, `chunk` and `done`. `events` carries all of them, and the client turns them into events for your callback: `thread`, `delta`, `reasoning`, `tool`, `suspended`, `error`.

## Run control

A run belongs to the caller who started it.

| Call | Does |
|---|---|
| `cancel( threadId )` | Stops it. Only its owner, or an admin. |
| `steer( threadId, input )` | Adds a message to a run that is going. |
| `pending( threadId )` and `resume( threadId, decision )` | Approve, reject or edit what a paused run wants to do. |

## Conversations, notes and settings

Conversations belong to the caller too: `sessions()` lists them, newest first (an admin may pass `all = true` for everyone's), and `createSession`, `renameSession`, `forkSession`, `deleteSession`, `history` and `export` work on one. `notes()` and `preferences()` keep what the agent should remember about the caller. `command( "/context" )` runs any [slash command](slash-commands.md) the caller may use.

## Access tokens over the API

With `manageTokens: true` an admin can make tokens without a shell on the server:

```javascript
made = client.createToken( name = "ci", scope = "chat", expires = "90d" );
println( made.token );        // shown once; the server keeps only a fingerprint
client.revokeToken( "ci" );
```

The same list, create and revoke are in the **Tokens** panel of the [web page](../conventions/web-ui.md) (shown to admins on a server that allows it). A `chat` token gets `403`. Leave `manageTokens` off and the routes do not exist.

## Errors

Every error is `{ "success": false, "error": "text for people", "code": "machine_code" }`.

| Status | Codes |
|---|---|
| 400 | `bad_request`, `bad_profile`, `bad_attachment` |
| 401 | `unauthorized` |
| 403 | `forbidden`, `csrf`, `not_your_run` |
| 404 | `not_found`, `no_notes` |
| 405 | `method_not_allowed` |
| 409 | `busy` (a run is already going in that conversation) |
| 429 | `rate_limited` from a token check; the `rateLimit` guard (cbSecurity's Throttle) answers `{ "error": true, "messages": [...] }` with a `Retry-After` header |

## The OpenAPI document

```bash
curl -H "$T" http://127.0.0.1:8080/__bxagents/openapi > agent-api.json
```

It is an OpenAPI 3 document of the routes this server really has: every route, what it takes and answers, the token header on a closed API, and the stream frames. Feed it to a client generator or an API tool such as Swagger UI or Postman. The routes, the document and the BoxLang client are all made from one list, and a test fails when they disagree.
