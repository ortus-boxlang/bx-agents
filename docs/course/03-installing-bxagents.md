---
title: "Lesson 3: Installing BxAgents"
icon: phosphor-duotone:package
summary: Install BoxLang, bx-ai and BxAgents, and verify the bxAgents command works.
description: Install BoxLang, bx-ai and BxAgents, and verify the bxAgents command works.
tags: [course, getting-started]
---

# Installing BxAgents

BxAgents is a BoxLang module. It needs two things on the machine that runs it:

1. A [BoxLang](https://www.boxlang.io) runtime.
2. BxAgents itself, which bundles everything else it needs (`bx-ai`, `bx-sqlite`,
   `bx-ftp`, `bx-mail`, `bx-yaml`, and ColdBox with its modules for the
   apps it generates). BoxLang **1.17.0 or later** is required.

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

`--help` lists all 12 verbs (`new`, `build`, `test`, `serve`, `chat`, `invoke`,
`package`, `deploy`, `inspect`, `clean`, `hash-password`, `doctor`) with a one-line
summary of each. You'll use most of them in this course.
:::
:::

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

- **`serve`** ([Lesson 8](08-talking-to-your-agent.md)) additionally needs the
  standalone [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
  binary on `PATH`.

`serve` is not required to follow along with `build`, `chat`, `test`, `package`,
`inspect`, `clean` or `new`.

See [Installation](../getting-started/installation.md) for the full reference page.

Next: [Lesson 4 - Scaffolding Your First Agent](04-scaffolding-your-first-agent.md)
