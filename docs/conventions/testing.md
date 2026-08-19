---
title: tests/
icon: 🧪
summary: Every scaffolded project gets a ready-to-run TestBox suite.
description: Every scaffolded project gets a ready-to-run TestBox suite.
tags: [conventions, testing]
---

# tests/

Every project scaffolded via `bxAgents new` gets a ready-to-run `tests/` folder: a `tests/box.json` (declaring a `testbox` dependency) and `tests/specs/AgentSpec.bx`, an example spec that passes out of the box.

```bash
cd my-agent/tests
box install       # fetches testbox/ into tests/testbox
cd ..
bxAgents test
```

!!! info
    Inspired by the `coldbox-templates/boxlang` template's own dedicated `tests/` + `box.json` folder - adapted to BX Agents' own simpler testing story. Testing an agent is about its **behavior** (what it says, which tools it calls), not HTTP routing, so there's no `Application.bx`/ColdBox virtual app involved here at all.

## Writing a spec

Extend `bxModules.bxagents.models.testing.BaseAgentSpec` (a `testbox.system.BaseSpec` subclass) instead of `testbox.system.BaseSpec` directly:

```javascript
// tests/specs/AgentSpec.bx
class extends="bxModules.bxagents.models.testing.BaseAgentSpec" {

	function run() {
		describe( "my-agent", function() {

			it( "responds to a greeting", function() {
				mockResponses( [ "Hello! How can I help you today?" ] )

				var response = agent.run( "Hi there" )

				expect( response ).toContainText( "Hello" )
			} )

		} )
	}

}
```

`BaseAgentSpec` builds your agent once per spec bundle (`beforeAll()`), against a **throwaway temp copy** of your project - it never touches your real `.build/app`, so running tests never clobbers (or is clobbered by) a real `build`/`serve`/`package` cycle. The built agent is exposed as `agent`.

## Testing against the mock provider

By default, `bxAgents test` builds your agent using `Agent.bx`'s `test()` environment override (scaffolded automatically):

```javascript
// Agent.bx
function test() {
	return {
		model : "mock/mock-model"
	};
}
```

This means your tests need **no API key and no network access** out of the box - the same `mock` provider convention used throughout BX Agents' own test suite. Edit this override if you want a spec to run against a real provider instead (you'll need a real API key available in the environment running the tests).

### `mockResponses( responses )`

Scripts the agent's next replies, consumed in order - one per LLM round-trip, including the intermediate turns of a tool-calling loop:

```javascript
mockResponses( [
	{ toolCalls: [ { name: "getWeather", arguments: { city: "Miami" } } ] },
	"It's sunny in Miami!"
] )

var response = agent.run( "What's the weather in Miami?" )
```

A plain string scripts a final reply. A `{ toolCalls: [ { name, arguments } ] }` struct scripts a tool-call turn - the named tool **actually executes for real** (against your real `tools/` implementation), and its real return value is what the next round-trip sees; only the LLM's own reply is scripted, never the tool's behavior.

## Custom matchers

`BaseAgentSpec` registers a few matchers, tailored to testing agent behavior, via TestBox's own `addMatchers()` extension point - use them exactly like any built-in TestBox matcher, including negation (`notTo...`):

| Matcher | Checks |
|---|---|
| `toContainText( "substring" )` | The actual value (usually a response string) contains the given text, case-insensitively. |
| `toHaveCalledTool( "toolName" )` | The agent's own recorded provider requests show it actually decided to invoke the named tool - not just that the tool exists. |
| `toHaveReceivedMessage( "substring" )` | Some message actually sent to the provider (any role, any round-trip) contained the given text - useful for asserting your system prompt/instructions actually reached the model. |

```javascript
expect( agent ).toHaveCalledTool( "getWeather" )
expect( agent ).notToHaveCalledTool( "getStockPrice" )
```

## Running tests

```bash
bxAgents test
```

Runs your project's `tests/specs/**` via TestBox, in a fresh child process (so it never fights over BoxLang's own class-mapping caches with anything else you're running). Prints bundle/suite/spec counts and pass/fail/error/skipped totals, plus one line per failure, and exits non-zero if anything failed - suitable as a CI gate before `deploy`.

!!! warning
    `bxAgents test` requires `testbox` actually installed under `tests/testbox` (`cd tests && box install`) - it errors clearly, rather than silently reporting zero specs, if that hasn't been done yet.