# advanced-agent

A composite, "everything together" example - unlike the other examples, which
each isolate one convention folder, this one combines most of them in a
single project to show they compose cleanly:

- `models/fast.bx` - a named, reusable model configuration, referenced from `Agent.bx` as `model: "fast"`.
- `subagents/researcher` and `subagents/writer` - two subagents, auto-wrapped as callable tools on the root agent.
- `tools/Finance.bx` - two `@AITool` functions on the root agent itself.
- `skills/citation-style/` - a Claude Agent Skill the subagents' instructions reference.
- `mcp/localServer.bx` - a hosted local MCP server re-exposing the root agent's own tools.
- `gateways/expose.bx` + `gateways/exposeMcp.bx` - the root agent AND the local MCP server, both exposed over HTTP at the same time.
- `schedules/Scheduler.bx` - a nightly task that wakes the root agent by its declared name.
- `interceptors/AuditLogger.bx` - an agent-scoped ColdBox lifecycle interceptor.

```bash
bxAgents build
bxAgents serve --port=8080
```

```bash
curl -X POST http://localhost:8080/api/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":"Research and summarize BoxLang'\''s history"}'
```

```bash
curl -X POST http://localhost:8080/mcp/tools \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getStockQuote","arguments":{"ticker":"BXL"}}}'
```

{% hint style="warning" %}
The very first request to a freshly booted app's `toAi()` route can transiently fail - see [Known Limitations](../../docs/known-limitations.md#the-toai-first-request-race). Send a warm-up request first.
{% endhint %}

See [models/](../../docs/conventions/models.md), [subagents/](../../docs/conventions/subagents.md), [skills/](../../docs/conventions/skills.md), [mcp/](../../docs/conventions/mcp.md), [gateways/](../../docs/conventions/gateways.md), [schedules/](../../docs/conventions/schedules.md), and [interceptors/](../../docs/conventions/interceptors.md).
