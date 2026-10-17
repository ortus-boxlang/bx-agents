---
title: "Lesson 5: The Agent Definition - Agent.yaml"
icon: phosphor-duotone:robot
summary: The one required file - a plain YAML file that says what your agent is.
description: The one required file - a plain YAML file that says what your agent is.
tags: [course, conventions]
---

# The Agent Definition - Agent.yaml

`Agent.yaml` is the **only required file** in a BxAgents project (beside the
instructions it points at). It is plain settings - a name, a model, and any optional
extras - and the build turns it into a real
[BX AI agent](https://ai.ortusbooks.com/main-components/agents/class-based-agents).
No code needed.

```yaml
name: my-agent
description: A helpful assistant
model: openai/gpt-5
instructions: |
  You are a helpful assistant.
```

That is a complete agent. `bxAgents new` scaffolds this shape for you (see
[Lesson 4](04-scaffolding-your-first-agent.md)), with the system prompt in an
`instructions.md` beside it (see [Lesson 6](06-instructions-and-system-prompt.md)).

!!! info
    A folder holds **one** agent definition. An `Agent.yaml` together with an
    `Agent.bx` (or an `Agent.yml`) in the same folder is an error, and the build names
    both files so you can keep one.

## The keys

| Key | What it does |
|---|---|
| `name` | The agent's name. Also its WireBox binding key, so it must be unique across the whole project. |
| `model` | A `provider/model` slug (see below). |
| `description` | Optional. |
| `instructions` | Inline system prompt. An `instructions.md` beside the file wins when both exist. |
| `subAgents` | Names of sibling folders under `subagents/` (see [Lesson 11](11-composing-subagents.md)). |
| `mcpServers` | Remote MCP servers the agent can call (see [Lesson 17](17-hosting-mcp-servers.md)). |
| `security`, `memory`, `checkpointer` | Guardrails, conversation memory and human-in-the-loop state. |
| `gatewaySession` | How chat gateways queue sessions (see [Lesson 14](14-connecting-chat-platforms.md)). |
| `agentApi` | The always-on agent route. |
| `environments` | Per-environment overrides (see below). |

An **unknown key is an error** that lists the valid ones, so a typo such as `modle:`
can never quietly do nothing. Wrong types and empty values are errors too.

!!! info
    The checkpointer is the one thing the build fills in unasked. An agent reachable
    from a gateway with no checkpointer has silently broken human-in-the-loop, so a
    definition that sets none still gets the `cache` default.

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

## Adding settings

Other settings are just more keys:

```yaml
name: with-mcp-servers-agent
model: openai/gpt-5
mcpServers:
  - https://example.com/mcp
```

## Environment overrides

`environments` maps an environment name (`production`, `development`, or any custom
name) to a block of overrides:

```yaml
name: my-agent
model: openai/gpt-5

environments:
  production:
    model: openai/gpt-5-mini
  test:
    model: mock/mock-model
```

The active environment resolves, highest wins: `--environment` CLI flag >
`BX_AGENTS_ENV` env var > `"development"` default. `bxAgents build --environment=production`
picks it up. Only the active block is applied, on top of the top-level keys. You'll use
this exact mechanism for the `mock` provider in your tests ([Lesson 19](19-testing-your-agent.md)),
which is why `bxAgents new` already gives you a `test` block.

Full reference: [Agent.yaml](../conventions/agent-yaml.md).

## When you need code: Agent.bx

`Agent.yaml` covers almost every agent. Reach for the advanced class form, `Agent.bx`,
only when the definition itself needs code: hooks, dynamic instructions, tools
registered in code, an overridden method, or computing the environment with
`detectEnvironment()`. It is a real class extending bx-ai's `AiAgent`, which the build
instantiates:

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

Scaffold one with `bxAgents new --class`, or start in YAML and switch later: create the
`Agent.bx`, move the settings across, and delete the `Agent.yaml`. Full reference:
[Agent.bx](../conventions/agent-bx.md).

Next: [Lesson 6 - instructions.md and the System Prompt](06-instructions-and-system-prompt.md)
