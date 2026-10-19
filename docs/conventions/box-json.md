---
title: box.json
icon: phosphor-duotone:package
summary: "Add your own packages: BoxLang modules such as bx-playwright, ColdBox modules, TestBox."
description: "Add your own packages: BoxLang modules such as bx-playwright, ColdBox modules, TestBox."
tags: [conventions, dependencies]
---

# box.json

BxAgents already bundles BX AI, ColdBox and the other modules agents use, so most agents need no `box.json`. Add one at the project root when an agent needs a package that is not bundled, for example `bx-playwright` for browser tools:

```json
{
  "name": "support-bot",
  "dependencies": {
    "bx-playwright": "*",
    "cbvalidation": "^4"
  },
  "devDependencies": {
    "testbox": "*"
  }
}
```

```bash
bxAgents install
```

`install` downloads each package from [ForgeBox](https://www.forgebox.io) (no `box` CLI needed), along with whatever those packages depend on. `build` runs it for you when `box.json` changed, so on a fresh checkout `bxAgents build` is enough.

## Where packages go

| Package type on ForgeBox | Installed in | Notes |
|---|---|---|
| BoxLang module (`boxlang-modules`) | `boxlang_modules/<module name>` | BoxLang loads this folder from the project root, so `chat`, `invoke` and `test` find the module. `build` copies it into `.build/app` so `serve` and a `.bxa` carry it too. |
| ColdBox module (`modules`) | `lib/modules/<name>` | `build` copies `lib/modules` into the app. |
| Anything else (TestBox, ...) | `lib/<name>` | Used locally; not copied into the app. |

Both `boxlang_modules/` and `lib/` are installed output: keep them out of version control.

Override a location with `installPaths` (one package) or `installPathConventions` (every package of a ForgeBox type). Both are folders inside the project:

```json
{
  "installPathConventions": { "modules": "lib/modules" },
  "installPaths": { "testbox": "lib/testbox/" }
}
```

## Version ranges

A dependency's value is a version range, or `forgebox:slug@range`.

| Range | Means |
|---|---|
| `*` | The newest release. A pre-release such as `1.0.0-snapshot` only when nothing else exists. |
| `1.2.3` | Exactly that version. Name a pre-release to get it: `1.0.0-snapshot`. |
| `^1.2.3` | `1.2.3` up to, not including, `2.0.0` (`^0.2.3` stops at `0.3.0`). |
| `~1.2.3` | `1.2.3` up to, not including, `1.3.0`. |
| `1`, `1.x`, `1.2` | Any release in that major, or major.minor. |
| `>=1.0.0 <2.0.0` | Comparators, all must hold. `^1 \|\| ^3` accepts either. |

Only ForgeBox packages are supported. A URL or Git source is an error that says so.

## What install does

- Picks the newest version in the range, downloads it and replaces the folder. A package already installed at that version is left alone.
- Installs what each package's own `box.json` depends on. Packages BxAgents bundles (BX AI, bx-sqlite, bx-ftp, bx-mail, bx-yaml, ColdBox, qb, cbsecurity, cbauth, cbmailservices) are not installed again for a dependency's sake. List one yourself to use your own version.
- `bxAgents install --production` skips `devDependencies`. `build` always does.
- Remembers what it installed in `.build/install.json`, so `build` does nothing when `box.json` has not changed and the installed folders are still there.

## Using an installed module

A module that registers tools, such as `bx-playwright`, is used by naming its tools in the agent's [`tools`](agent-yaml.md#tools). If the module is not installed, the error says to add it to `box.json` and run `bxAgents install`:

```yaml
tools:
  - "*@bxplaywright"
```

!!! note
    `box.json` is different from [`modules/`](modules.md), which holds ColdBox modules that are part of your project's own source.
