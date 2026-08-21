# Examples

Real, buildable BX Agents projects, each demonstrating one feature area. Every example uses the `mock` provider (`model: "mock/mock-model"`) so it builds and runs with **no API key and no network access** - swap in a real `provider/model` slug (see [Agent.bx](../docs/conventions/agent-bx.md#the-model-slug)) to use it for real. Every push-style gateway example additionally needs real, platform-specific credentials (a bot token, a webhook secret, ...) to actually connect - each one's own README walks through getting them.

| Example | Demonstrates |
|---|---|
| [`minimal-agent/`](minimal-agent) | The smallest complete agent: one tool, one skill. Start here. |
| [`simple-agent/`](simple-agent) | A baseline agent combining a tool and an HTTP exposure in one project. |
| [`class-based-agent/`](class-based-agent) | The same agent written the other way: `Agent.bx` extends bx-ai's `AiAgent`, so it IS the agent. No `configure()`, no `instructions.md`. |
| [`http-gateway-agent/`](http-gateway-agent) | Exposing an agent over HTTP via `gateways/` + `toAi()`. |
| [`scheduled-agent/`](scheduled-agent) | Waking an agent on a cron schedule via `schedules/`. |
| [`mcp-agent/`](mcp-agent) | Hosting a local MCP server that re-exposes a tool via `mcp/`. |
| [`multi-agent-team/`](multi-agent-team) | A root agent delegating to two `subagents/`. |
| [`webui-agent/`](webui-agent) | The v1 web chat UI, via a `gateways/` entry with `exposes: "webui"`. |
| [`advanced-agent/`](advanced-agent) | A composite example: named `models/`, `subagents/`, `tools/`, `skills/`, a hosted `mcp/` server, dual `gateways/` exposure, a `schedules/` task, and an `interceptors/` entry, all in one project. |

### Push-style chat-platform gateways

Each of these connects the agent to a real chat platform via a `gateways/` entry with its own `type`, per [Push-style gateways](../docs/conventions/gateways.md#3-push-style-gateways-type-telegram--slack--discord--email--whatsapp-cloud--teams--twilio--github--signal-and-friends). Long-poll and websocket ones (Telegram/Slack/Discord/Signal) and IMAP-poll (Email) hold their own outbound connection - there's nothing to `curl`, you message the platform for real. Webhook-driven ones (WhatsApp Cloud/Teams/Twilio/GitHub) generate a real route you can `curl` locally with a hand-computed signature, shown in each README.

| Example | Transport shape |
|---|---|
| [`telegram-gateway-agent/`](telegram-gateway-agent) | Long-poll (`getUpdates`) |
| [`slack-gateway-agent/`](slack-gateway-agent) | Persistent websocket (Socket Mode) |
| [`discord-gateway-agent/`](discord-gateway-agent) | Persistent websocket (Gateway API, mandatory heartbeats) |
| [`email-gateway-agent/`](email-gateway-agent) | Scheduled IMAP poll + SMTP send (degraded HITL) |
| [`whatsapp-cloud-gateway-agent/`](whatsapp-cloud-gateway-agent) | Webhook (`X-Hub-Signature-256`) |
| [`teams-gateway-agent/`](teams-gateway-agent) | Webhook (bearer JWT, not HMAC) |
| [`twilio-gateway-agent/`](twilio-gateway-agent) | Webhook (`X-Twilio-Signature`, form-urlencoded, degraded HITL) |
| [`github-gateway-agent/`](github-gateway-agent) | Webhook (`X-Hub-Signature-256`, `@mention`-gated, degraded HITL) |
| [`signal-gateway-agent/`](signal-gateway-agent) | Server-Sent Events, against an external `signal-cli` daemon (degraded HITL) |

## Try one

```bash
cd examples/minimal-agent
bxAgents build
bxAgents chat
```

Every example builds independently - each is a complete, self-contained project directory (its own `Agent.bx` + `instructions.md`), not a shared/linked structure. See [Quick Start](../docs/getting-started/quick-start.md) for the full `new` → edit → `build` → `serve`/`chat` walkthrough.
