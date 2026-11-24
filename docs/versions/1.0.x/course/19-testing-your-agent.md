---
title: "Testing Your Agent"
icon: phosphor-duotone:test-tube
summary: A ready-to-run TestBox suite, mockResponses(), and matchers built for agent behavior.
description: A ready-to-run TestBox suite, mockResponses(), and matchers built for agent behavior.
tags: [course, testing]
---

# Testing Your Agent

Every project scaffolded via `bxAgents new` ([Scaffolding Your First Agent](04-scaffolding-your-first-agent.md))
already has a root `box.json` (TestBox as a development dependency) and a ready-to-run
`tests/` folder with `tests/specs/AgentSpec.bx`, a spec that passes out of the box.

```bash
cd my-agent
box install       # fetches testbox into lib/testbox (new does it too, unless you pass --skipInstall)
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
copy** of your project - it never touches your real `.build`, so testing never
clobbers a real `build`/`serve`/`package` cycle. The built agent is exposed as `agent`.

## Testing needs no API key

By default, `bxAgents test` builds your agent using an `Agent.yml` `test` environment
override, scaffolded automatically by `new`:

```yaml
environments:
  test:
    model: mock/mock-model
```

This is the same `mock` provider you met in [The Agent Definition - Agent.yml](05-agent-bx.md) - no network
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
`tools/` implementation (from [Giving Your Agent Tools](09-giving-your-agent-tools.md)); only the
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

You made Acme support with `--skipInstall`, so TestBox is not there yet. Install it (this needs the internet; `box` is
the CommandBox command, see [Installing BxAgents](03-installing-bxagents.md)). The suite `new` wrote passes straight away:

<!-- course: network -->
```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
box install
bxAgents test
```

<!-- course: network -->
```text title="You see"
...
Bundles: 1 | Suites: 1 | Specs: 1
Pass: 1 | Fail: 0 | Error: 0 | Skipped: 0
```

Now test what Acme cares about: that a question about an order calls the order tool. The mocked model first asks for the
tool, the tool really runs against your `tools/Orders.bx`, and the mocked model then answers:

```javascript title="acme-support/tests/specs/OrderSpec.bx"
class extends="bxModules.bxagents.models.testing.BaseAgentSpec" {

	function run() {
		describe( "order lookups", function() {

			it( "calls the order tool and reports the answer", function() {
				mockResponses( [
					{ toolCalls : [ { name : "orderStatus", arguments : { orderNumber : "48213" } } ] },
					"Order 48213 has shipped."
				] )

				var response = agent.run( "Where is order 48213?" )

				expect( agent ).toHaveCalledTool( "orderStatus" )
				expect( response ).toContainText( "shipped" )
			} )

		} )
	}

}
```

<!-- course: network -->
```bash title="Terminal 2"
bxAgents test
```

<!-- course: network -->
```text title="You see"
Bundles: 2 | Suites: 2 | Specs: 2
Pass: 2 | Fail: 0 | Error: 0 | Skipped: 0
```

`test` prints pass, fail, error and skipped counts, one line per failure, and exits non-zero on a failure, so it can gate
a deploy in the last lesson. Because the model is mocked, the suite needs no key, no network and no scripted model; the
scripted model of this course is for *talking* to the agent, the mock for *proving* it.

## Checkpoint

`acme-support/tests/specs/` has `AgentSpec.bx` and `OrderSpec.bx`. `kit/resume.sh 19-testing-your-agent` restores them.

Full reference: [tests/](../conventions/testing.md).

Next: [Packaging, Deploying, and Wrapping Up](20-packaging-deploying-and-wrapping-up.md)
