---
title: extensions/
icon: phosphor-duotone:puzzle-piece
summary: Add commands and schedules to the chat and the served agent, as one file or a folder, with settings.
description: Add commands and schedules to the chat and the served agent, as one file or a folder, with settings.
tags: [conventions, extensions, commands, scheduling]
---

# extensions/

An **extension** adds to BxAgents without changing it: chat commands today (`/deploy`, `/roll 2d6`), and schedules that run when the agent is served. It is a class that looks and behaves like a ColdBox `ModuleConfig`: it has a `configure()`, an `onLoad()` and an `onUnload()`, its settings come from `Agent.yaml`, and things are handed to it with `$inject`.

One file is a whole extension:

```
extensions/
  hello.bx             /hello
  roll.bx              /roll, /coin
  standup/             a folder is an extension too
    Extension.bx
    commands/Standup.bx
    schedulers/Reminder.bx
```

A working project with all of these is [`examples/extensions-agent`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/extensions-agent).

## The smallest extension

`extensions/hello.bx`. The file name is the extension's name.

```
class {

	function configure() {
		variables.settings = { greeting : "Hello" }
	}

	@Command( "hello" )
	@Hint( "say hello: /hello <name>" )
	function greet( agentContext, commandArguments ) {
		return agentContext.reply().ok( "#settings.greeting#, #commandArguments#!" )
	}

}
```

Run `bxAgents chat` and type `/hello Ada`. `/extensions` lists what is loaded.

A command method is called with the `agentContext` (the conversation and nothing else; the same object the built-in commands get) and the text after the command name. It returns a `Reply` (`agentContext.reply().ok( "..." )`, `.warn()`, `.keyValues()`, `.grid()`, `.choose()`) or just a string. If it throws, the person sees a warning that names the extension and the chat carries on.

## Annotations

Annotations are normal BoxLang annotations on a method. Each one can be written four ways, and every BxAgents annotation takes all four:

| Written | Means | Example |
|---|---|---|
| bare | defaults; the name comes from the method | `@Command` on `function roll()` is `/roll` |
| simple | the main value | `@Command( "deploy" )` |
| array | several | `@Alias( [ "dice", "d" ] )` |
| struct | every option | `@Command( { name : "deploy", hint : "plan it", admin : true, aliases : [ "ship" ], transports : [ "tui", "web" ] } )` |

Shorthand annotations say one option each: `@Hint( "..." )`, `@Admin`, `@Alias( ... )`, `@Transports( [ "tui", "web" ] )`. A struct option wins over a shorthand, and the clash is shown in `/extensions`. Annotation names ignore case.

`transports` are where the command runs: `tui` (the terminal chat), `web` (the web page and the HTTP command route) and `gateway` (chat platforms). The default is all three. A chat platform only answers the commands its gateway allows (`gatewaySession.commands.allow`), and a command with `@Admin` only runs for the people listed as admins there.

## Settings

The extension says its defaults in `configure()`, as a module does:

```
function configure() {
	variables.settings = { target : "staging", environments : [ "staging", "production" ] }
}
```

The people who use it change them under the extension's name in `Agent.yaml`:

```yaml
extensions:
  deploy:
    target: production
```

A person can set their own values in `~/.bxagents/bxAgents.yml` (same `extensions:` block); the project's values win over theirs. Nested structs merge key by key, arrays and simple values replace. In the extension, `settings` is the merged struct.

## Lifecycle

| Method | When |
|---|---|
| `configure()` | once, first. Sets `variables.settings`. No work here |
| `onLoad()` | after the settings are merged and everything is injected. Open connections, start timers |
| `onUnload()` | when the chat or the server ends. Release them |

`this.title`, `this.author`, `this.webURL`, `this.description`, `this.version` and `this.enabled` are read as in a module config, and `this.dependencies = [ "other-extension" ]` loads that extension first. An extension that throws while it loads is shown as failed in `/extensions` with the reason; the others still load.

## Injection

Every class of an extension has `$inject( name, object )`. It puts the object in both the `this` and the `variables` scopes. For private only: `$inject( name, object, "variables" )`. `$read( name )` reads a `variables` entry from outside.

BxAgents injects two things before `onLoad()`: `settings` and `log` (`log.info( "..." )`, `.warn()`, `.error()`; what an extension logs is also in `/extensions`). To share an object between the files of an extension, create it in `onLoad()` and `$inject` it where it is needed. The same call is how a test hands an extension a fake.

## A folder extension

A folder has the same shape as an agent project:

```
extensions/standup/
  Extension.bx        optional: the module config (properties, configure(), onLoad(), onUnload())
  commands/           one class per command, like the built-in ones
  schedulers/         BoxLang scheduler classes, started when the agent is served
```

A class in `commands/` extends `models.chat.commands.BaseCommand@bxagents` and says its `name()`, `hint()`, `transports()` and `run( context, args )`. `settings` and `log` are injected into it.

## Schedulers

A class in `schedulers/` is a **BoxLang scheduler**: a class with a `configure()` that defines tasks through the `scheduler` property BoxLang gives it, like any other BoxLang scheduler. When the agent is served (`bxAgents serve`, a `.bxa`, a deployed server) it starts in the runtime's scheduler service. Like every class of an extension it is given `settings` (the defaults with the values from `Agent.yaml`) and `log` before `configure()` runs:

```
class {

	function configure() {
		scheduler.task( "standup-reminder" )
			.call( () => log.info( "Standup time for #settings.channel#" ) )
			.everyDayAt( settings.at )
			.withNoOverlaps()
	}

}
```

The BoxLang scheduler lifecycle methods (`onStartup()`, `onShutdown()`, `onAnyTaskError()` and the rest) work as usual. Each scheduler is registered as `extension-<extension>-<scheduler>`, and a scheduler that fails to start is reported on its extension in `/extensions` while the others still run. The terminal chat does not start schedulers: they belong to the served agent.

## Where extensions come from

| Layer | Folder | Runs in |
|---|---|---|
| modules | `extensions/` of an installed BoxLang module | everywhere the module is installed |
| user | `~/.bxagents/extensions/` | the terminal chat on that machine only |
| project | `<project>/extensions/` | the terminal chat, the web page, chat platforms, the server |

A later layer wins. An extension with the same name replaces the earlier one, and a command replaces an earlier command of the same name or alias, a built-in included. Both are shown in `/extensions`; nothing is replaced silently. The build copies the project's `extensions/` into the app; a served agent never reads a developer's home folder.

## Turning things off

```yaml
extensions:
  disable: [ roll, "deploy:deploy", "acme-*" ]
```

A plain name turns off the extension of that name (and any command called that); `extension:item` turns off one command; `*` matches any run of characters. Both `Agent.yaml` and `~/.bxagents/bxAgents.yml` accept it.

## Looking at them

`/extensions` in the chat, or from the shell:

```bash
bxAgents extensions          # the list, where each came from and what it added
bxAgents extensions --json
```

## Not yet

Extensions cannot yet listen to events and interception points, or add key bindings, status items, composer prefixes, `@` sources, web UI slots, gateways, CLI verbs, tools and skills. Those come next; the plan is `EXTENSIONS-PLAN.md` in the repository.
