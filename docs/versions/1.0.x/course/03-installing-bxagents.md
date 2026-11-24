---
title: "Installing BxAgents"
icon: phosphor-duotone:package
summary: Install BoxLang and BxAgents, and verify the bxAgents command works.
description: Install BoxLang and BxAgents, and verify the bxAgents command works.
tags: [course, getting-started]
---

# Installing BxAgents

BxAgents is a BoxLang module. It needs two things on the machine that runs it:

1. A [BoxLang](https://www.boxlang.io) runtime.
2. BxAgents itself, which bundles everything else it needs (`bx-ai`, `bx-sqlite`,
   `bx-ftp`, `bx-mail`, `bx-yaml`, `bx-markdown`, and ColdBox with its modules for the
   apps it generates). BoxLang **1.18.0 or later** is required.

::: stepper
::: step "Install BoxLang"
Follow the [official BoxLang installation guide](https://boxlang.ortusbooks.com/getting-started/installation).
The quick installer also sets up `~/.boxlang/bin` on your `PATH`, which is where
module-provided executables (like BxAgents' own `bxAgents` command) land.
:::
::: step "Install BxAgents"
```bash
install-bx-module bx-agents
```

This fetches the module, with its bundled dependencies, into your BoxLang modules directory (`~/.boxlang/modules`
by default, or `boxlang_modules/` with `--local`).
:::
::: step "Verify it worked"
```bash
bxAgents --version
bxAgents --help
```

`--help` lists all 29 verbs (`new`, `add`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`, `inspect`, `clean`, `hash-password`, `token`, `users`, `notes`, `vault`, `connect`, `connectors`, `sessions`, `routines`, `stats`, `models`, `doctor`, `skills`, `extensions`, `data`, `logs`, `backup`, `restore`) with a one-line summary of each. You'll use most of them in this course.
:::
:::

Check the command is there:

```bash title="Terminal 2"
bxAgents --version
```

```text title="You see"
bxAgents v<anything>
```

## The `bxAgents` command

BxAgents declares a native executable in its `box.json`:

```json
"boxlang": { "moduleName": "bxagents", "executable": "bxAgents" }
```

The installer turns that into a `bxAgents` wrapper script on your `PATH`. `bxAgents new
my-agent --model=openai/gpt-5` is shorthand for the longer, always-equivalent form:

```bash
boxlang module:bxagents new my-agent --model=openai/gpt-5
```

This course uses the short `bxAgents <verb>` form throughout.

## Optional, for later lessons

- **`serve`**, **`chat --server`** and **`invoke --server`** ([Talking to Your Agent](08-talking-to-your-agent.md))
  additionally need the standalone [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
  binary on `PATH`.

None of them is required to follow along with `build`, plain `chat`, `test`, `package`,
`inspect`, `clean`, `new` or `doctor`. After installing, `bxAgents doctor` inside a project
checks the BoxLang version, whether `bx-ai` is loaded, whether the project validates and
which environment variables it needs are not set.

## Two things to know before you start

- **Flag values do not contain spaces.** BoxLang 1.19.0's launcher splits every quoted argument at its spaces, so
  `--message="Where is my order"` does not arrive as one value. The course writes `--message=refund` and types
  sentences into the chat instead. See [Quoting flag values](../cli-reference.md#quoting-flag-values).
- **What an agent remembers lives outside the project.** Conversations, notes, tokens, the vault, logs and backups
  are kept in the agent's *data home*, `~/.bxagents/<agent name>/` (the environment variable `BXAGENTS_HOME` moves it).
  It is created the first time it is needed, and [Logs, Usage and Backups](operating-it.md) is about looking after it.

See [Installation](../getting-started/installation.md) for the full reference page.

Next: [A Model That Needs No Key](practice-model.md)
