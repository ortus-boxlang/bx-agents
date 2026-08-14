# gateways/

`gateways/*.bx`/`.json` files under this one folder cover **two distinct, unrelated things** - which kind an entry is depends entirely on whether its `configure()` struct has an `exposes` key.

{% hint style="warning" %}
Don't confuse these with each other - an HTTP-exposed agent (`exposes: "agent"`) is a REST API for your agent; a channel-adapter gateway (`type: "http"`) is a webhook endpoint for a chat platform or human-in-the-loop approval flow. They generate completely different routes.
{% endhint %}

## 1. HTTP/MCP exposure (`exposes: "agent" | "mcp"`)

Exposes the agent, or a local MCP server, over HTTP using ColdBox 8.1's native AI Routing DSL.

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

**Expose a local MCP server** (see [mcp/](mcp.md)):

```javascript
class {
	function configure() {
		return {
			exposes : "mcp",
			path    : "/mcp/tools",
			target  : "local-server"   // must match an mcp/*.bx entry's declared name
		};
	}
}
```

Generates `route( "/mcp/tools" ).toMCP( "local-server" )`.

**Validation:** `exposes` must be `agent` or `mcp`; `path` is required and must be unique across every exposure entry; an `mcp` exposure's `target` is required and must match a real `mcp/*` entry's declared name.

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

The secret is resolved live at server startup, matching this project's "secrets stay external" rule everywhere else (see [Deployment & Secrets](../deployment-and-secrets.md)) - it's never embedded as a literal in generated source, so it's never present in a packaged `.bxa` either. If the env var is unset, bx-ai's own `HttpGateway` treats an empty secret as "no signing configured" and rejects requests accordingly, rather than crashing at startup.

**Validation:** `type` must be `mock`, `cli`, or `http`; a `type: "http"` entry requires a `secretEnvVar`; the entry's own file/base name must be unique across every channel-adapter entry. `mock` is test-only; `cli` is bx-ai's own built-in human-in-the-loop **approval** channel (a blocking stdin/stdout A/R/Q prompt) - it's what `HumanInTheLoopMiddleware` attaches by default when no gateway is specified, and is unrelated to BX Agents' own `chat` verb (which never touches the gateway registry at all).

**`http`-type entries additionally get real HTTP wiring**: a generated `handlers/Gateway.bx` action that proxies straight into bx-ai's own `GatewayRequestProcessor::processHttp()`, and three routes in `config/Router.bx`:

```javascript
post( "/gateways/:gatewayName/events" ).toHandler( "Gateway.process" )
get( "/interactions/:requestID" ).toHandler( "Gateway.process" )
post( "/interactions/:requestID/decisions" ).toHandler( "Gateway.process" )
```

{% hint style="info" %}
ColdBox has no built-in `toAiGateway()` DSL terminator for this surface (only `toAi()` and `toMCP()` exist natively) - this wiring is BX Agents' own generated code, following the same shape a future core terminator would produce. See the [`toAiGateway()` for ColdBox Core](../proposals/toAiGateway-coldbox-core.md) proposal.
{% endhint %}
