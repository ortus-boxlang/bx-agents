# With MCP Servers Fixture

Used to test that remote mcpServers entries (URL string or { url, name }
struct) are reduced to bare URLs and passed into the generated aiAgent()
call, with no network call ever attempted at build time.
