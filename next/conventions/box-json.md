---
title: box.json
icon: phosphor-duotone:package
summary: "List the extra packages your agent needs, such as bx-playwright. You install them; the build carries them into the app."
description: "List the extra packages your agent needs, such as bx-playwright. You install them; the build carries them into the app."
tags: [conventions, dependencies]
---

# box.json

BxAgents already bundles BX AI, ColdBox and the other modules agents use, so most agents need nothing more. When an agent needs a package that is not bundled, for example `bx-playwright` for browser tools, list it in a `box.json` at the project root and install it yourself:

```json
{
  "name": "support-bot",
  "dependencies": {
    "bx-playwright": "*"
  },
  "devDependencies": {
    "testbox": "*"
  }
}
```

BxAgents never installs anything. Install packages the way you normally do, with CommandBox (`box install`) or the BoxLang binary (`install-bx-module bx-playwright --local`), from the project root. Commit `box.json`; keep the installed folders out of version control.

## Where installed packages go

| What | Folder in the project | What `build` does with it |
|---|---|---|
| BoxLang modules (`bx-playwright`, ...) | `boxlang_modules/` | BoxLang loads this folder from the project root, so `chat`, `invoke` and `test` find them. `build` copies it to `.build/app/boxlang_modules`, so `serve` and a packaged `.bxa` carry it too. |
| ColdBox libraries and modules | `lib/coldbox`, `lib/modules/<name>` | Copied into the app over the bundled ones, so a project can add or override a library. |
| Test tools (TestBox, ...) | `lib/<name>` or `tests/` | Not copied: the app does not need them. |

## Development dependencies

A BoxLang module that is only in `devDependencies` is left out of `.build/app`, and the build says which. A module is matched to `box.json` by the `slug` in its own `box.json`, or by its folder name (`bxplaywright` for `bx-playwright`). One listed in both sections is kept.

## Using an installed module

A module that registers tools, such as `bx-playwright`, is used by naming its tools in the agent's [`tools`](agent-yaml.md#tools). If the module is not installed, the error says how to install it:

```yaml
tools:
  - "*@bxplaywright"
```

!!! note
    `box.json` is different from [`modules/`](modules.md), which holds ColdBox modules that are part of your project's own source.
