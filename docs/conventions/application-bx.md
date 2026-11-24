---
title: Application.bx
icon: phosphor-duotone:gear-six
summary: Your own root Application.bx, extending the class every build generates.
description: Your own root Application.bx, extending the class every build generates.
tags: [conventions, configuration]
---

# Application.bx

A project has its own `Application.bx` at its root. It is where the settings and lifecycle hooks of your app live. It **extends** a class BxAgents generates on every build, which holds the base:

```javascript
// Application.bx
class extends="bxagents.Application" {

}
```

`bxAgents new` writes this file. A project without one gets the thin class above, so older projects keep building. `bxagents.Application` is the name you write; the build points it at the generated class (`app.bxagents.Application`, below), so a file written for an older BxAgents needs no change.

## Where it ends up

The built app follows the [ColdBox BoxLang template](https://github.com/coldbox-templates/boxlang): the web root is `.build/public` and the code is `.build/app`. The Application.bx the server loads is `.build/public/Application.bx`. It is **derived from the template's own `public/Application.bx` and changed to suit**, and it ends as a thin class that extends the generated base, `.build/app/bxagents/Application.bx`:

```javascript
// .build/public/Application.bx (yours, or this when the project has none)
class extends="app.bxagents.Application" {
}
```

What is derived from the template's file, in the template's own terms, and lives in the generated base: the `COLDBOX_APP_ROOT_PATH`, `COLDBOX_APP_MAPPING` and `COLDBOX_WEB_MAPPING` settings (`/app` and `/`), the call of `new coldbox.system.Bootstrap( ... )` followed by `loadColdbox()` in `onApplicationStart()`, and `onRequestStart()` handing the request to the bootstrap.

What is changed:

- the lifecycle is not in the web root: it is in the base, so `public/` holds a thin class and the logic is not served;
- the app's `name`, sessions, the web UI's datasource and `this.schedulers` are generated from the project;
- the data home, the logs and bx-ai's settings are set up before ColdBox loads, and the tools, MCP servers, gateways and interceptors are registered once it has;
- the template's `onApplicationEnd()`, `onSessionStart()`, `onSessionEnd()` and `onMissingTemplate()` are not carried (a class that extends the base can define them);
- three hooks are added, `before()`, `after()` and `beforeRequest()`.

The template's own file is still in the module (it is vendored, see `templates/coldbox-boxlang/VERSION`) and is what the build lays out first; the generator then replaces it.

## What the generated base does

On every build the base class is written into `.build/app/bxagents/` and sets up:

- the app `name`, sessions (on when there is a web UI) and the web UI's database;
- the data home, the logs, and bx-ai's settings (applied before ColdBox loads, because the agents are built while it loads);
- ColdBox, started from `onApplicationStart()`;
- tools, MCP servers, gateways and [interceptors](interceptors.md), registered once ColdBox has loaded;
- `this.schedulers`, listing the project's [schedules/](schedules.md) as `app.schedules.<Name>`.

It starts with a comment saying it is generated. Do not edit it: the next build overwrites it.

## Override a hook, or add a setting

Your class loads after the base, so a setting you assign wins, and a method you define replaces the base's. To add to a hook instead of replacing it, call `super`:

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

The three hooks:

| Hook | Runs |
|---|---|
| `before()` | at the start of the app's start, before ColdBox loads: the data home, the logs, bx-ai's settings |
| `after()` | once ColdBox has loaded: tools, MCP servers, gateways, interceptors, the web store |
| `beforeRequest()` | at the start of every request, before ColdBox gets it (it waits for a request body the server has not finished reading) |

!!! warning
    Replacing a hook without calling `super` removes what it holds (with `before()`, no data home and no bx-ai settings; with `after()`, no tools or gateways). Call the `super` method unless that is what you mean.

You can still override `onApplicationStart()` and `onRequestStart()` themselves (your class is the Application) and call `super.onApplicationStart()`; the hooks are the lighter way to add to them.

## The `bxagents` name

`bxagents.Application` and `bxagents.Scheduler` are the names you write. In the built app they are the classes under `.build/app/bxagents/`, reached through the template's `/app` mapping: `app.bxagents.Application` and `app.bxagents.Scheduler`. The build rewrites the `extends` of your Application.bx and of your schedulers, so the files they extend are copied with the app and nothing depends on the module being installed where the app runs.

The generated classes exist after a build. Before the first `bxAgents build`, an IDE cannot follow `bxagents.Application`; the class itself is not in your project.

## Paths

The base lives one folder down, so it resolves paths from the app folder, not from its own location. The web root `/` is `.build/public` now, so `expandPath( "/" )` is **not** the app: use `expandPath( "/app" )` (the template's mapping) for a file in the app, for example `expandPath( "/app/config/agent-settings.json" )`.
