# Installation

BX Agents is a BoxLang module. It needs three things on the machine that runs it:

1. A [BoxLang](https://boxlang.io) runtime.
2. The `bx-ai` BoxLang module (BX Agents generates code that calls it - it doesn't vendor it).
3. BX Agents itself.

{% hint style="info" %}
`serve` additionally needs the standalone [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) binary on `PATH`. `build`, `chat`, `package`, `inspect`, `clean`, and `new` don't need it.
{% endhint %}

## Install BoxLang

Follow the [official BoxLang installation guide](https://boxlang.ortusbooks.com/getting-started/installation). The quick installer also sets up `~/.boxlang/bin` on your `PATH`, which is where module-provided executables (like BX Agents' own `bxAgents` command, below) land.

## Install bx-ai and BX Agents

```bash
install-bx-module bx-ai
install-bx-module bx-agents
```

This fetches both modules into your BoxLang modules directory (`~/.boxlang/modules` by default, or `boxlang_modules/` with `--local`).

## The `bxAgents` command

BX Agents declares a native executable in its `box.json`:

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

## Verify it worked

```bash
bxAgents --version
bxAgents --help
```

`--help` lists all 8 verbs (`new`, `build`, `serve`, `chat`, `package`, `deploy`, `inspect`, `clean`) with a one-line summary of each. See [Quick Start](quick-start.md) to scaffold your first agent.
