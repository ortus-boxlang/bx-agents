---
title: gateways/
icon: phosphor-duotone:plugs-connected
summary: "One folder, two unrelated jobs: exposing the agent, and connecting chat platforms to it."
description: "One folder, two unrelated jobs: exposing the agent, and connecting chat platforms to it."
tags: [conventions, gateways]
---

# gateways/

`gateways/*.bx`/`.json` files under this one folder cover **two distinct, unrelated things** - which kind an entry is depends entirely on whether its `configure()` struct has an `exposes` key.

!!! warning
    Don't confuse these with each other - an HTTP-exposed agent (`exposes: "agent"`) is a REST API for your agent; a channel-adapter gateway (`type: "http"`) is a webhook endpoint for a chat platform or human-in-the-loop approval flow. They generate completely different routes.

```mermaid
flowchart TD
    F["a file under gateways/"] --> Q{"does configure() return<br/>an 'exposes' key?"}
    Q -->|"yes"| E["EXPOSURE<br/>a route into your agent"]
    Q -->|"no - it has a 'type' key instead"| C["CHANNEL ADAPTER<br/>a connection to a chat platform"]
    E --> E1["exposes: agent<br/>route().toAi()"]
    E --> E2["exposes: mcp<br/>route().toMCP()"]
    E --> E3["exposes: webui<br/>generated index.html + /api"]
    C --> C1["mock / cli / http<br/>pull-driven: something calls US"]
    C --> C2["telegram, slack, discord, email, whatsapp-cloud,<br/>teams, twilio, github, signal<br/>push-style: holds its own connection"]
    C2 --> S["one GatewaySession<br/>bound to the root agent"]

    style E fill:#d4edda,stroke:#155724
    style C fill:#cce5ff,stroke:#004085
```

!!! tip
    `bxAgents add gateway <type>` writes this entry for you and the `.env` stubs it needs, then lists the setup steps that happen outside the project. See [`add`](../../cli-reference.md#add-gateway).

## 1. HTTP/MCP/web-UI exposure (`exposes: "agent" | "mcp" | "webui"`)

Exposes the agent, or a local MCP server, over HTTP using ColdBox 8.1's native AI Routing DSL - or a pre-built browser chat UI, documented separately in [The web chat UI](../web-ui.md).

**Expose the agent:**

```javascript
// gateways/expose.bx
class {

	function configure() {
		return {
			exposes : "agent",
			path    : "/api/chat"
		};
	}

}
```

Generates, in `config/Router.bx`:

```javascript
route( "/api/chat" ).toAi( "GeneratedAgent" )
```

which auto-registers **four** sub-routes: `POST /api/chat/invoke`, `POST /api/chat/stream` (SSE), `POST /api/chat/batch`, `GET /api/chat/info`. The bare `/api/chat` path itself is not routable.

**Expose a local MCP server** (see [mcp/](../mcp.md)):

```javascript
class {
	function configure() {
		return {
			exposes : "mcp",
			path    : "/mcp/tools",
			target  : "local-server"   // must match an mcp/*.bx entry's file name
		};
	}
}
```

Generates `route( "/mcp/tools" ).toMCP( "local-server" )`.

**Expose the v1 web chat UI:**

```javascript
// gateways/chat.bx
class {
	function configure() {
		return {
			exposes     : "webui",
			path        : "/chat",
			apiKeyEnvVar: "CHAT_UI_API_KEY"   // optional - see below
		};
	}
}
```

Generates a real static `<path>/index.html` file (served directly - no route needed for it) plus its own dedicated API under a fixed `<path>/api` prefix, so it never collides with the shell's own files. That API is a generated `handlers/ChatUi.bx` rather than `toAi()`, and the entry also brings a generated SQLite store with it.

The web UI is a subsystem rather than a single exposure switch - the route list, the store, conversations and preferences, branding and theming, and why it does not use `toAi()` are all on its own page: **[The web chat UI](../web-ui.md)**.

**Validation:** `exposes` must be `agent`, `mcp`, or `webui`; `path` is required and must be unique across every exposure entry; an `mcp` exposure's `target` is required and must match a real `mcp/*` entry's file name; `webui`'s `apiKeyEnvVar` is entirely optional, with no required-field check (see below). A `webui` entry may list `profiles` for the page's model picker (see [Choosing the model](../web-ui.md#choosing-the-model)); each must be declared in `Agent.yaml`, and no other kind of entry may list them.

## 2. Channel-adapter gateways (`type: "mock" | "cli" | "http"`)

Registers a bx-ai `IGateway` (a channel adapter for external delivery / human-in-the-loop approval) by name - distinct from exposing the agent's own REST API.

```javascript
// gateways/slack.bx
class {
	function configure() {
		return {
			type         : "http",
			secretEnvVar : "SLACK_WEBHOOK_SECRET"
		};
	}
}
```

`secretEnvVar` names an environment variable holding the signing secret - **never the secret value itself**. Generates, in `Application.bx`'s `onApplicationStart()`:

```javascript
aiGatewayRegistry().register( aiGateway( "http", { secret : getSystemSetting( "SLACK_WEBHOOK_SECRET", "" ) } ) )
```

The secret is resolved live at server startup, matching this project's "secrets stay external" rule everywhere else (see [Deployment & Secrets](../../deployment-and-secrets.md)) - it's never embedded as a literal in generated source, so it's never present in a packaged `.bxa` either. If the env var is unset, bx-ai's own `HttpGateway` treats an empty secret as "no signing configured" and rejects requests accordingly, rather than crashing at startup.

**Validation:** `type` must be `mock`, `cli`, or `http`; a `type: "http"` entry requires a `secretEnvVar`; the entry's own file/base name must be unique across every channel-adapter entry. `mock` is test-only; `cli` is bx-ai's own built-in human-in-the-loop **approval** channel (a blocking stdin/stdout A/R/Q prompt) - it's what `HumanInTheLoopMiddleware` attaches by default when no gateway is specified, and is unrelated to BxAgents' own `chat` verb (which never touches the gateway registry at all).

**Any channel-adapter entry mounts the bx-ai Gateway surface**: one line in `config/Router.bx`, using ColdBox's own `toAiGateway()` terminator.

```javascript
route( "/gateways" ).toAiGateway()
```

That single terminator mounts the whole bx-ai Gateway surface:

```
POST /gateways/:gateway/events                  inbound platform event
GET  /gateways/:gateway/events                  the platform's URL verification handshake
GET  /gateways/interactions/:requestID          poll a pending human interaction
POST /gateways/interactions/:requestID/decisions submit a human's decision
GET  /gateways/info                             what this mount serves
```

This mount is **not** `http`-specific. `http` is one gateway type among many, and the surface is shared: the `/interactions` routes are the human-in-the-loop approval channel for *every* gateway, resolved through bx-ai's own gateway registry rather than per-transport. So a project whose only gateway is Telegram, Slack or Discord gets the same `/gateways` mount - it needs those routes exactly as much, since a paused agent has to be answerable somehow.

!!! warning
    The routes only reach a running server, so a project relying on human-in-the-loop approval needs [`serve`](../../cli-reference.md#serve) (or a real deployment), not plain `chat`.

## 3. Push-style gateways (`type: "telegram"` / `"slack"` / `"discord"` / `"email"` / `"whatsapp-cloud"` / `"teams"` / `"twilio"` / `"github"` / `"signal"`, and friends)

A different kind of channel adapter from `mock`/`cli`/`http` above: instead of being driven by an inbound HTTP request, a push-style gateway holds its own connection to the platform and pushes inbound messages to your agent as they arrive - the closer-to-"real chat bot" experience. Four transport shapes exist today:

- **Long-poll** (Telegram, Email): a scheduled task periodically asks the platform "anything new?" (Telegram's `getUpdates`, Email's IMAP poll).
- **Persistent websocket** (Slack via Socket Mode, Discord via its Gateway API): the gateway holds a live, long-running connection the platform pushes events down in real time.
- **Webhook, pull-driven** (WhatsApp Business Cloud API, Microsoft Teams, Twilio SMS, GitHub): the platform calls **us** over a public HTTP endpoint instead of this gateway holding its own outbound connection - no scheduler task or socket to manage. See their own subsections below.
- **Server-Sent Events (SSE)** (Signal, against a locally-run `signal-cli` daemon): a long-lived, one-way streaming HTTP connection the gateway holds open, reading events as they're pushed down the same response body. See its own subsection below.


## The nine push-style platforms

Each platform gets its own page: its `gateways/*.bx` config shape, what's required, and
(where one exists) the protocol-level detail on how BxAgents talks to it.

::: cards
::: card title="Telegram" icon="phosphor-duotone:plugs-connected" href="telegram.md"
Long-poll. `botTokenEnvVar` only.
:::
::: card title="Slack" icon="phosphor-duotone:plugs-connected" href="slack.md"
Persistent websocket, Socket Mode.
:::
::: card title="Discord" icon="phosphor-duotone:plugs-connected" href="discord.md"
Persistent websocket, Gateway API, mandatory heartbeats.
:::
::: card title="Email" icon="phosphor-duotone:plugs-connected" href="email.md"
Long-poll IMAP + cbmailservices/bx-mail outbound.
:::
::: card title="WhatsApp Business Cloud" icon="phosphor-duotone:plugs-connected" href="whatsapp-cloud.md"
Webhook-driven, Meta Graph API.
:::
::: card title="Microsoft Teams" icon="phosphor-duotone:plugs-connected" href="teams.md"
Webhook-driven, Bot Framework Activity protocol.
:::
::: card title="Twilio SMS" icon="phosphor-duotone:plugs-connected" href="twilio.md"
Webhook-driven, form-urlencoded, dual-path TwiML response.
:::
::: card title="GitHub" icon="phosphor-duotone:plugs-connected" href="github.md"
Webhook-driven, `@mention`-gated issue/PR comment threads.
:::
::: card title="Signal" icon="phosphor-duotone:plugs-connected" href="signal.md"
Server-Sent Events, against an external `signal-cli` daemon.
:::
:::

Same "secrets stay external" rule as `http`'s `secretEnvVar`: every `*EnvVar` key names an environment variable, resolved live via `getSystemSetting()` at startup, never embedded as a literal - `email`'s `imapHost`/`fromAddress` aren't cryptographic secrets, but the same env-var-driven convention is used for every one of its config values anyway, since they all vary per deployment. Unlike the core types, a push-style gateway's class lives inside BxAgents itself (`models/gateways/*.bx`, not bx-ai), so its registration renders as a bare class path rather than a short name:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TelegramGateway", { "botToken" : getSystemSetting( "TELEGRAM_BOT_TOKEN", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SlackGateway", { "appToken" : getSystemSetting( "SLACK_APP_TOKEN", "" ), "botToken" : getSystemSetting( "SLACK_BOT_TOKEN", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.DiscordGateway", { "botToken" : getSystemSetting( "DISCORD_BOT_TOKEN", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.EmailGateway", { "imapHost" : getSystemSetting( "IMAP_HOST", "" ), "imapUsername" : getSystemSetting( "IMAP_USERNAME", "" ), "imapPassword" : getSystemSetting( "IMAP_PASSWORD", "" ), "fromAddress" : getSystemSetting( "EMAIL_FROM_ADDRESS", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.whatsapp.WhatsAppCloudGateway", { "accessToken" : getSystemSetting( "WHATSAPP_ACCESS_TOKEN", "" ), "phoneNumberId" : getSystemSetting( "WHATSAPP_PHONE_NUMBER_ID", "" ), "appSecret" : getSystemSetting( "WHATSAPP_APP_SECRET", "" ), "verifyToken" : getSystemSetting( "WHATSAPP_VERIFY_TOKEN", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TeamsGateway", { "appId" : getSystemSetting( "TEAMS_APP_ID", "" ), "appPassword" : getSystemSetting( "TEAMS_APP_PASSWORD", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TwilioGateway", { "accountSid" : getSystemSetting( "TWILIO_ACCOUNT_SID", "" ), "authToken" : getSystemSetting( "TWILIO_AUTH_TOKEN", "" ), "from" : getSystemSetting( "TWILIO_FROM_NUMBER", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.GitHubGateway", { "token" : getSystemSetting( "GITHUB_TOKEN", "" ), "webhookSecret" : getSystemSetting( "GITHUB_WEBHOOK_SECRET", "" ), "botName" : getSystemSetting( "GITHUB_BOT_NAME", "" ) } ) )
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SignalGateway", { "account" : getSystemSetting( "MY_SIGNAL_ACCOUNT", "" ) } ) )
```

**Validation:** `type: "telegram"` requires `botTokenEnvVar`; `type: "slack"` requires both `botTokenEnvVar` and `appTokenEnvVar`; `type: "discord"` requires `botTokenEnvVar`; `type: "email"` requires `imapHostEnvVar`, `imapUsernameEnvVar`, `imapPasswordEnvVar`, and `fromAddressEnvVar`; `type: "whatsapp-cloud"` requires `accessTokenEnvVar`, `phoneNumberIdEnvVar`, `appSecretEnvVar`, and `verifyTokenEnvVar`; `type: "teams"` requires `appIdEnvVar` and `appPasswordEnvVar`; `type: "twilio"` requires `accountSidEnvVar`, `authTokenEnvVar`, and `fromEnvVar`; `type: "github"` requires `tokenEnvVar`, `webhookSecretEnvVar`, and `botNameEnvVar`; `type: "signal"` requires `accountEnvVar` - all checked the same way `http`'s `secretEnvVar` is.

!!! info
    Slack v1 is **Socket Mode only** - no public webhook endpoint is needed or generated for it (unlike `http`, which gets real routes - see §2 above). The Events-API/HTTP-webhook alternative Slack also supports isn't built here. Discord v1 is likewise the real **Gateway API** (a persistent websocket) rather than Discord's alternative HTTP Interactions Endpoint URL webhook mode - no Ed25519 signature verification is needed here as a result, since interactions arrive over the same authenticated connection rather than a public HTTP endpoint (confirmed against Discord's own docs).

### GatewaySession - wiring the agent to every push-style gateway

Any project with at least one push-style gateway entry also gets a generated start-up statement in `Application.bx`'s `onApplicationStart()`. It builds a single bx-ai `GatewaySession` (our `CommandGatewaySession`, which is one with [commands](#commands-in-a-gateway) in front of the agent) bundling every push-style gateway in the project, bound to the project's root agent, and starts it:

```javascript
// Application.bx, onApplicationStart() (GENERATED)
var wirebox        = application.cbController.getWireBox()
var agent          = wirebox.getInstance( "GeneratedAgent" )
var gatewaySession = new "models.gateways.CommandGatewaySession@bxagents"(
	agent        : agent,
	gateways     : [ aiGatewayRegistry().get( "telegram" ) ],
	policy       : "queue",
	maxQueueDepth: 50,
	commands     : {}
)
BoxAnnounce( "onGatewaySessionCreate", { session: gatewaySession } )
gatewaySession.start()
application.bxaiGatewaySession = gatewaySession
```

!!! info
    The generated variable is deliberately named `gatewaySession`, not `session` - `session` is a reserved BoxLang/ColdBox scope name (like `request`/`server`/`url`/`form`/`cgi`/`thread`), and a local variable reusing one of those names can collide with the live scope instead of behaving as an ordinary local.

!!! warning
    The `aiGatewayRegistry().get(...)` key is always the gateway TYPE string ("telegram", "slack", "discord", "email", ...) - confirmed against bx-ai's real `GatewayRegistry.register()` source, which always keys by the gateway class's own fixed `getName()`, never anything caller-supplied. A real consequence: **two `gateways/*` entries of the same push-style type collide on the same registry slot project-wide** - the second registration silently overwrites the first. There's no per-entry alias today; use a distinct type per additional platform account, or wait for multi-instance support.

Control `GatewaySession`'s policy via an optional `gatewaySession` block on the root project's `Agent.yaml`:

```yaml
# Agent.yaml
gatewaySession:       # both optional - these are the defaults
  policy: queue
  maxQueueDepth: 50
```

`policy` must be one of `reject`/`queue`/`steer`/`interrupt` (bx-ai's own `GatewaySession` policy vocabulary, illustrated below) - checked at `build` time so a typo fails loudly instead of surfacing as a runtime error the first time the app boots.

!!! warning
    v1 limitation: exactly one `GatewaySession`, always bound to the project's root agent - matches the existing precedent that `exposes: "agent"` HTTP exposure is also always root-agent-only. A project with subagents cannot yet route different gateways to different subagents.

### Commands in a gateway

A message that is one of the session's slash commands is answered by BxAgents itself and never reaches the model, through the same gateway it came in on. Anything else, including a slash word that is not a command here, goes to the agent as before. A choice (a list to pick from) comes back as a numbered list with the command to type for each.

By default a safe set is on: `/help`, `/tools`, `/model`, `/info`, `/remember` and `/notes`. They need no conversation of their own and change nothing shared. Narrow it, widen it or switch it off in the same `gatewaySession` block:

```yaml
# Agent.yaml
gatewaySession:
  commands:
    enabled: true            # false switches commands off
    prefix: "/"              # one character
    prefixes: { slack: "!" } # a different one-character prefix for one gateway, by name
    conversation: false      # true also turns on /new, /clear, /compact, /sessions and /resume
    allow: [ help, info, tools, notes, remember, model ]   # the default; any command that runs on a gateway
    admins: [ "123456789" ]  # gateway user ids that may run commands marked for admins
```

Each platform shows the same commands its own way:

| Platform | How the commands appear |
|---|---|
| Telegram | The bot's `/` menu lists them (`setMyCommands`, sent when the first message arrives). `/info@yourbot` in a group is read as `/info` |
| Discord | Registered as application commands when the bot starts, so typing `/` in a server lists them; each takes one optional `args` text. Needs the application id: Discord sends it when the bot connects, or set `applicationId` on the gateway entry. The answer replaces the "thinking" placeholder |
| Slack | Slack slash commands are created in the Slack app, not through the API. Define one umbrella command (default `/agent`, option `slashCommand`): `/agent model fast` runs `/model fast` and `/agent` alone runs `/help`. Or define one Slack command per chat command (`/info`). The answer is visible only to the person who typed it. Typed `/word` messages never reach a Slack bot, so use `prefixes` below |
| WhatsApp | A "pick one" answer arrives as up to three buttons, or a list for four to ten; a tap runs that command |
| Twilio (SMS), Signal and others | A "pick one" answer is a numbered list; reply with just the number. Any other message forgets the list |

The prefix can differ per gateway. A Slack workspace has its own `/` commands, so give Slack another character:

```yaml
gatewaySession:
  commands:
    prefix: "/"
    prefixes: { slack: "!" }     # by gateway name; one character each
```

`build` checks the block: an unknown key, a prefix that is not one character, or an `allow` entry that is not a command that runs on a gateway fails before the app starts. In Telegram a group message such as `/info@yourbot` is read as `/info`.

#### Pictures and files

A picture or file sent to the bot goes to the agent with the message: pictures as image parts, text files (`.txt`, `.md`, `.json`, `.csv`, code and the like, cut at 100,000 characters) inside the message. Other types are named back to the person as not read. At most 4 pictures of 5 MB each go with one message, and a picture sent to a profile marked `vision: false` is refused with that reason, the same checks as the terminal and the web page.

| Platform | What is read | Setup |
|---|---|---|
| Telegram | A photo (the largest size within 5 MB) and a document, with the caption as the text | None |
| Discord | Attachments | None |
| Slack | Files shared in a message | The Slack app needs the `files:read` scope |
| WhatsApp | A picture or document, with its caption | None; the media link is fetched with the access token |
| Twilio (MMS) | Media sent with the message, even with no text | Media links are public unless the account turned on basic auth for media; with that on, they cannot be read |
| Teams, Signal, Email, GitHub | Not read | |

Links must be https. A file that cannot be downloaded is named back to the person and the rest of the message goes on. Switch it off with `gatewaySession.attachments: false`.

#### Conversation commands

`/new`, `/clear`, `/compact`, `/sessions` and `/resume` are off by default, because a chat platform gives every chat one shared conversation: in a group, anyone's `/clear` clears it for everyone. Turn them on with `conversation: true` (or list them in `allow`) when the chats are private or you trust the group.

- `/new` moves the chat to a fresh conversation; the old one stays on the list.
- `/sessions` lists the conversations the person has had in this app, newest first, and `/resume 2` (or an id) moves the chat back to one. The list is kept in memory, so it lasts until the app restarts; the conversations themselves last as long as the agent's memory does, so an id still works afterwards.
- `/clear` and `/compact` act on the conversation the chat is in now.
- In a Slack thread, each thread has its own conversation, and `/new` moves only that thread.

What each policy actually does with a message that arrives while a turn is still running:

```mermaid
flowchart TD
    M["a message arrives on thread T"] --> B{"is a run already<br/>in flight on T?"}
    B -->|"no"| D["dispatch a new turn.<br/>The reply streams back through<br/>the gateway the message came from."]
    B -->|"yes"| P{"policy"}
    P -->|"reject"| R["Immediate 'busy' reply.<br/>Nothing is queued - the sender must resend."]
    P -->|"queue<br/>(the default)"| Q["Enqueue, up to maxQueueDepth.<br/>Runs as its own turn once<br/>the current one finishes."]
    P -->|"steer"| ST["agent.steerRun( T, text )<br/>Spliced into the SAME run at its next<br/>checkpoint - never a second turn."]
    P -->|"interrupt"| I["agent.cancelRun( T ), AND enqueue.<br/>The current turn winds down at its next<br/>checkpoint, then this message runs."]
    Q --> OVER{"queue already at<br/>maxQueueDepth?"}
    I --> OVER
    OVER -->|"yes"| R

    style D fill:#d4edda,stroke:#155724
    style R fill:#f8d7da,stroke:#721c24
```

!!! warning
    "Steer" here means Hermes Agent's non-destructive splice - the running turn keeps going and the new text is folded into it. It does **not** mean what Eve's `turnPolicy: "steer"` means (cancel the active turn and start a replacement); that behaviour is this vocabulary's `interrupt`.

!!! info
    Neither `cancelRun()` nor `steerRun()` is instant. Both are signalled and take effect at the run's **next checkpoint** (before the next LLM call or tool call), so `interrupt` is "ask the current turn to wind down soon", not "synchronously replace it".

### How a push-style gateway stays connected: the shared ColdBox Scheduler

Rather than a new background-loop primitive, push-style gateways reach the app's own live ColdBox scheduler singleton (`appScheduler@coldbox` - the same one a hand-written `schedules/Scheduler.bx`, if the project has one, runs under) and register their own named task(s) into it dynamically - a recurring long-poll task for Telegram, for example. **One shared scheduler, every push-style gateway registering its own tasks into it** - never one scheduler per gateway, and never in conflict with a project's own cron jobs.

### Logging

Every push-style gateway writes to its own `gateway-<type>` log file (e.g. `gateway-telegram`) via BoxLang's `writeLog()`, rather than one shared/default app log - so an operator can tail exactly the platform they care about without noise from everything else the app logs.
