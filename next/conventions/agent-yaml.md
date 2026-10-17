---
title: Agent.yaml
icon: phosphor-duotone:file-text
summary: "The default way to define an agent - plain settings in a YAML file, no code."
description: "The default way to define an agent - plain settings in a YAML file, no code."
tags: [conventions, configuration]
---

# Agent.yaml

`Agent.yaml` is the default way to define an agent. It is a plain YAML file - a name, a model, and any of the optional settings below - and the build turns it into a running agent. Most agents need nothing more than this file and an [`instructions.md`](#instructions) beside it.

```yaml
name: support
description: Answers customer questions about orders
model: openai/gpt-5

environments:
  test:
    model: mock/mock-model
```

`bxAgents new` scaffolds exactly this shape. When the definition needs real code (hooks, dynamic instructions, tools registered in code), use the advanced option instead: a class-based [`Agent.bx`](agent-bx.md), scaffolded with `bxAgents new --class`.

!!! info
    A folder holds **one** agent definition. An `Agent.yaml` (or `Agent.yml`) together with an `Agent.bx` in the same folder is an error - two definitions of one agent would leave it ambiguous which settings win - and `build` fails and names both files so you can keep one. This applies to the project root and to every [subagent](subagents.md) folder, and a project can mix the two: a YAML root with a class-based subagent, or the other way round.

## Settings

| Key | Type | Notes |
|---|---|---|
| `name` | string | Also becomes this agent's `config/WireBox.bx` binding key at build time, so it must be unique across the whole project (root + every subagent). |
| `model` | string | A `provider/model` slug, a bare provider name, or the name of a [`models/`](models.md) entry. See [The model slug](agent-bx.md#the-model-slug). |
| `description` | string | Optional. |
| `instructions` | string | Optional inline instructions. See [Instructions](#instructions). |
| `subAgents` | list of strings | Names of sibling folders under the root project's `subagents/`. See [subagents/](subagents.md). |
| `mcpServers` | list | Remote MCP servers - each entry a URL string or `{ url, name }`. See [mcp/](mcp.md). |
| `security` | mapping | Forwarded verbatim into the generated app's `bxai` module settings; bx-ai's own `SecurityDirector` turns it into guardrail middleware. |
| `memory` | string or mapping | The agent's conversation memory. A bare string is the type (`cache`); a mapping is `{ type, ...config }` and is passed through to `aiMemory()`. |
| `checkpointer` | mapping | `{ type: cache\|file\|jdbc, ...config }`. Defaults to `{ type: cache }` if omitted. |
| `gatewaySession` | mapping | `{ policy, maxQueueDepth }`, both optional. See [Agent.bx](agent-bx.md) for the values; they are identical. |
| `agentApi` | mapping | `{ enabled, tokenEnvVar }`, both optional. See [The always-on agent route](agent-bx.md#the-always-on-agent-route). |
| `environments` | mapping | Per-environment overrides. See [Environments](#environments). |

These are the same settings an `Agent.bx`'s `configure()` returns, so every behavior documented for them applies unchanged.

!!! warning
    An **unknown key is an error**, and the message lists the valid ones. A typo such as `modle:` would otherwise do nothing, quietly. Settings that arrive in later releases (for example `tools`) are rejected the same way until they exist, rather than being silently ignored. Anything free-form belongs in an `Agent.bx`.

A value of the wrong type (a text where a list belongs, say) and an empty value (`model:` with nothing after it) are errors too.

## Instructions

The agent's instructions are its system prompt. Put them in an `instructions.md` beside `Agent.yaml`, the usual choice because the file is plain Markdown and easy to edit:

```
my-agent/
├── Agent.yaml
└── instructions.md
```

For a short prompt you can write them inline instead:

```yaml
name: greeter
model: openai/gpt-5
instructions: |
  You greet people by name.
  Keep it to one sentence.
```

If both exist, **`instructions.md` wins** - the file is the more deliberate choice, so a stray `instructions:` line cannot override it. If neither exists, `build` fails and says so.

## Environments

`environments` holds overrides keyed by environment name. It is the YAML spelling of the environment-override methods (`production()`) an `Agent.bx` can declare:

```yaml
name: support
model: openai/gpt-5

environments:
  production:
    model: openai/gpt-5-mini
  staging:
    description: Staging copy
```

The active environment is chosen with this precedence, highest first:

1. the `--environment` CLI flag (`bxAgents build --environment=production`)
2. the `BX_AGENTS_ENV` environment variable
3. `development`

Only the block for the active environment is applied, on top of the top-level settings; keys it does not mention are left alone. Each block accepts the same keys as the top level, except `environments` itself.

`bxAgents test` builds against the `test` environment, which is why a scaffolded project carries a `test` block pointing at the `mock` provider: its tests need no API key or network access.

!!! note
    An `Agent.yaml` cannot compute its environment. The `detectEnvironment()` method described under [Environment overrides](agent-bx.md#environment-overrides) needs code, so a project that needs it uses an `Agent.bx`.

The overrides then merge with `boxlang.json`, `boxlang-{environment}.json`, `miniserver.json` and `miniserver-{environment}.json` exactly as described in [Merge semantics](agent-bx.md#merge-semantics).

## Requirements

Reading YAML needs the `bx-yaml` module, **1.1.0 or later**. BxAgents bundles it, so there is nothing to install. Global YAML tags (such as `!!java.io.File`) are rejected, so a cloned project's `Agent.yaml` cannot make the build instantiate arbitrary Java classes.

## YAML or Agent.bx?

| Use | When |
|---|---|
| `Agent.yaml` | The agent is configuration: a name, a model, instructions, memory, subagents. This is almost every agent. |
| [`Agent.bx`](agent-bx.md) | The definition itself needs code: hooks, dynamic instructions, tools registered in code, an overridden method, or `detectEnvironment()`. |

You can start with YAML and switch later: create the `Agent.bx`, move the settings across, and delete the `Agent.yaml`.
