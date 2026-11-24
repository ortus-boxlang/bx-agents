---
title: Application.bx
icon: phosphor-duotone:gear-six
summary: Your own root Application.bx, extending the class every build generates.
description: Your own root Application.bx, extending the class every build generates.
tags: [conventions, configuration]
---

# Application.bx

A project has its own `Application.bx` at its root. It is where the settings and lifecycle hooks of your app live. It **extends** a class BxAgents generates on every build, which holds the wiring:

```javascript
// Application.bx
class extends="bxagents.Application" {

}
```

`bxAgents new` writes this file. A project without one gets the plain wiring, so older projects keep building. `bxagents.Application` is the name you write; the build points it at the generated class (`app.bxagents.Wiring` or `app.bxagents.Application`, below), so a file written for an older BxAgents needs no change.

## Where it ends up

The built app follows the [ColdBox BoxLang template](https://github.com/coldbox-templates/boxlang): the web root is `.build/public` and the code is `.build/app`. The Application.bx the server loads is `.build/public/Application.bx`. It comes in two variants, chosen when BxAgents is built (the owner's choice, one line in `ColdBoxAppGenerator.defaultVariant()`), and what you can customize is the same in both: **settings** and the three **hooks**.

### The two variants

| | `template` (the default) | `stub` |
|---|---|---|
| `.build/public/Application.bx` | the template's own file, byte for byte, plus four fenced blocks | `class extends="app.bxagents.Application" {}`, or your own file |
| the wiring | `.build/app/bxagents/Wiring.bx` | `.build/app/bxagents/Application.bx` (the base class) |
| your root `Application.bx` | `.build/app/bxagents/UserApplication.bx`, `extends="app.bxagents.Wiring"`, created by the template's file | `.build/public/Application.bx`, `extends="app.bxagents.Application"` |
| who boots ColdBox | the template's `onApplicationStart()` | the base class's `onApplicationStart()` |
| lifecycle methods you may define | none (`onApplicationStart`, `onRequestStart`, `onSessionStart` ... belong to the template's file) | all of them: your class is the Application |
| to choose it | the default | `BXAGENTS_APPLICATION_VARIANT=stub` when you build |

In the `template` variant the template's file is **only added to**, never edited: each block is fenced by `// >>> BXAGENTS` and `// <<< BXAGENTS` and a person comparing the file with the template sees four small additions and nothing else: the wiring is created and its settings copied onto `this`, `before()` runs first in `onApplicationStart()`, `after()` runs right after `loadColdbox()`, and `beforeRequest()` runs first in `onRequestStart()`.

## What the generated wiring does

On every build the wiring class is written into `.build/app/bxagents/` and sets up:

- the app `name`, sessions (on when there is a web UI) and the web UI's database;
- the data home, the logs, and bx-ai's settings (applied before ColdBox loads, because the agents are built while it loads);
- tools, MCP servers, gateways and [interceptors](interceptors.md), registered once ColdBox has loaded;
- `this.schedulers`, listing the project's [schedules/](schedules.md) as `app.schedules.<Name>`.

It starts with a comment saying it is generated. Do not edit it: the next build overwrites it.

## Override a hook, or add a setting

Your class loads after the wiring's, so a setting you assign wins, and a method you define replaces the wiring's. To add to a hook instead of replacing it, call `super`:

```javascript
// Application.bx
class extends="bxagents.Application" {

	this.sessionTimeout = createTimeSpan( 0, 4, 0, 0 )

	// once ColdBox has loaded (and the tools, gateways and interceptors are registered)
	function after() {
		super.after()
		application.startedAt = now()
	}

}
```

The three hooks, the same in both variants:

| Hook | Runs |
|---|---|
| `before()` | at the start of the app's start, before ColdBox loads: the data home, the logs, bx-ai's settings |
| `after()` | once ColdBox has loaded: tools, MCP servers, gateways, interceptors, the web store |
| `beforeRequest()` | at the start of every request, before ColdBox gets it (it waits for a request body the server has not finished reading) |

!!! warning
    Replacing a hook without calling `super` removes the wiring it holds (with `before()`, no data home and no bx-ai settings; with `after()`, no tools or gateways). Call the `super` method unless that is what you mean.

!!! note "Older files"
    A file that defines `onApplicationStart()` or `onRequestStart()` and calls `super.onApplicationStart()` is what an older BxAgents documented. In the `template` variant those methods belong to the template's file, so the build warns that they are not called: move the code to `before()`, `after()` or `beforeRequest()`, or build with the `stub` variant, where they work as before.

## The `bxagents` name

`bxagents.Application` and `bxagents.Scheduler` are the names you write. In the built app they are the classes under `.build/app/bxagents/`, reached through the template's `/app` mapping: `app.bxagents.Wiring`, `app.bxagents.Application` and `app.bxagents.Scheduler`. The build rewrites the `extends` of your Application.bx and of your schedulers, so the files they extend are copied with the app and nothing depends on the module being installed where the app runs.

The generated classes exist after a build. Before the first `bxAgents build`, an IDE cannot follow `bxagents.Application`; the class itself is not in your project.

## Paths

The wiring lives one folder down, so it resolves paths from the app folder, not from its own location. The web root `/` is `.build/public` now, so `expandPath( "/" )` is **not** the app: use `expandPath( "/app" )` (the template's mapping) for a file in the app, for example `expandPath( "/app/config/agent-settings.json" )`.
