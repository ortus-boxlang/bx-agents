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
| `key+:` with text | appends to the text below, after a blank line (for `instructions`) |
| `key-:` with a list | removes those entries from the list below |
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
tools-: [ now@bxai ]       # removes one entry
instructions+: |           # appends to the author's instructions
  Always answer in French.
```

A `key+:` or `key-:` on a key the lower layers do not set acts as a plain set (for `+:`) or does nothing (for `-:`). Using `+:` on a mapping is an error.

## Which keys, and where

Everything except `name` and `data.home` can be overridden (`data.home` decides where the agent's own file lives). Both person files may add tools, `mcpServers` and `volumes`, and remove entries with `key-:`.

`chat:` is valid only in the person's files. In a project it is an error, so a project can never switch those on for a person. `extensions:` values layer the same way.

Only what `Agent.yml` can say is overridable. A `schedules/*.bx` scheduler is a code file, so a person's file cannot add one.

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
| `volumes` | baked into `toolOptions` by `withVolumes`; made a read of the merged struct | Start |
| `data` (except `home`) | baked into the factory and gateway code | Build |
| `connectors` | `ConnectorWiring.attach` with a literal; the catalog is read where the app runs. The call is emitted always, so start can turn connectors on | Start |
| `agentApi`, `gatewaySession`, `routines`, `extensions` | generated routes, gateways, schedulers, copied extension folders | Build (`extensions` values: Start) |
| `environments` | resolved at build | Build |
| `name`, `data.home` | not overridable | none |

## API shape

```text
SettingsLayers( globalFile = "", agentFile = "", flags = {} )
  .load()                   reads and checks the person's files, throws a message naming the file
  .merged( base, baseFile ) the base with the person's layers and the flags applied, rules above
  .files()                  [ { layer, file } ] the person's files that exist
  .provenance()             { "dotted.path": { op, layer, file, value } } for the last merge
  .fromPerson()             the provenance entries that came from a person's file, sorted by path
  .buildOnly()              the ones the built app can not apply at start
```

The base is the author's `Agent.yml` at build and the baked settings at start, so the project file is not a parameter. A mapping that nothing below had is one setting, so its path is where the file started writing (`agentApi`); inside a mapping that exists, each leaf has its own path (`tui.header`).

Build calls `merged()` inside `AgentConfigResolver`. Start calls the same class from the app's startup, through `ModuleSettings`.
