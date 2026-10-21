---
title: mcp/
icon: phosphor-duotone:link-simple
summary: "Model Context Protocol in both directions: consume remote servers, host your own."
description: "Model Context Protocol in both directions: consume remote servers, host your own."
tags: [conventions, mcp]
---

# mcp/

MCP (Model Context Protocol) works two directions - consuming remote servers, and hosting your own.

```mermaid
flowchart LR
    subgraph consume["CONSUMING - declared on Agent.yaml via mcpServers"]
        direction LR
        AG["your agent"] -->|"calls out at runtime"| RM["a remote MCP server<br/>https://example.com/mcp"]
    end

    subgraph host["HOSTING - one file per server under mcp/"]
        direction LR
        TL["tools/<br/>your @AITool functions"] -->|"a named SUBSET"| MS["mcpServer( 'localServer' )<br/>registered at onApplicationStart()"]
        MS --> GW["a gateways/ entry with exposes: mcp<br/>route( '/mcp/tools' ).toMCP()"]
        GW -->|"reachable over HTTP"| OC["some outside MCP client"]
    end

    style consume fill:#e7f1ff,stroke:#004085
    style host fill:#eaf6ec,stroke:#155724
```

Nothing links the two: an agent consuming remote servers need not host one, and a hosted server is reachable only if a `gateways/` entry exposes it.

## Consuming remote servers

Declared directly on `Agent.yaml` (not a file under `mcp/`), via `mcpServers`:

```yaml
# Agent.yaml
name: my-agent
model: openai/gpt-5
mcpServers:
  - https://example.com/mcp
  - url: https://other.com/mcp
    name: other
```

Each entry is either a bare URL string or a mapping. A mapping can carry the credentials the server wants:

```yaml
mcpServers:
  - name: github
    url: https://api.githubcopilot.com/mcp/
    token: ${env.GITHUB_PERSONAL_ACCESS_TOKEN}
  - url: https://other.com/mcp
    headers:
      X-Api-Key: ${env.OTHER_API_KEY}
    timeout: 20000
```

| Key | Meaning |
|---|---|
| `url` | Required. The server's address |
| `name` | A label for the file. It is not sent to the server |
| `token` | A bearer token. Must be an `${env.NAME}` placeholder: a token written in the file is a build error |
| `password`, `user` | Basic authentication. `password` must be an `${env.NAME}` placeholder |
| `headers` | Extra request headers. Values can use `${env.NAME}` |
| `timeout` | Milliseconds |
| `allowedHosts` | The host names the server's address may have, for example `[api.example.com, "*.example.com"]`. `*.example.com` matches any subdomain, not `example.com` itself. A request to any other host is refused before anything is sent |
| `redirects` | `false` treats a redirect answer as a failure and never follows it |
| `maxResponseBytes` | Refuses an answer longer than this many characters |
| `handshake` | `true` sends the MCP `initialize` handshake before the first call |
| `prefix` | Tools are named `prefix__tool`, so two servers cannot clash |
| `toolFilter` | A list of tool names; only these are given to the agent |

Placeholders are replaced with the environment variable **when the app starts**, never at build time, so a secret stays out of the project and out of a packaged `.bxa`. A variable that is not set fails the agent at startup and names it; one that is set but empty lets the agent start, the server refuses the connection, and bx-ai logs that and carries on without that server's tools. Any other key is a build error that lists the valid ones.

The entries are passed into the generated `aiAgent(mcpServers: [...])` call. **No network connection is ever attempted at build time** - reachability is a runtime concern; an unreachable server at build time is not a build error. This section is for servers reached over the web; servers that run as a program on the agent's machine are next.

[`bxAgents new`](../guides/new-wizard.md#mcp-servers) offers GitHub, Stripe, Notion, Atlassian, Cloudflare, Supabase and Git and writes the entry and the `.env` stub for you.

Subagents can declare their own `mcpServers` independently - each node in the agent tree gets its own resolved list.

### Servers that run as a program

An entry with `command` starts an MCP server as a program on the machine that runs the agent, and talks to it over the program's standard input and output:

```yaml
mcpServers:
  - name: git
    command: [uvx, mcp-server-git]
    prefix: git
    toolFilter: [git_status, git_diff, git_log]
  - name: browser
    command: [bxplaywright, mcp]
    env:
      PLAYWRIGHT_API_KEY: ${env.PLAYWRIGHT_API_KEY}
    cwd: .
```

| Key | Meaning |
|---|---|
| `command` | Required. A list: the program, then its arguments. It is never run through a shell |
| `name` | A label for the file |
| `env` | Environment variables for the program. A variable whose name contains `KEY`, `TOKEN`, `SECRET`, `PASSWORD` or `CREDENTIAL` must be an `${env.NAME}` placeholder |
| `cwd` | The folder the program starts in |
| `inheritEnv` | `false` starts it with only `env`. Default `true` |
| `maxRestarts` | How many times in a row a program that died is started again. Default 2 |
| `timeout` | Milliseconds per request |
| `prefix`, `toolFilter` | As for web servers |

The program starts on the first call and is closed when the app stops. `command` cannot be combined with `url`, and the keys that only make sense for a web server (`token`, `headers`, `user`, `password`, `allowedHosts`, `redirects`, `maxResponseBytes`, `handshake`) are a build error on it.

When the app starts, the programs your agents declare become bx-ai's `mcp.stdio.allowedCommands` setting, so the process starts only what the project declared. A list you set yourself (for example in `.boxlang.json`) is left alone and must name the programs. [`bxAgents doctor`](../cli-reference.md) warns when a program is not on the PATH.

A program runs with your user's rights on the machine that hosts the agent. Read what you start, and use `toolFilter` to limit what the agent may call.

## Hosting a local server

Each `mcp/*.bx` file is a local MCP server your project hosts, exposing a subset of your `tools/` as MCP tools:

```javascript
// mcp/localServer.bx
class {

	function configure() {
		return {
			description : "Internal tools MCP server",
			version     : "1.0.0",
			cors        : "*",             // optional - CORS origin(s) allowed to call this server; omit for none
			tools       : [ "sayHello" ]   // names of tools already declared under tools/
		};
	}

}
```

The entry's discovered name is its **filename** (`localServer.bx` → `localServer`), not any `name` field inside its own `configure()` struct - a project may still set one for documentation, but it's ignored for naming/registration purposes.

`cors` is optional and defaults to an empty string (no CORS header) when omitted - passed straight through as `mcpServer()`'s 4th positional argument.

At build time, the file is copied verbatim into the generated app's `mcp/` folder, and a registration statement is emitted into `Application.bx`'s `onApplicationStart()`:

```javascript
mcpServer( "localServer", "Internal tools MCP server", "1.0.0", "*" )
	.registerTool( aiToolRegistry().get( "sayHello" ) )
```

`mcpServer(name, ...)` is a global, name-keyed singleton getter in bx-ai - registering it once at startup is all that's needed; there's no WireBox mapping involved (unlike the agent-exposure singleton used by `toAi()`).

## Exposing a local server over HTTP

A local `mcp/*` server isn't reachable over HTTP on its own - pair it with a [`gateways/`](gateways/index.md) exposure entry naming it as the `target`:

```javascript
// gateways/expose-mcp.bx
class {
	function configure() {
		return {
			exposes : "mcp",
			path    : "/mcp/tools",
			target  : "localServer"
		};
	}
}
```

## Validation

- An `mcpServers` entry (struct form) needs a `url` or a `command`, not both and not neither.
- An `mcpServers` entry that's neither a non-empty string nor a struct fails validation.
- A `command` must be a list of non-empty words. A key for the other kind of server, an `env` secret written in the file, and a mistyped `allowedHosts`, `redirects`, `handshake`, `prefix` or `toolFilter` fail validation.
- A `gateways/` entry with `exposes: "mcp"` and a `target` that doesn't match any discovered `mcp/*` entry fails validation.