---
title: "Lesson 5: Agent.bx - The Agent Itself"
icon: phosphor-duotone:robot
summary: The one required file - a real class the build instantiates, not a config struct.
description: The one required file - a real class the build instantiates, not a config struct.
tags: [course, conventions]
---

# Agent.bx - The Agent Itself

`Agent.bx` is the **only required file** in a BxAgents project. It extends bx-ai's own
[`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents), so it
*is* the agent - the build instantiates it rather than rebuilding one from a config
struct, so what you write is what runs.

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "A helpful assistant",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

Because it's a real class rather than a struct-returning descriptor, an IDE can
introspect it like any other BoxLang class - jump to definition, autocomplete on
inherited methods, the works. Inherit and add whatever you need: private helpers,
overridden methods, tools registered in code.

## The rule: an explicit declaration wins

Everything the build can layer on top of the class is **optional** - declare a
`configure()` method returning any of the keys below to override what the class itself
set, or rely on a matching convention folder:

| You declare | The build emits | If you don't declare it |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | the class's own instructions stand |
| `model` in `configure()` | `setModel( aiModel( ... ) )` | the class's own model stands |
| `name` / `description` in `configure()` | `setName()` / `setDescription()` | the class's own stand |
| *(nothing to declare)* | `withTools( aiToolRegistry().getAll() )` | always - discovered `tools/` are added |
| `subAgents` on the class, or `subagents/` on disk | `addSubAgent( ... )` per child | appended the same way |
| `checkpointer` in `configure()` | `withCheckpointer( ... )` | **injected anyway** with a `cache` default |

!!! info
    The checkpointer is the one thing the build fills in unasked. An agent reachable
    from a gateway with no checkpointer has silently broken human-in-the-loop, so a
    class that set none still gets the `cache` default.

## The model slug

`model` is BxAgents' own convention - bx-ai itself takes `provider` and `model` as two
separate arguments. BxAgents splits the slug **on the first `/` only**:

| `model` value | provider | model |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

`mock` is a real provider that never makes a network call - useful for tests (see
[Lesson 19](19-testing-your-agent.md)) and for following this course with no API key
at all.

## `configure()` - overriding what the class set

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "with-mcp-servers-agent",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			mcpServers : [ "https://example.com/mcp" ]
		};
	}

}
```

Useful fields: `name` (also this agent's WireBox binding key - must be unique across
the whole project), `model`, `description`, `subAgents` (see [Lesson 11](11-composing-subagents.md)),
`mcpServers` (see [Lesson 17](17-hosting-mcp-servers.md)), `security`, `memory`,
`checkpointer`, `gatewaySession` (see [Lesson 14](14-connecting-chat-platforms.md)).

## Environment overrides

`Agent.bx` may declare a method named after an environment (`production()`,
`development()`, or any custom name) returning a struct of overrides:

```javascript
function production() {
	return {
		model : "openai/gpt-5-mini"
	};
}
```

The active environment resolves, highest wins: `--environment` CLI flag >
`BX_AGENTS_ENV` env var > `"development"` default. `bxAgents build --environment=production`
picks it up. You'll use this exact mechanism for the `mock` provider in your tests
([Lesson 19](19-testing-your-agent.md)).

Full reference: [Agent.bx](../conventions/agent-bx.md).

Next: [Lesson 6 - instructions.md and the System Prompt](06-instructions-and-system-prompt.md)
