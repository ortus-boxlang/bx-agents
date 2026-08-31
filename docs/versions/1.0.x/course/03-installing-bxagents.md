---
title: "Lesson 3: Installing BxAgents"
icon: phosphor-duotone:package
summary: Install BoxLang, bx-ai and BxAgents, and verify the bxAgents command works.
description: Install BoxLang, bx-ai and BxAgents, and verify the bxAgents command works.
tags: [course, getting-started]
---

# Installing BxAgents

BxAgents is a BoxLang module. It needs three things on the machine that runs it:

1. A [BoxLang](https://boxlang.io) runtime.
2. The `bx-ai` BoxLang module (BxAgents generates code that calls it - it doesn't
   vendor it).
3. BxAgents itself.

::: stepper
::: step "Install BoxLang"
Follow the [official BoxLang installation guide](https://boxlang.ortusbooks.com/getting-started/installation).
The quick installer also sets up `~/.boxlang/bin` on your `PATH`, which is where
module-provided executables (like BxAgents' own `bxAgents` command) land.
:::
::: step "Install bx-ai and BxAgents"
```bash
install-bx-module bx-ai
install-bx-module bx-agents
```

This fetches both modules into your BoxLang modules directory (`~/.boxlang/modules`
by default, or `boxlang_modules/` with `--local`).
:::
::: step "Verify it worked"
```bash
bxAgents --version
bxAgents --help
```

`--help` lists all 10 verbs (`new`, `build`, `test`, `serve`, `chat`, `invoke`,
`package`, `deploy`, `inspect`, `clean`) with a one-line summary of each. You'll use
most of them in this course.
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
- **`deploy`**'s `ftp`/`sftp` targets ([Lesson 20](20-packaging-deploying-and-wrapping-up.md))
  need the [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp) module
  (`install-bx-module bx-ftp`) - a genuine runtime dependency, not vendored, same as
  `bx-ai`.

Neither is required to follow along with `build`, `chat`, `test`, `package`,
`inspect`, `clean` or `new`.

See [Installation](../getting-started/installation.md) for the full reference page.

Next: [Lesson 4 - Scaffolding Your First Agent](04-scaffolding-your-first-agent.md)
