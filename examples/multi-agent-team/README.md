# multi-agent-team

A root agent with two `subagents/` - `researcher` and `writer` - each auto-wrapped as a callable tool on the root agent by bx-ai's `aiAgent()`.

```bash
bxAgents build
bxAgents chat
```

`GeneratedAgentFactory.bx` builds `researcher` and `writer` first (leaf-first), then the root agent, passing in both already-built instances.

See [subagents/](../../docs/conventions/subagents.md).
