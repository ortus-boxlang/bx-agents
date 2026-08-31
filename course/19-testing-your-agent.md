---
title: "Lesson 19: Testing Your Agent"
icon: phosphor-duotone:test-tube
summary: A ready-to-run TestBox suite, mockResponses(), and matchers built for agent behavior.
description: A ready-to-run TestBox suite, mockResponses(), and matchers built for agent behavior.
tags: [course, testing]
---

# Testing Your Agent

Every project scaffolded via `bxAgents new` ([Lesson 4](04-scaffolding-your-first-agent.md))
already has a ready-to-run `tests/` folder: `tests/box.json` and
`tests/specs/AgentSpec.bx`, a spec that passes out of the box.

```bash
cd my-agent/tests
box install       # fetches testbox/ into tests/testbox - new already ran this for you
cd ..
bxAgents test
```

## Writing a spec

Extend `bxModules.bxagents.models.testing.BaseAgentSpec` instead of
`testbox.system.BaseSpec` directly:

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

`BaseAgentSpec` builds your agent once per spec bundle, against a **throwaway temp
copy** of your project - it never touches your real `.build/app`, so testing never
clobbers a real `build`/`serve`/`package` cycle. The built agent is exposed as `agent`.

## Testing needs no API key

By default, `bxAgents test` builds your agent using an `Agent.bx` `test()` environment
override, scaffolded automatically by `new`:

```javascript
function test() {
	return {
		model : "mock/mock-model"
	};
}
```

This is the same `mock` provider you met in [Lesson 5](05-agent-bx.md) - no network
call, no API key, deterministic CI.

## `mockResponses()`

Scripts the agent's next replies, consumed in order - one per LLM round-trip,
including the intermediate turns of a tool-calling loop:

```javascript
mockResponses( [
	{ toolCalls: [ { name: "getWeather", arguments: { city: "Miami" } } ] },
	"It's sunny in Miami!"
] )

var response = agent.run( "What's the weather in Miami?" )
```

A plain string scripts a final reply. A `{ toolCalls: [...] }` struct scripts a
tool-call turn - the named tool **actually executes for real** against your real
`tools/` implementation (from [Lesson 9](09-giving-your-agent-tools.md)); only the
LLM's own reply is scripted, never the tool's behavior.

## Matchers built for agent behavior

| Matcher | Checks |
|---|---|
| `toContainText( "substring" )` | The response contains the given text, case-insensitively. |
| `toHaveCalledTool( "toolName" )` | The agent actually decided to invoke the named tool. |
| `toHaveReceivedMessage( "substring" )` | Some message sent to the provider contained the given text - useful for asserting your `instructions.md` actually reached the model. |

```javascript
expect( agent ).toHaveCalledTool( "getWeather" )
expect( agent ).notToHaveCalledTool( "getStockPrice" )
```

## Try it

Write a spec that scripts a tool call for the `GetTime` tool from
[Lesson 9](09-giving-your-agent-tools.md), and assert `toHaveCalledTool( "now" )`.

```bash
bxAgents test
```

Prints pass/fail/error/skipped counts, one line per failure, and exits non-zero on
failure - suitable as a CI gate before you deploy in the next lesson.

Full reference: [tests/](../conventions/testing.md).

Next: [Lesson 20 - Packaging, Deploying, and Wrapping Up](20-packaging-deploying-and-wrapping-up.md)
