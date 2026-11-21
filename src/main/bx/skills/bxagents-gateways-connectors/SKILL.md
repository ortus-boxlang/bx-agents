---
name: bxagents-gateways-connectors
description: >
  How to connect an agent to chat apps (gateways such as Slack or Telegram: where they are defined, settings, credentials, states), to services through connectors (the built-in catalog, connecting, per-person sign in, tools on and off), and to MCP servers. Use it when asked to put the agent in Slack or another app, or to let it use GitHub, Notion, mail or any MCP server.
---
# Gateways, connectors and MCP

## Gateways

A gateway is a file in `gateways/`. Which kind it is depends on its `configure()` struct: an `exposes` key means a route into the agent, a `type` key means a chat platform.

```javascript
// gateways/slack.bx
class {
	function configure() {
		return {
			type          : "slack",
			botTokenEnvVar: "SLACK_BOT_TOKEN",
			appTokenEnvVar: "SLACK_APP_TOKEN"
		};
	}
}
```

Scaffold with `bxAgents add gateway slack` (also `telegram`, `discord`, `whatsapp-cloud`, `teams`, `twilio`, `github`, `email`, `signal`, plus `web` and `api`). It writes the file and empty `.env` stubs, then lists the setup steps outside the project (creating the bot, a public address). Flags: `--name`, `--env=botTokenEnvVar=ACME_BOT`, `--policy=queue|reject|steer|interrupt`, `--path`, `--auth=open|key|users` (web), `--profiles`.

### Credentials

Every `*EnvVar` key names an environment variable, never the secret. They are read when the app starts. Required keys per type:

| Type | Required keys |
|---|---|
| `telegram`, `discord` | `botTokenEnvVar` |
| `slack` | `botTokenEnvVar`, `appTokenEnvVar` (Socket Mode, no public URL) |
| `email` | `imapHostEnvVar`, `imapUsernameEnvVar`, `imapPasswordEnvVar`, `fromAddressEnvVar` |
| `whatsapp-cloud` | `accessTokenEnvVar`, `phoneNumberIdEnvVar`, `appSecretEnvVar`, `verifyTokenEnvVar` |
| `teams` | `appIdEnvVar`, `appPasswordEnvVar` |
| `twilio` | `accountSidEnvVar`, `authTokenEnvVar`, `fromEnvVar` |
| `github` | `tokenEnvVar`, `webhookSecretEnvVar`, `botNameEnvVar` |
| `signal` | `accountEnvVar` |

`bxAgents doctor` warns about any that are not set. Two entries of the same type collide, so use one per platform.

### Exposures

- `exposes: "agent"` with `path`: the four agent API routes (`invoke`, `stream`, `batch`, `info`) at your path.
- `exposes: "mcp"` with `path` and `target`: serves an `mcp/*.bx` server.
- `exposes: "webui"` with `path` (not `/`): the web app, optional `apiKeyEnvVar`.

### Behavior

One session serves all chat gateways and is bound to the root agent. Tune it in `Agent.yaml`:

```yaml
gatewaySession:
  policy: queue            # queue (default), reject, steer, interrupt
  maxQueueDepth: 50
  attachments: true
  commands:
    prefix: "/"
    prefixes: { slack: "!" }
    conversation: false    # true also enables /new /clear /compact /sessions /resume
    allow: [ help, info, tools, notes, remember, model, ping, connect ]
```

Slash commands in a gateway are answered by bxAgents, not the model. Each person has their own conversation and notes, keyed by platform user and chat.

### States

The admin Gateways page and `GET /gateways` (admin) show each gateway as `connected`, `stopped`, `failing` (stopped with an error logged) or `not registered`, which credentials are set (names only), last activity and last error. Reconnect there, or `POST /gateways/reconnect`, restarts one in place. For details read `bxAgents logs gateways --level=warn`.

## Connectors

Seven ready-made connectors ship with bxAgents: GitHub, Stripe, Notion, Atlassian, Cloudflare, Supabase and Git. Every agent offers them by default, but nothing is contacted until a person connects their own account.

- Personal: a token or sign in belongs to one person and is sealed in the vault. The model never sees it.
- Connect with a token or a sign in (see the catalog page for which); Git runs locally and an admin connects it.
- States: available, connected, needs attention (service refused the token), needs a program (for example `uvx`).

Limit them in `Agent.yaml`:

```yaml
connectors:
  only: [ github, notion ]     # or exclude: [ stripe ]
  override:
    github: { timeout: 30000, tools: [ search_repositories ] }
  toolWarning: 100
```

`connectors: none` turns the catalog off.

| Where | How |
|---|---|
| Terminal chat | `/connect`, `/connect NAME`, `/connect NAME off`, `/connect NAME tools` |
| CLI | `bxAgents connect`, `bxAgents connect github --token-env=GITHUB_TOKEN --confirm` (or `--stdin`), `bxAgents connect github off` |
| Web page | Connectors page |
| Chat platforms | `/connect` lists them; a token is never typed in a chat, so connecting points to the web page (set `BXAGENTS_PUBLIC_URL`) |

Tools on and off, per person:

```bash
bxAgents connect github tools off delete_file    # also: tools on NAME, tools off all, tools readonly
bxAgents connect github options repository=/path/to/repo
```

A tool that is off, over the admin `tools` ceiling, or not connected is refused when called. Routines use the connectors of the person who made them; `schedules/*.bx` get none. Inspect the catalog with `bxAgents connectors`, `bxAgents connectors show ID`.

## MCP servers

Use a remote server by listing it in `Agent.yaml`:

```yaml
mcpServers:
  - name: github
    url: https://api.githubcopilot.com/mcp/
    token: ${env.GITHUB_PERSONAL_ACCESS_TOKEN}
  - name: git
    command: [ uvx, mcp-server-git ]
    toolFilter: [ git_status, git_diff ]
```

- A `token` or `password` must be an `${env.NAME}` placeholder, replaced when the app starts. A literal is a build error.
- Other keys: `headers`, `timeout`, `allowedHosts`, `prefix`, `toolFilter`. `command` (a program, never run through a shell) cannot be combined with `url`.
- Add one with `bxAgents add mcp client github` or `--url=... --auth=bearer --env=NAME`.
- Per-person sign in: add `oauth: true` (or `oauth: { scopes: [ ... ] }`) to an entry that has a `name`. People then connect with `/connect NAME` or `bxAgents connect NAME`, and the agent acts with their tokens. `oauth` cannot be combined with `token`, `user` or `password`.
- Host your own: `bxAgents add mcp server tools` writes `mcp/<name>.bx` and a gateway that serves it. That route has no authentication of its own.

More: docs/conventions/gateways/index.md, docs/conventions/connectors.md, docs/conventions/connector-catalog.md, docs/conventions/mcp.md, docs/conventions/connect.md
