# mcp-agent

Hosts a local MCP server (`mcp/localServer.bx`) that re-exposes the `search` tool to any MCP client, alongside the agent using that same tool directly.

```bash
bxAgents build
bxAgents chat
```

To reach the MCP server over HTTP too, add a `gateways/` entry:

```javascript
// gateways/expose-mcp.bx
class {
	function configure() {
		return { exposes: "mcp", path: "/mcp/tools", target: "localServer" };
	}
}
```

See [mcp/](../../docs/conventions/mcp.md).
