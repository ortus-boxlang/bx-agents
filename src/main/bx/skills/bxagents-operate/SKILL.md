---
name: bxagents-operate
description: >
  How to run and look after a bxAgents agent: serving it (HTTP API at /__bxagents, open mode and tokens), logs, stats and usage, backup and restore, the data home, settings files and troubleshooting steps. Use it when an agent is deployed or misbehaving, or when asked about access, logs, token usage or backups.
---
# Operating an agent

## Serve it

```bash
bxAgents build
bxAgents serve [--port=8080] [--host=127.0.0.1]
```

`serve` needs a prior `build` and `boxlang-miniserver` on the PATH. It binds to `127.0.0.1` by default; `--host=0.0.0.0` exposes it on all interfaces on purpose. It always serves the agent API at `/__bxagents` (or `agentApi.path`), whatever `gateways/` holds. `package` then `deploy --name=<entry>` ship it; secrets are never packaged (`.env` and dotfiles are excluded), so provide keys as environment variables where it runs.

## The HTTP API

Routes under `/__bxagents`, among them `POST /invoke`, `POST /stream`, `POST /batch`, `POST /events`, `GET /info`, `GET /tools`, `GET /skills`, `GET /health` (always open), `GET /openapi`. `GET /whoami` says who the server thinks the caller is.

```bash
curl -H "x-bxagents-token: $TOKEN" -H "Content-Type: application/json" \
     -d '{"input":"What can you do?"}' http://127.0.0.1:8080/__bxagents/invoke
```

Send `conversationId` to continue a conversation. Failures are `{ success: false, error, code }` (`401 unauthorized`, `403 forbidden`, `404 not_found`, `429 rate_limited`).

### Open or token

```yaml
agentApi:
  access: token          # open | token (default open; token when tokenEnvVar or tokens is set)
  tokenEnvVar: API_TOKEN # NAME of an env var holding a shared secret (acts as admin)
  tokens: true           # also accept tokens made with bxAgents token create
  manageTokens: false    # true: admins make and revoke tokens over the API
  allowedIPs: [ "10.0.0.0/8" ]
  rateLimit: { requests: 60, perSeconds: 60 }
  path: /__bxagents
  enabled: true
```

- Open: everyone is the one user `local` and the server prints a warning if it listens on all interfaces. Use it on your own machine only.
- Token: send `x-bxagents-token`. A missing or wrong token is `401`. If `tokenEnvVar` is unset at runtime, nobody gets in.
- Issued tokens are for several people or machines:

```bash
bxAgents token create --name=laptop [--scope=chat|admin] [--expires=90d]   # shown once
bxAgents token list
bxAgents token revoke --name=laptop
```

Run `token` where the database is, or set `BXAGENTS_DB` to the file the app uses. Revoking applies at once. Put HTTPS in front of any server a token travels to. Chat against it with `bxAgents chat --connect=<url> --token=<token>`.

Web page accounts: `bxAgents users list`, `users admin --name=ada`, `users member --name=ada`. Passwords are hashed with `bxAgents hash-password --password=...`.

## The data home

Everything the agent keeps is in one folder:

```text
<data home>/
  chat.db         conversations, memory, notes, tokens, vault, usage counts
  files/          what the agent writes
  skills/         skills the agent saved
  routines/       routine reports
  logs/           one file per area
  backups/        written by bxAgents backup
  settings.yml    your chat settings for this agent
```

Where it is, first match wins: `BXAGENTS_HOME`, `data.home` in `Agent.yaml`, the folder of `BXAGENTS_DB`, `data/` in the project if it already has a `chat.db`, then `~/.bxagents/<agent name>`. Two projects with the same agent name share a home. `bxAgents data [--json]` shows the home, where it came from, sizes and volumes.

Settings files for the terminal chat: `~/.bxagents/<agent name>/settings.yml` (this agent), `~/.bxagents/bxAgents.yml` (every agent; `BXAGENTS_USER_CONFIG` names another file).

## Logs

Five areas in `<data home>/logs/`: `agent`, `gateways`, `routines`, `heartbeat`, `api`. Tokens and what people said are never written.

```bash
bxAgents logs                                  # which logs, sizes
bxAgents logs gateways --tail=500 --level=warn --grep=telegram
bxAgents logs gateways --follow                # live
bxAgents logs --ui                             # full-screen viewer
bxAgents logs gateways --follow --connect=https://agent.example.com --token=$ADMIN_TOKEN
```

Admins also have the Logs and Gateways pages in the web app, `GET /logs` and `/logs` in the terminal chat.

## Usage

Off until `usage: true` is in the project's `Agent.yaml` (then rebuild). Counts only, never text, and only calls whose provider reports usage.

```bash
bxAgents stats [--days=30] [--by=model|provider|day|user] [--user=NAME] [--json]
bxAgents stats --enable      # writes usage: true for you
```

## Backup and restore

```bash
bxAgents backup [--to=FILE]
bxAgents restore FILE [--home=DIR] [--force]
```

A backup holds the chat database, `files/`, `skills/` and `routines/`. Volumes and logs are not included. Safe to run while a server uses the database. `restore` keeps what was there as `*.before-restore` (one restore deep) and stops if the database looks open unless `--force`. The vault key is separate: set `BXAGENTS_VAULT_KEY` where the agent runs and keep a copy, because lost keys cannot be recovered (`bxAgents vault key` prints a new one, `vault status` says where it comes from).

## Troubleshooting

1. Run `bxAgents doctor`. It reports the BoxLang version, project validation errors, `*EnvVar` values that are not set, missing provider keys and MCP programs not on the PATH. It exits 1 on a failure.
2. `serve` or `chat` says nothing is built: run `bxAgents build` (only `chat --connect` needs no local build).
3. 401 from the API or `chat --connect`: pass `--token` or set `BXAGENTS_TOKEN`; check `bxAgents token list` for `expired` or `revoked`.
4. A gateway is not answering: open the Gateways page or `GET /gateways` for its state, then `bxAgents logs gateways --level=warn`. After fixing a credential, Reconnect or restart.
5. Build fails: read every listed error (unknown key, duplicate name, both `Agent.yaml` and `Agent.bx`). `bxAgents build --verbose` shows each phase.
6. No tokens recorded in `stats`: `usage: true` is not set or the app was not rebuilt and restarted. The `mock` provider records none.
7. A routine never starts: the app must be served (the heartbeat runs only then) and `routines.enabled` must be true. Check `bxAgents logs routines`.

More: docs/guides/agent-api.md, docs/conventions/agent-bx.md, docs/conventions/data.md, docs/conventions/logs.md, docs/cli-reference.md
