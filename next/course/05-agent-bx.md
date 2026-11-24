---
title: "The Agent Definition - Agent.yml"
icon: phosphor-duotone:robot
summary: The one required file - a plain YAML file that says what your agent is.
description: The one required file - a plain YAML file that says what your agent is.
tags: [course, conventions]
---

# The Agent Definition - Agent.yml

`Agent.yml` is the **only required file** in a BxAgents project (beside the
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
[Scaffolding Your First Agent](04-scaffolding-your-first-agent.md)), with the system prompt in an
`instructions.md` beside it (see [instructions.md and the System Prompt](06-instructions-and-system-prompt.md)).

!!! info
    A folder holds **one** agent definition. An `Agent.yml` together with an
    `Agent.bx` (or an `Agent.yml`) in the same folder is an error, and the build names
    both files so you can keep one.

## The keys

| Key | What it does |
|---|---|
| `name` | The agent's name. Also its WireBox binding key, so it must be unique across the whole project. |
| `model` | A `provider/model` slug (see below). |
| `description` | Optional. |
| `instructions` | Inline system prompt. An `instructions.md` beside the file wins when both exist. |
| `tools` | Module tools this agent gets, as `item@module` or `*@module` (see [Giving Your Agent Tools](09-giving-your-agent-tools.md)). |
| `toolOptions` | Options for a module's tools, keyed by module name. |
| `subAgents` | Names of sibling folders under `subagents/` (see [Composing Subagents](11-composing-subagents.md)). |
| `mcpServers` | Remote MCP servers the agent can call (see [Hosting and Consuming MCP Servers](17-hosting-mcp-servers.md)). |
| `security`, `memory`, `checkpointer` | Guardrails, conversation memory and human-in-the-loop state. |
| `gatewaySession` | How chat gateways queue messages, which slash commands they answer and whether they read attachments (see [Connecting Chat Platforms](14-connecting-chat-platforms.md)). |
| `agentApi` | The always-on agent API: who may call it (tokens, allowed addresses, rate limit) and where it is served (see [Exposing Your Agent over HTTP and MCP](13-exposing-http-and-mcp.md)). |
| `environments` | Per-environment overrides (see below). |
| `provider`, `params`, `options`, `providers`, `profiles` | The model and its settings (see [Models and Profiles](12-named-model-configs.md)). |
| `notes`, `routines`, `vault`, `volumes`, `usage` | What the agent keeps and may do: short notes about people, prompts it runs on a schedule, secrets it may use, folders its file tools may reach, and a record of token counts for `bxAgents stats`. Each has a lesson later in the course. |
| `tui`, `extensions`, and more | The look of the terminal chat, values for extensions and the rest, all listed in the [Agent.yml](../conventions/agent-yaml.md) reference. |

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
[Testing Your Agent](19-testing-your-agent.md)). The course itself uses `openai-compatible`
against the scripted model instead, because that one also streams and calls tools like a real
provider does.

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
this exact mechanism for the `mock` provider in your tests ([Testing Your Agent](19-testing-your-agent.md)),
which is why `bxAgents new` already gives you a `test` block.

Full reference: [Agent.yml](../conventions/agent-yaml.md).

## When you need code: Agent.bx

`Agent.yml` covers almost every agent. Reach for the advanced class form, `Agent.bx`,
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
`Agent.bx`, move the settings across, and delete the `Agent.yml`. Full reference:
[Agent.bx](../conventions/agent-bx.md).

## Try it

Give Acme support a description, and turn on usage recording now so the later lessons have numbers to show.
This replaces the file `bxAgents new` wrote (its `test` block stays):

```yaml title="acme-support/Agent.yml"
# Acme support: the agent this course builds, lesson by lesson.
name: acme-support
description: Answers questions about orders, returns and shipping for Acme.
provider: openai-compatible
model: fast-model
usage: true

environments:
  test:
    model: mock/mock-model
```

Ask the agent to check the file still describes a valid agent:

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents inspect --section=agents
```

```text title="You see"
...
<anything>acme-support  openai-compatible/fast-model
...
```

A typo in a key is an error, not a silent no-op. Try `modle: x` on a new line, run `bxAgents inspect`, read the
message that lists the valid keys, and take the line out again.

## Checkpoint

`acme-support/Agent.yml` is the file above. If it is not, `kit/resume.sh 05-agent-bx` puts it back.

Next: [instructions.md and the System Prompt](06-instructions-and-system-prompt.md)
