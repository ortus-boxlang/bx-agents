---
title: Installation
icon: phosphor-duotone:package
summary: The three things BxAgents needs on the machine that runs it.
description: The three things BxAgents needs on the machine that runs it.
tags: [getting-started, setup]
---

# Installation

BxAgents is a BoxLang module. It needs two things on the machine that runs it:

1. A [BoxLang](https://www.boxlang.io) runtime.
2. BxAgents itself. It bundles everything else it needs: `bx-ai`, `bx-sqlite`, `bx-ftp` and `bx-mail` as nested BoxLang modules, plus ColdBox, `qb`, `cbsecurity`, `cbauth` and `cbmailservices` for the apps it generates. There is nothing else to install.

!!! info
    BxAgents needs BoxLang **1.18.0 or later**, which supports the nested modules it bundles.

!!! info
    `serve` additionally needs the standalone [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) binary on `PATH`. `build`, `chat`, `package`, `inspect`, `clean`, and `new` don't need it.

::: stepper
::: step "Install BoxLang"
Follow the [official BoxLang installation guide](https://boxlang.ortusbooks.com/getting-started/installation). The quick installer also sets up `~/.boxlang/bin` on your `PATH`, which is where module-provided executables (like BxAgents' own `bxAgents` command, below) land.
:::
::: step "Install BxAgents"
```bash
install-bx-module bx-agents
```

This fetches the module, with its bundled dependencies, into your BoxLang modules directory (`~/.boxlang/modules` by default, or `boxlang_modules/` with `--local`).
:::
::: step "Verify it worked"
```bash
bxAgents --version
bxAgents --help
```

`--help` lists all 12 verbs (`new`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`, `inspect`, `clean`, `hash-password`, `doctor`) with a one-line summary of each.
:::
:::

## The `bxAgents` command

BxAgents declares a native executable in its `box.json`:

```json
"boxlang": { "moduleName": "bxagents", "executable": "bxAgents" }
```

The installer turns that into a `bxAgents` wrapper script on your `PATH`, so you can run:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

instead of the longer form:

```bash
boxlang module:bxagents new my-agent --model=openai/gpt-5
```

Both are equivalent - every verb dispatches through the same `ModuleConfig.bx main(args)` entry point either way. This doc uses the short `bxAgents <verb>` form throughout.

## What is bundled

The module zip carries its own dependencies, pinned to the stable releases it was built with. A bug fix in one of them ships as a BxAgents patch release, so nobody installs or updates them by hand.

| Where | What | Used for |
|---|---|---|
| `modules/` (nested BoxLang modules) | `bx-ai`, `bx-sqlite`, `bx-ftp`, `bx-mail` | The agent runtime, the web UI's SQLite store, the `ftp`/`sftp` deploy targets, the email gateway |
| `lib/` (ColdBox runtime) | ColdBox, `qb`, `cbsecurity`, `cbauth`, `cbmailservices` | Copied into every app `build` generates |

`serve` points the served app at the same bundled modules.

### Adding your own libraries

Put extra ColdBox libraries in a `lib/` folder in your project, using the same layout as the bundled one:

```text
my-agent/
  lib/
    coldbox/          # replaces the bundled ColdBox
    modules/
      cbvalidation/   # added next to the bundled modules
      qb/             # replaces the bundled qb
```

`build` copies the bundled set first and your `lib/` second, so yours wins.

## Tab completion

The module ships tab completion for `bxAgents` (and `bxagents`) in three shells. It completes verbs, flags, the `--template` and `--target` values, and project folders.

| Shell | Setup |
|---|---|
| bash, zsh | Automatic. `install-bx-module` copies `completions/bxAgents.bash` to `~/.boxlang/completions/` and BVM sources it in new sessions. Without the installer: `source <module folder>/completions/bxAgents.bash`. |
| fish | `cp <module folder>/completions/bxAgents.fish ~/.config/fish/completions/` |
| PowerShell | Add `. "<module folder>\completions\bxAgents.ps1"` to your `$PROFILE`. |

The scripts in `completions/` are generated from the CLI's own verb tables, so they cannot drift from the verbs. After changing a verb or a flag in `ModuleConfig.bx`, regenerate them with `tools/generate-completions.bxs` (add `--check` to only verify); the spec suite fails if they are stale.

See [Quick Start](quick-start.md) to scaffold your first agent.
