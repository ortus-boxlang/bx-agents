---
title: Application.bx
icon: phosphor-duotone:gear-six
summary: Your own root Application.bx, extending the class every build generates.
description: Your own root Application.bx, extending the class every build generates.
tags: [conventions, configuration]
---

# Application.bx

A project has its own `Application.bx` at its root. It is the file the runtime loads, so the settings and lifecycle hooks of your app live here. It **extends** a class BxAgents generates on every build, which holds the wiring:

```javascript
// Application.bx
class extends="bxagents.Application" {

}
```

`bxAgents new` writes this file. Build copies it into the generated app as it is. A project without one gets exactly this file generated, so older projects keep building.

## What the generated base does

On every build `bxagents/Application.bx` is written into `.build/app/` and sets up:

- the app `name`, sessions (on when there is a web UI) and the web UI's database;
- ColdBox, started from `onApplicationStart()`, with the bx-ai settings applied first;
- tools, MCP servers, gateways and [interceptors](interceptors.md), registered at startup;
- `this.schedulers`, listing the project's [schedules/](schedules.md).

It starts with a comment saying it is generated. Do not edit it: the next build overwrites it.

## Override a hook, or add a setting

Your class loads after the base's, so a setting you assign wins, and a method you define replaces the base's. To add to a hook instead of replacing it, call `super`:

```javascript
// Application.bx
class extends="bxagents.Application" {

	this.sessionTimeout = createTimeSpan( 0, 4, 0, 0 )

	function onApplicationStart() {
		var started = super.onApplicationStart()
		application.startedAt = now()
		return started
	}

}
```

!!! warning
    Replacing `onApplicationStart()` or `onRequestStart()` without calling `super` removes the wiring above (ColdBox never starts). Always call the `super` method unless that is what you mean.

## The `bxagents` mapping

`bxagents.Application` and `bxagents.Scheduler` resolve to the `bxagents/` folder inside the built app, so the files they extend are copied with it and nothing depends on the module being installed where the app runs. Runtime helpers that the built app needs live there.

The folder exists after a build. Before the first `bxAgents build`, an IDE cannot follow `bxagents.Application`; the class itself is not in your project.

## Paths

The base lives one folder down, so it resolves paths from the app folder, not from its own location. If you write code in `Application.bx` that reads a file, use `expandPath( "/..." )` from the app root.
