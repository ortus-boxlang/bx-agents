# Proposal: `toAiGateway()` — a native ColdBox routing DSL terminator for the bx-ai Gateway webhook surface

Status: draft, written from BX Agents (`ortus-boxlang/bx-agents`). Update since first
draft: `coldbox-platform` (specifically ColdBox itself, `Router.cfc`) WAS attached and
read directly later in this same session — the cross-owner limit turned out to be
per-session-state, not permanent; once `ColdBox/coldbox-platform`'s zip was fetched from
its real download URL and unpacked, its `system/web/routing/Router.cfc` source was read
in full. That resolved the two "worth confirming" items below and, more importantly,
corrected a real mistake this proposal's `toAi()`/`IAiRunnable` section had inherited from
an earlier documentation-only pass (see the correction notes inline).

## Why

ColdBox 8.1 ships two AI-specific routing DSL terminators:

- `route(pattern).toAi(target)` — 4 auto-registered routes (`invoke`/`stream`/`batch`/`info`)
  against an `IAiRunnable` target.
- `route(pattern).toMCP(target)` — 1 route, dispatches to `MCPRequestProcessor`.

bx-ai also ships a third HTTP surface that has no ColdBox terminator at all: the
`IGateway`/`aiGatewayRegistry()` channel-adapter webhook surface (Slack/webhook delivery,
human-in-the-loop approval), fronted by a fixed 3-route processor
(`bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()`). Today,
using it from a ColdBox app means hand-wiring 3 plain routes to a passthrough handler.
That's exactly the kind of wiring `toAi()`/`toMCP()` already exist to save people from
doing by hand for the other two bx-ai surfaces — this proposes closing the gap with a
third terminator, `toAiGateway()`, built the same way.

BX Agents (a conventions-based agent-framework module on top of bx-ai + ColdBox) is
shipping this wiring itself in the meantime — see "Current workaround" below — precisely
so it can be deleted once this lands in core.

## What's already proven (verified against `bx-ai` source this session)

`bxModules.bxai.models.gateway.http.GatewayRequestProcessor`:

```javascript
static string function processHttp() {
    var requestData = static.httpTransport.readRequest();
    var response     = route( requestData );
    static.httpTransport.writeResponse( response );
    return response.content;
}
```

- **Zero-argument, static.** It reads the live HTTP request itself (via `cgi.PATH_INFO`,
  `cgi.REQUEST_METHOD`, `getHTTPRequestData()`) and writes the response itself (via
  `bx:header`/`bx:content reset=true`). It does not need — and cannot use — ColdBox's
  `event`/`rc`/`prc` for its own logic.
- **Routes internally off `cgi.PATH_INFO`**, expecting exactly 3 shapes:
  - `POST /gateways/{gatewayName}/events` — inbound platform event
  - `GET  /interactions/{requestID}` — poll a pending human-approval interaction
  - `POST /interactions/{requestID}/decisions` — submit a human's decision
  - (plus `OPTIONS` CORS preflight, handled internally too)
- Because it parses path segments itself, whatever fronts it must expose these 3 shapes
  **verbatim** (no extra path prefix) for the segment-count/name checks in
  `GatewayRequestProcessor.route()` to match.
- `aiGatewayRegistry()` resolves gateways by name; nothing about routing needs the
  registry's contents, just that gateways were registered at some point before a request
  arrives (typically app startup).

This means `toAiGateway()` needs **no adapter interface at all** — unlike `toAi()`'s
`IAiRunnable`, there is nothing for a target class to implement. The terminator's whole
job is registering the right routes to the right static call and telling ColdBox not to
render anything afterward (the processor already wrote the real response).

## Proposed core implementation

A single terminator, auto-registering 3 routes (mirroring `toAi()`'s "one call → N
routes" shape) with **no target argument** (mirroring `toMCP()`'s no-target form, since
routing is name-driven from the URL itself, not from a WireBox mapping):

```javascript
route( "/bxai" ).toAiGateway();
```

registers, relative to wherever `route()`'s pattern anchors it:

| Verb | Path | Behavior |
|---|---|---|
| POST | `{pattern}/gateways/:gatewayName/events` | inbound platform event |
| GET  | `{pattern}/interactions/:requestID` | poll interaction |
| POST | `{pattern}/interactions/:requestID/decisions` | submit human decision |

All 3 dispatch to the same generated/internal action, which does nothing but:

```javascript
function process( event, rc, prc ) {
    bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp();
    return event.noRender();
}
```

Open question for whoever implements this against real `Route.bx` source: whether
`{pattern}` prefixing is safe given `GatewayRequestProcessor` parses `cgi.PATH_INFO`
assuming **no prefix** (see "verbatim" note above). Two ways to resolve, in order of
preference:
1. `toAiGateway()` always anchors at the app root (ignore/reject a non-empty pattern),
   since the processor's own path parsing can't tolerate a prefix anyway.
2. If ColdBox's URL rewriting always makes `cgi.PATH_INFO` reflect the full requested
   path (typical rewrite-everything-to-index.bxm ColdBox deployments), a prefix "just
   works" transparently and this isn't actually a constraint — verify empirically before
   picking either option.

Standard route modifiers (`.as()`, `.withModule()`, `.withDomain()`, etc.) should apply
the same way they do for `toAi()`/`toMCP()`.

## Current workaround (BX Agents, to delete once this lands)

BX Agents' build pipeline generates the equivalent wiring by hand today:

- `RouterGenerator.bx` emits, only when at least one `http`-type channel-adapter gateway
  is configured:
  ```javascript
  post( "/gateways/:gatewayName/events" ).toHandler( "Gateway.process" )
  get( "/interactions/:requestID" ).toHandler( "Gateway.process" )
  post( "/interactions/:requestID/decisions" ).toHandler( "Gateway.process" )
  ```
- `GatewayGenerator.bx` emits a generated `handlers/Gateway.bx` with exactly one action:
  ```javascript
  function process( event, rc, prc ) {
      bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()
      return arguments.event.noRender()
  }
  ```
- `aiGatewayRegistry().register( aiGateway( type, options ) )` calls are inserted into the
  generated app's `Application.bx onApplicationStart()`, once per configured
  channel-adapter gateway.

Once `toAiGateway()` exists in core, `RouterGenerator` swaps its 3 hand-written routes
for one `route( ... ).toAiGateway()` call, and `GatewayGenerator` stops generating
`handlers/Gateway.bx` entirely — pure deletion, no new BX Agents-side logic needed.

## Testing plan for the core PR

- Unit: `route(...).toAiGateway()` registers exactly 3 routes, correct verbs/paths,
  standard route modifiers apply.
- Integration: a live request to each of the 3 paths reaches
  `GatewayRequestProcessor::processHttp()` and returns its response verbatim (status
  code, headers, body) — register a `mock`-type gateway via `aiGatewayRegistry()` in the
  test harness (no real network/LLM call needed, `bx-ai` ships a literal `"mock"`
  provider for exactly this).
- Regression: confirm `event.noRender()` prevents ColdBox from double-writing a response
  after `processHttp()` already flushed one via `bx:content reset=true`.

## Confirmed later this session (update)

`ColdBox/coldbox-platform` (8.1.0) was fetched directly (`https://downloads.ortussolutions.com/ortussolutions/coldbox/8.1.0/coldbox-8.1.0.zip`)
and `system/web/routing/Router.cfc` read in full. Both items originally listed here as
"worth confirming" are now resolved, and one earlier assumption in this very proposal
was wrong and has been corrected:

1. **`toAi(target)`'s target resolution — confirmed as assumed.** Router.cfc:
   `var runnableInstance = isSimpleValue( capturedRunnable ) ? getInstance( capturedRunnable ) : capturedRunnable`.
   A string is resolved via WireBox `getInstance()`; a live object is used directly.

2. **The real `IAiRunnable` contract — CORRECTED, not what this proposal originally said.**
   The "What's already proven" section above (unchanged, still accurate for the Gateway
   surface) was written from bx-ai source only. Separately, BX Agents' own M8 work relied
   on a *published-docs* description of `toAi()`'s target contract that turned out to be
   wrong: `invoke`/`stream`/`batch`/`info` are the **sub-route names**, not method names
   `toAi()` calls on the target. Router.cfc's actual closures call
   `runnableInstance.run( input, params, options )` and
   `runnableInstance.stream( onChunk, input, params, options )` — i.e. bx-ai's own
   `IAiRunnable` interface (`bxModules.bxai.models.runnables.IAiRunnable`), which
   `AiAgent` already implements natively via `AiBaseRunnable`. **No adapter subclass is
   needed at all** — the plain `aiAgent()` BIF's return value already satisfies `toAi()`.
   BX Agents' generator has been corrected to match (no more
   `GeneratedAgentRunnable.bx`/`exposeAgentAsRunnable`).

3. **WireBox's `.toProvider(closure)`** — not re-checked this session (Router.cfc doesn't
   touch WireBox binder syntax); still an assumption in BX Agents' `config/WireBox.bx`
   generator. Low risk: `.toProvider()` is well-established, commonly-used WireBox DSL,
   just not something this specific source pass happened to touch.
