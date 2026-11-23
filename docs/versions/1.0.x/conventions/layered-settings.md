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

`<agent>` is the agent's [data home](data.md#the-data-home), which is `~/.bxagents/<name>` unless `data.home` or `BXAGENTS_HOME` says otherwise. `BXAGENTS_USER_CONFIG` names another file in place of the one for every agent (for tests).

```yaml
# ~/.bxagents/Agent.yml
model: ollama/qwen3              # replaces the author's model
tools+: [ "*@bxplaywright" ]     # adds to the author's tools
mcpServers+: [ https://mcp.example.com ]
volumes:
  notes: { path: ~/Notes, mode: rw }
instructions+: |
  Always answer in French.
```

## Precedence

First match wins:

1. the flag of one run
2. `~/.bxagents/<agent>/Agent.yml`
3. `~/.bxagents/Agent.yml`
4. the project: `environments.<env>`, `boxlang.json` and `miniserver.json`, then `Agent.yml`
5. the default

The person's files win over the author's `environments:` block too. The person who runs the agent has the last word.

## When it applies

Both, with one merge (`SettingsLayers`):

- **Build.** `bxAgents build` reads the person's files, merges, and generates from the result. This covers an agent shipped as a project folder that the person builds themselves. The build prints each setting that came from a person's file, with the file.
- **Start.** A built app (a zip or a container, no source on the machine) reads the person's two files as they are *when it starts* and merges them over the author's settings, which the build saved in `config/agent-settings.json`.

At start the files are merged over the *author's* settings, never over what the build baked. A `tools+:` that the build already applied would otherwise be applied twice. The result is the same when the files are unchanged, and the files on the machine decide when they are not.

!!! warning
    A build bakes the files of the machine it runs on. If you ship an agent, build it on a machine without your own `~/.bxagents/Agent.yml`, or look at the lines the build prints.

## Merge rules

| Written as | Result |
|---|---|
| a mapping | merges key by key with the layer below |
| a plain value | replaces |
| a list | replaces |
| `key+:` with a list | appends to the list below |
| `key+:` with text | appends to the text below, after a blank line (for `instructions`) |
| `key-:` with a list | removes those entries from the list below. A mapping entry, such as an MCP server, matches by its `name`, else its `url` |
| `key: ~` | removes the key |

Inside one file a key is applied in this order: the plain value, then `key-:`, then `key+:`. The markers work at any depth of a mapping. `+:` on a mapping is an error, and so is a marker with nothing after it. A `key-:` on a key nobody set does nothing.

## What a person's file may say

Everything except `name`, `data.home` and `environments`. `data.home` decides where the agent's own file lives, `name` decides which one that is, and `environments` is the author's way to vary a build.

`chat:` is valid only in the person's files, never in a project, so a project can never switch those on for a person. `extensions:` values layer the same way, and the person's win.

Unchanged: an unknown key is an error and the message lists the valid ones. Secrets stay as `${env.X}` or `${vault.X}` placeholders, never in the files. A bad value names the file, and a built app that finds a bad file at start refuses to start and names it.

## What a built app can change when it starts

Read from the generators and checked by running a built app with the mock provider.

| Key | At start |
|---|---|
| `model`, `profile`, `provider`, `params`, `options`, `providers`, `profiles`, `defaultProfile`, `contextWindow`, `vision`, `embeddings`, `speech`, `transcription`, `image`, `security`, `usage` | yes. The settings bx-ai reads are merged into its live settings, and the root agent's model is built from the result |
| `instructions`, `description` | yes. An `instructions.md` beside the agent is the author's `instructions`, so a person's `instructions:` replaces it and `instructions+:` adds to it |
| `tools`, `toolOptions`, `volumes`, `mcpServers` | yes. A tool must come from a module the machine has: the app fails at start and names it |
| `memory`, `checkpointer`, `notes`, `vault`, `skills`, `connectors` | yes |
| `extensions` values and `disable` | yes, in the chat and for the root agent's tools. The person's values win over the project's |
| `tui`, `chat` | yes, in the chat |
| `agentApi`, `gatewaySession`, `routines`, `subAgents`, `data` | **no.** They are generated into the app (routes, gateways, schedulers, the agent tree). The app says so at start, with the file, in the `bxagents-settings` log, and `/info` marks the line |
| `name`, `data.home`, `environments` | not overridable |

Only the root agent reads its person's files. A subagent keeps what the build baked, except for the `volumes` its file tools get, which follow the root's.

A scheduler in `schedules/*.bx` is code, not a setting, so a person's file cannot add one.

A class-based `Agent.bx` is code too. For it the settings bx-ai reads apply at start, but the agent itself is the class, so its own model, tools and the rest are not rebuilt from a person's file.

Removing a setting with `key: ~` takes it out of what the root agent is built from. bx-ai's own live settings only gain values at start, so a baked provider stays the default underneath.

## Seeing and changing it

- **`/info`** lists each setting that came from a person's file, one line each with the file, and marks the ones that need a rebuild. A file for every agent can widen every agent, so nothing is silent.
- **`/settings model ollama/qwen3`** writes any setting of the `Agent.yml` to the agent's own file, and **`--global`** writes it to the file for every agent. `/settings tools+ [ now@bxai ]` adds to the list, and `/settings tools+ reset` takes that entry out of the file. A name that is one of the chat's own settings (`header`, `theme`, `tools` ...) still changes the chat. To write an `Agent.yml` setting that shares such a name, use a marker (`tools+`) or a block (`params.temperature`). It edits only its own lines and keeps the rest of the file, comments included, and puts the file back when the result would not be valid. It applies the next time the agent starts.

## API shape

```text
SettingsLayers( globalFile = "", agentFile = "", flags = {} )
  .load()                   reads and checks the person's files, throws a message naming the file
  .merged( base, baseFile ) the base with the person's layers and the flags applied, rules above
  .files()                  [ { layer, file } ] the person's files that exist
  .provenance()             { "dotted.path": { op, layer, file, value } } for the last merge
  .fromPerson()             the provenance entries that came from a person's file, sorted by path
  .buildOnly()              the ones the built app can not apply at start

RuntimeSettings.start( file )   what a built app calls: merges, applies, logs, returns { config, changed, needsRebuild }
SettingsFileEditor.set / reset  what /settings calls
```

A mapping that nothing below had is one setting, so its path is where the file started writing (`agentApi`). Inside a mapping that exists, each leaf has its own path (`tui.header`).
