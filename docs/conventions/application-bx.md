---
title: Application.bx
icon: phosphor-duotone:file-code
summary: The generated entry point of the built app - what it sets, what it starts, and which of your folders feed it.
description: The generated entry point of the built app - what it sets, what it starts, and which of your folders feed it.
tags: [conventions, build]
---

# Application.bx

`Application.bx` is the entry point of the built app. **You do not write it.** `bxAgents build` generates it into `.build/app/Application.bx` every time, from your convention folders and `Agent.yaml`, and deletes the earlier `.build/app` first, so an edit made there is lost on the next build. The build does not read an `Application.bx` from your project root either.

That makes it a convention in reverse: you put files in folders, and the build writes the `Application.bx` that wires them in. Read it after a build to see exactly what starts and in what order.

## What it sets

| Setting | Value | Comes from |
|---|---|---|
| `this.name` | The agent's name | `name` in `Agent.yaml` |
| `this.sessionManagement`, `this.setClientCookies` | `true` with a [`webui` gateway](web-ui.md), otherwise `false` | A `gateways/*.bx` entry with `exposes: "webui"`. The sign-in is session-backed, so no cookie means no session |
| `this.sessionTimeout` | 60 minutes, only when sessions are on | Fixed. It is not a setting today |
| `this.datasources[ ... ]` and `this.datasource` | One named SQLite datasource for the shared chat store, also the app default | The web UI, or `agentApi.tokens: true`. The file is `./data/chat.db`, and the `BXAGENTS_DB` environment variable names another one. `serve` sets it so the web chat and the terminal chat share the project's `data/` folder |

## What it starts

`onApplicationStart()` runs these steps, in this order:

1. Creates the folder of the SQLite file, when there is one.
2. Applies the bx-ai settings from `config/bxai-settings.json`, so providers and profiles exist before any agent is built.
3. Boots the ColdBox application (`loadColdbox()`).
4. Registers the **MCP servers** of your [`mcp/`](mcp.md) folder.
5. Registers the **gateways** of your [`gateways/`](gateways/index.md) folder.
6. Then the other statements the build gathered: the `tools/` scan, [extensions](extensions.md), the gateway session for chat platforms, and the web UI's store warm-up and account seeding.
7. Registers the **per-request interceptors** of your [`interceptors/`](interceptors.md) folder, the web UI's sign-in gate last.

`onRequestStart()` hands every request to ColdBox. A request with `?fwreinit` first asks ColdBox to reinitialise.

## Which folder feeds which step

| You add | The build writes into `Application.bx` |
|---|---|
| `gateways/*.bx` with `exposes: "webui"` | Sessions on, the chat datasource, the store warm-up |
| `gateways/*.bx` for a chat platform | A gateway registration, and the gateway session start |
| `mcp/*.bx` | An MCP server registration |
| `tools/` | The tool scan |
| `interceptors/` with agent scope | A per-request interceptor registration |
| `extensions/` | The statement that loads the extensions |

## When you want to change what it does

You cannot edit the file, so use the folder that owns the behaviour:

| You want | Use |
|---|---|
| Code that runs for a request or a lifecycle event | An [interceptor](interceptors.md) |
| Code that runs when the chat or the served agent starts, or a new chat command | An [extension](extensions.md) |
| Something on a timetable | [`schedules/Scheduler.bx`](schedules.md) |
| A different database file | `BXAGENTS_DB` |

If you hit something none of these can do, open an issue: it is a place where the build should offer a convention.

## See also

[The build pipeline](../build-pipeline.md) lists every generated file, and the [web UI](web-ui.md) page explains the sessions and the chat store in detail.
