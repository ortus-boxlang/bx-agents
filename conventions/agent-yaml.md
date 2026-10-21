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
| `tools` | list of strings | Module tools this agent gets, as `item@module` or `*@module`. See [Tools](#tools). |
| `toolOptions` | mapping | Options for a module's tools, keyed by module name. See [Tool options](#tool-options). |
| `subAgents` | list of strings | Names of sibling folders under the root project's `subagents/`. See [subagents/](subagents.md). |
| `mcpServers` | list | MCP servers - each entry a URL string, a mapping with `url` and the credentials the server wants (`token`, `headers`, `timeout`), or a mapping with `command` for a server that runs as a program (`env`, `cwd`, `prefix`, `toolFilter`). See [mcp/](mcp.md). |
| `security` | mapping | Forwarded verbatim into the generated app's `bxai` module settings; bx-ai's own `SecurityDirector` turns it into guardrail middleware. |
| `memory` | string or mapping | The agent's conversation memory. A bare string is the type (`cache`); a mapping is `{ type, ...config }` and is passed through to `aiMemory()`. |
| `checkpointer` | mapping | `{ type: cache\|file\|jdbc, ...config }`. Defaults to `{ type: cache }` if omitted. |
| `gatewaySession` | mapping | `{ policy, maxQueueDepth }`, both optional. See [Agent.bx](agent-bx.md) for the values; they are identical. |
| `agentApi` | mapping | `{ enabled, tokenEnvVar }`, both optional. See [The always-on agent route](agent-bx.md#the-always-on-agent-route). |
| `notes` | mapping | Short notes the agent keeps about the user and its own work. `notes: {}` turns them on with the defaults. See [Notes](#notes). |
| `environments` | mapping | Per-environment overrides. See [Environments](#environments). |

These are the same settings an `Agent.bx`'s `configure()` returns, so every behavior documented for them applies unchanged.

!!! warning
    An **unknown key is an error**, and the message lists the valid ones. A typo such as `modle:` would otherwise do nothing, quietly. Settings that arrive in later releases (for example `mcp`) are rejected the same way until they exist, rather than being silently ignored. Anything free-form belongs in an `Agent.bx`.

A value of the wrong type (a text where a list belongs, say) and an empty value (`model:` with nothing after it) are errors too.

## Tools

An agent gets its own `tools/` folder, and nothing else, unless it asks. The tools other modules provide (bx-ai's built-ins, `bx-playwright`, ...) are a catalog: they are available, but an agent only has the ones its `tools:` list names. Every entry is `item@module`, the key bx-ai keeps them under:

```yaml
name: support
model: openai/gpt-5
tools:
  - now@bxai            # one tool from one module
  - "*@bxplaywright"    # every tool that module registered (quote it: * starts a YAML alias)
```

| Entry | Gives the agent |
|---|---|
| `item@module` | that one tool |
| `*@module`, or `@module` | every tool the module registered |

- **Default.** No `tools:` means only the agent's own `tools/`. This holds for every [subagent](subagents.md) too: each one has its own `tools/` and its own `tools:`.
- **Naming a module validates it.** If the module is not installed, or has no such tool, `build` and the generated app fail with a message that lists what the module does provide.
- **A bare name is an error.** `now` fails with a hint to write `now@bxai`. bx-ai would otherwise resolve it to whichever module registered a tool called `now` first.
- **Own tools win.** If a tool in the agent's `tools/` has the same name as a module tool it selected, the own tool is used and the module tool is left out, with a warning in the `bxagents-tools` log.
- **Each tool once.** Listing a tool twice, or listing it along with a `*@module` that covers it, attaches it once.

### Tool options

`toolOptions` configures the tools of a module, keyed by **module name**. Two modules take options: `bxai`, for its [file tools](#file-tools), and `bxplaywright`, whose options are those of bx-playwright's `playwright()`: a `profile` (a name, or a list of names) and settings such as `headless`, `baseURL`, `browser`, `viewport` or `device`.

```yaml
tools:
  - "*@bxplaywright"
toolOptions:
  bxplaywright:
    profile: mobile
    headless: false
    baseURL: ${env.APP_URL:http://localhost:8080}
```

- **Each agent gets its own browser.** The browser tools bx-playwright registers share one browser for the whole app. An agent that lists `bxplaywright` tools does not get those: it gets a fresh set built for it alone (`playwright( profile, options ).aiTools()`), so a root agent and its subagent never drive the same page. The browser opens when one of its tools is first used, not at startup. `*@bxplaywright` works with no `toolOptions` at all and uses the module's own settings.
- **Environment values.** `${env.NAME}` and `${env.NAME:default}` are replaced with the environment variable when the app starts, never at build time, so a secret or a per-machine setting stays out of the project. A variable that is not set and has no default fails the agent at startup, naming it.
- **Checked at build time.** A key that is not a module the agent lists tools from, a module that takes no options, a key written as `item@module`, or an option bx-playwright does not have (the message lists the valid ones) is a `build` error.
- The module-wide settings (where browsers are installed, the default profile) stay in bx-playwright's own settings, not here.

### File tools

bx-ai has 19 file tools (`readFile`, `writeFile`, `listDirectory`, `searchFiles`, `deleteFile`, `zipFiles` and more), but it registers none of them. In BxAgents an agent gets them by listing them **and** naming the folders they may use in `toolOptions.bxai.allowedPaths`:

```yaml
tools:
  - readFile@bxai
  - listDirectory@bxai
toolOptions:
  bxai:
    allowedPaths:
      - tmp                  # the system temp folder
      - cwd                  # the folder the agent is started from
      - /data/reports        # or an absolute path
```

- **Each agent gets its own tools, locked to its own folders.** A path outside them is refused (`..` tricks included), and the tools are never put in the shared registry where another agent could pick them up.
- **No folders, no tools.** The tools exist only when `allowedPaths` is set, and an empty list is a build error, because bx-ai reads an empty list as "any path". Listing `readFile@bxai` with no `allowedPaths` fails with a message saying so.
- `now@bxai`, `httpGet@bxai`, `webSearch@bxai` and the rest of bx-ai's registered tools keep working as before, with or without `toolOptions.bxai`. `*@bxai` includes the file tools once `allowedPaths` is set.
- An entry may be `${env.NAME}` to take a folder from the environment.
- `bxAgents new` can write all of this for you: see [the new wizard](../guides/new-wizard.md).

## Notes

An agent can keep short notes: things about the user ("prefers short answers") and things about its own work ("the repo uses Gradle"). They are off until the block is there:

```yaml
notes: {}
```

```yaml
notes:
  provider: sqlite        # built in. Or a class implementing INotesProvider
  user:  { limit: 1400 }  # characters of user notes that go into the prompt
  agent: { limit: 2200 }  # characters of agent notes
  tool: true              # give the agent the remember and forget tools (default true)
  approveForget: true     # a person approves what the agent forgets (default true)
```

| Key | Default | Notes |
|---|---|---|
| `provider` | `sqlite` | `sqlite` keeps one row per note in the [shared chat database](web-ui.md#the-sqlite-store). Any other value is the name of a class that implements `INotesProvider` and is created with `( config, agentName )`, for a notes service of your own. |
| `user.limit` | 1400 | Characters of notes about the user. Each user has their own. |
| `agent.limit` | 2200 | Characters of notes about the agent's work. Shared by everyone who talks to it. |
| `tool` | `true` | `remember` (save or replace a note) and `forget` (remove one). Without them the notes are read-only for the agent and a person manages them. |
| `approveForget` | `true` | A run that wants to `forget` stops for [approval](../cli-reference.md#chat), like any tool that needs it. Saving a note needs none. |

How it works:

- Both scopes go into the system prompt as short lists, oldest first, within their limits. They are read once per conversation, so the prompt stays the same turn to turn (a provider's prompt cache keeps working) and a note saved now shows from the next conversation.
- A note is one line of at most 500 characters. Nothing is dropped silently: a note that does not fit the limit is refused, and the agent is told how full the notes are so it can replace or forget an older one.
- **Who a user is**: in `bxAgents chat` it is the operating system user (`--user=NAME` changes it); on a server it is the name of the [access token](agent-bx.md#access-tokens-for-a-deployed-agent) the caller used, or `api` when the route is open. The agent scope belongs to the agent's `name`.
- The terminal chat, the web chat and the server share one file, `data/chat.db` (see [the SQLite store](web-ui.md#the-sqlite-store)).

Manage them yourself with `/remember` and `/notes` in [`chat`](../cli-reference.md#chat), with [`bxAgents notes`](../cli-reference.md#notes) from a shell, or over HTTP through the [run-control routes](agent-bx.md#run-control).

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
