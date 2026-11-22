---
title: Layered settings
icon: phosphor-duotone:stack
summary: "Three Agent.yml files, one merge. The author's file, the person's file for every agent, and the person's file for one agent."
description: "Three Agent.yml files, one merge. The author's file, the person's file for every agent, and the person's file for one agent."
tags: [conventions, configuration]
---

# Layered settings

Someone ships a ready-made agent. The person who installs it can override and add to its settings without touching the author's files. All three files are called `Agent.yml`:

```text
<project>/Agent.yml             the author's file
~/.bxagents/Agent.yml           the person's file, for every agent
~/.bxagents/<agent>/Agent.yml   the person's file, for one agent on this machine
```

`<agent>` is the agent's `name`. `BXAGENTS_USER_CONFIG` names another global file (for tests).

## Precedence

First match wins:

1. the flag of one run (`--model ...`)
2. `~/.bxagents/<agent>/Agent.yml`
3. `~/.bxagents/Agent.yml`
4. `<project>/Agent.yml`
5. the default

## When it applies

Both, with one merge:

- **Build.** `bxAgents build` reads the three files, merges, and bakes the result. This covers an agent shipped as a project folder that the person builds themselves.
- **Start.** A built app (a zip or a container, no source on the machine) reads the person's two files when it starts and applies the same merge over what it baked.

A setting the built app cannot change without a rebuild is reported at start, with the file it came from. It is never ignored silently.

## Merge rules

| Written as | Result |
|---|---|
| a mapping | merges key by key with the layer below |
| a plain value | replaces |
| a list | replaces |
| `key+:` with a list | appends to the list below |
| `key: ~` | removes the key |

```yaml
# project/Agent.yml
model: openai/gpt-5
tools: [ now@bxai ]
mcpServers: [ https://mcp.example.com ]

# ~/.bxagents/Agent.yml
model: ollama/qwen3        # replaces
tools+: [ "*@bxplaywright" ] # appends
mcpServers: ~              # removes
```

## Which keys, and where

Everything except `name` and `data.home` can be overridden (`data.home` decides where the agent's own file lives). Both person files may add tools, `mcpServers` and `volumes`.

`chat:` is valid only in the person's files. In a project it is an error, so a project can never switch those on for a person. `extensions:` values layer the same way.

Unchanged: an unknown key is an error and the message lists the valid ones. Secrets stay `${env.X}` or `${vault.X}` placeholders, never in the files. A bad value names the file.

Because the global file can widen every agent, `/info` lists each setting that came from a person's file, with the file.

## Key table

Read from the generators, not yet proven by running. "Start" means the built app can take a changed value when it starts. "Build" means the value is generated into the app, so a change needs `bxAgents build`.

| Key | Where it lands in the built app | Applies |
|---|---|---|
| `provider`, `params`, `options`, `providers`, `profiles`, `defaultProfile`, `contextWindow`, `vision`, `embeddings`, `speech`, `transcription`, `image`, `security` | `config/bxai-settings.json`, merged into bx-ai at start (`ModuleSettings.apply`) | Start |
| `usage` | read from the live settings by `UsageRecorder` | Start (today read at build, to confirm) |
| `tui` | read at chat start | Start |
| `chat` | person's files only | Start |
| `model`, `profile` of a node | baked as an `aiModel(...)` literal | Build, unless settled in the architecture question below |
| `instructions`, `description` | baked literal or copied file | Build |
| `tools`, `toolOptions`, `subAgents` | baked into the factory and copied folders | Build |
| `mcpServers` | baked list, `${env}` resolved at start | Build for the list, Start for the values |
| `memory`, `checkpointer`, `notes`, `vault`, `skills` | baked into the factory | Build |
| `volumes`, `data` (except `home`) | baked into the factory and gateway code | Build |
| `agentApi`, `gatewaySession`, `routines`, `connectors`, `extensions` | generated routes, gateways, schedulers, copied extension folders | Build (`extensions` values: Start) |
| `environments` | resolved at build | Build |
| `name`, `data.home` | not overridable | none |

## API shape

```text
SettingsLayers( projectFile, globalFile, agentFile, flags = {} )
  .load()                  reads and validates the files, throws a message naming the file
  .merged( base )          the merge over a base struct, rules above
  .provenance()            { "model": { value, layer, file }, ... } one entry per leaf
  .fromPerson()            the provenance entries whose layer is a person file
  .buildOnly( merged )     keys the built app cannot apply, with their file
```

Build calls `merged()` inside `AgentConfigResolver`. Start calls the same class from the app's startup, through `ModuleSettings`.
