---
title: "Example: A Multi-Agent Team"
icon: phosphor-duotone:users-three
summary: Build a root agent that delegates to two subagents, built leaf-first and wired in automatically.
description: Build a root agent that delegates to two subagents, built leaf-first and wired in automatically.
tags: [guides, examples, subagents]
---

# Example: A Multi-Agent Team

[`examples/multi-agent-team/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/multi-agent-team) is a root agent with two [subagents](../conventions/subagents.md) - `researcher` and `writer` - each auto-wrapped as a callable tool on the root agent by bx-ai's own `aiAgent()`. Delegation is entirely the model's decision at runtime; nothing in this project hard-codes which subagent handles which message.

## The project

```
multi-agent-team/
├── Agent.bx
├── instructions.md
└── subagents/
    ├── researcher/
    │   ├── Agent.bx
    │   └── instructions.md
    └── writer/
        ├── Agent.bx
        └── instructions.md
```

Every `subagents/<name>/` folder is itself a complete mini-agent - its own `Agent.bx`, its own `instructions.md`, and (not used here, but supported) its own `tools/`/`skills/`.

## Declaring the team

The root `Agent.bx` names the subagents to wire in via `configure()`:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "multi-agent-team",
			description : "A root agent delegating to a researcher and a writer subagent.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

	// subAgents here is the list of `subagents/` FOLDER names to wire at
	// build time - a build-time concern, distinct from super.init()'s own
	// `subAgents` argument (which takes already-built AiAgent instances).
	function configure() {
		return {
			subAgents : [ "researcher", "writer" ]
		};
	}

}
```

`configure()`'s `subAgents` list is resolved against folder names under `subagents/`; each folder's own `Agent.bx` declares its own `name`, `description`, and `model` independently:

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "researcher",
			description : "Gathers facts on a topic.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

```javascript
// subagents/writer/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "writer",
			description : "Turns research into polished prose.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## Instructions divide the responsibility

Each agent's `instructions.md` is deliberately scoped to its own job - the root coordinates, and each subagent is told explicitly what it does *not* do, so the model doesn't try to do everything in one hop:

```markdown
<!-- instructions.md (root) -->
## Team Lead

You coordinate a small team. Delegate research questions to the `researcher`
subagent and drafting/writing tasks to the `writer` subagent, then combine
their output into a final answer.
```

```markdown
<!-- subagents/researcher/instructions.md -->
## Researcher

You gather and summarize facts on a topic, citing your reasoning. You do
not write final prose - that's the writer's job.
```

```markdown
<!-- subagents/writer/instructions.md -->
## Writer

You turn research notes into clear, polished prose. You do not do your
own research - you rely on what the researcher provides.
```

## How the build wires it up

`ColdBoxAppGenerator` builds the tree **leaf-first**: `researcher` and `writer` are constructed first, and the already-built instances are passed into the root agent's own construction, so the root's `aiAgent()` call receives real subagent objects rather than names to resolve later. See [Subagents](../conventions/subagents.md) for the full leaf-first build order and how each subagent gets registered under its own name in WireBox (not just the root).

## Build and run

```bash
cd examples/multi-agent-team
bxAgents build
bxAgents chat
```

Ask something that clearly needs both roles, e.g. `Give me three facts about the BoxLang language, then turn them into a short paragraph.` A real model would typically call `researcher` first, then `writer`, then compose the final answer - the `mock` provider this example ships with won't actually delegate (it returns a fixed response with no tool calls), so swap in a real `provider/model` slug (see [The model slug](../conventions/agent-bx.md#the-model-slug)) to see real delegation happen.

## Where to go next

- [Example: A Minimal Agent](example-minimal-agent.md) if you haven't seen the base project shape yet.
- [Subagents](../conventions/subagents.md) for cycle detection, nested subagent trees, and per-subagent tools/skills.
- [Example: Building a Slack Bot](example-slack-bot.md) to see a similar agent reachable over a real chat platform instead of the `chat` REPL.
