# Examples

Five real, buildable BX Agents projects, each demonstrating one feature area. Every example uses the `mock` provider (`model: "mock/mock-model"`) so it builds and runs with **no API key and no network access** - swap in a real `provider/model` slug (see [Agent.bx](../docs/conventions/agent-bx.md#the-model-slug)) to use it for real.

| Example | Demonstrates |
|---|---|
| [`minimal-agent/`](minimal-agent) | The smallest complete agent: one tool, one skill. Start here. |
| [`http-gateway-agent/`](http-gateway-agent) | Exposing an agent over HTTP via `gateways/` + `toAi()`. |
| [`scheduled-agent/`](scheduled-agent) | Waking an agent on a cron schedule via `schedules/`. |
| [`mcp-agent/`](mcp-agent) | Hosting a local MCP server that re-exposes a tool via `mcp/`. |
| [`multi-agent-team/`](multi-agent-team) | A root agent delegating to two `subagents/`. |

## Try one

```bash
cd examples/minimal-agent
bxAgents build
bxAgents chat
```

Every example builds independently - each is a complete, self-contained project directory (its own `Agent.bx` + `instructions.md`), not a shared/linked structure. See [Quick Start](../docs/getting-started/quick-start.md) for the full `new` → edit → `build` → `serve`/`chat` walkthrough.
