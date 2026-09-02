---
title: "Example: Building a Slack Bot"
icon: phosphor-duotone:slack-logo
summary: Reach an agent as a real Slack app over Socket Mode - no public webhook needed.
description: Reach an agent as a real Slack app over Socket Mode - no public webhook needed.
tags: [guides, examples, gateways, slack]
---

# Example: Building a Slack Bot

[`examples/slack-gateway-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/slack-gateway-agent) connects an agent to a real Slack app via a push-style `gateways/` entry with `type: "slack"`. Slack uses **Socket Mode** - a persistent websocket the gateway holds open itself - so unlike a webhook-driven platform (WhatsApp Cloud, Teams, Twilio, GitHub), there's no public route to expose or `curl`; the gateway reaches out to Slack, not the other way around. See [Push-style gateways](../conventions/gateways/index.md) for how this category differs from `exposes: "agent"`/`"webui"` HTTP exposure.

## The project

```
slack-gateway-agent/
├── Agent.bx
├── instructions.md
└── gateways/
    └── slackChannel.bx
```

`Agent.bx` is the same shape as every other example:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "slack-gateway-agent",
			description : "An agent reachable as a real Slack app via gateways/, over Socket Mode.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## The gateway

`gateways/slackChannel.bx` declares the platform type and where its credentials come from - **environment variable names**, not the secrets themselves, so nothing sensitive ever lands in the generated app or version control:

```javascript
class {

	function configure() {
		return {
			type          : "slack",
			botTokenEnvVar: "SLACK_BOT_TOKEN",   // xoxb-... - chat.postMessage/chat.update scope
			appTokenEnvVar: "SLACK_APP_TOKEN"    // xapp-... - apps.connections.open scope (Socket Mode)
		};
	}

}
```

At build time, `GatewayGenerator` turns this into a registered `SlackGateway` instance and wires it into the project's single, project-wide `GatewaySession` (see [`GatewaySession` is project-wide and root-agent-only](../known-limitations.md) for the current v1 ceiling on that). At runtime, `SlackGateway.onConnect()` opens the Socket Mode websocket as soon as `GatewaySession` starts.

## Instructions

```markdown
## Slack Gateway Agent

You are a helpful workspace assistant, reachable as a Slack app. Use
Slack-flavored formatting sparingly (bold with `*asterisks*`, not markdown `**`).
```

Nothing here is Slack-API-specific beyond a formatting note - the agent's own logic doesn't know or care which gateway is delivering its replies.

## 1. Create a Slack app

At [api.slack.com/apps](https://api.slack.com/apps), create an app "from scratch":

1. **Socket Mode** - enable it, generate an app-level token with the `connections:write` scope (`xapp-...`) → this becomes `SLACK_APP_TOKEN`.
2. **OAuth & Permissions** - add the `chat:write` bot scope, install the app to your workspace, copy the Bot User OAuth Token (`xoxb-...`) → this becomes `SLACK_BOT_TOKEN`.
3. **Event Subscriptions** - enable it and subscribe to the `message.im` (and/or `message.channels`) bot event, so the app actually receives message events over the socket.

## 2. Configure and run

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_APP_TOKEN="xapp-..."
cd examples/slack-gateway-agent
bxAgents build
bxAgents serve
```

DM the bot, or mention it in a channel it's in. Replies stream back token-by-token via a placeholder message that `SlackGateway` posts immediately and then updates in place with `chat.update` as tokens arrive - the same incremental-reveal effect the [web chat UI](../conventions/web-ui.md) gives you in a browser, produced here entirely through Slack's own message-editing API.

{% hint style="info" %}
There's no `curl`-able entrypoint for this one - message the app for real in Slack to see it work. This is true of every persistent-connection gateway (Telegram's long-poll, Slack/Discord's websockets); only the webhook-driven platforms (WhatsApp Cloud, Teams, Twilio, GitHub) generate a route you can hit locally with a hand-computed signature - each of those examples' own README shows how.
{% endhint %}

## What's proven, and what isn't

`SlackGatewaySpec.bx` exercises the gateway's inbound/outbound logic - chunking, HITL approvals, reconnect handling - entirely against an injectable test seam, never a real Slack connection; a separate smoke test confirms the BoxLang-to-Java WebSocket interop itself works correctly (a real connection attempt to an unreachable address fails with a plain `ConnectException`, not an interop error). No test in this repo has completed a real Socket Mode handshake against Slack's actual servers - see [Known Limitations](../known-limitations.md) for the honest, current state of that gap across every push-style gateway. The steps above are exactly the manual verification that gap calls for.

## Where to go next

- [Slack](../conventions/gateways/slack.md) for the full gateway convention - reconnect model, HITL correlation, chunking limits.
- [Example: A Multi-Agent Team](example-multi-agent-team.md) to combine a gateway-reachable agent with subagent delegation.
- [Known Limitations](../known-limitations.md) for what every push-style gateway does and doesn't prove in automated tests.
