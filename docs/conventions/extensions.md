---
title: extensions/
icon: phosphor-duotone:puzzle-piece
summary: Add commands and schedules to the chat and the served agent, as one file or a folder, with settings.
description: Add commands and schedules to the chat and the served agent, as one file or a folder, with settings.
tags: [conventions, extensions, commands, scheduling]
---

# extensions/

An **extension** adds to BxAgents without changing it: chat commands (`/deploy`, `/roll 2d6`), listeners for the events of the chat and of bx-ai, and schedules that run when the agent is served. It is a class that looks and behaves like a ColdBox `ModuleConfig`: it has a `configure()`, an `onLoad()` and an `onUnload()`, its settings come from `Agent.yaml`, and things are handed to it with `$inject`.

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

## Listening to events

An extension is also an interceptor. A method named after an event listens to it, exactly like a BoxLang or ColdBox interceptor:

```
class {

	function onChatInput( data ) {
		if ( data.text contains "password" ) {
			data.cancel( "That looks like a password, so it was not sent." )
		}
	}

	function onAIError( data ) {
		log.warn( "the model failed" )
	}

}
```

Two things can be listened to:

- **bx-ai events** (`beforeAIAgentRun`, `afterAIModelInvoke`, `onAIError`, `beforeAIToolExecute` and the rest). They fire wherever the agent runs.
- **Chat events**, announced by BxAgents:

| Event | When | `data` has | A listener can |
|---|---|---|---|
| `onChatSessionStart` / `onChatSessionEnd` | the terminal chat opens or closes | `agent`, `transport` | |
| `onChatInput` | before a message is sent | `text`, `transport` | `cancel( reason )`, or `replace( newText )` |
| `onChatTurnStart` / `onChatTurnEnd` | around one turn of the agent | `text`, `transport` (`reply`, `status` at the end) | |
| `onChatConversationChange` | `/new`, `/resume`, `/clear`, `/fork` or `/compact` changed the conversation | `line`, `transport` | |
| `onChatCommandBefore` | before any command, on every transport | `line`, `name`, `arguments`, `transport` | `cancel( reason )` |
| `onChatCommandAfter` | after any command, on every transport | `line`, `name`, `reply`, `transport` | `replace( newReply )` |

The session, input, turn and conversation events are the terminal chat's; the two command events fire in the terminal, the web page and on chat platforms alike. A listener that throws is caught: it can never stop a turn, the listeners after it still run, and the error is shown in `/extensions`.

`@On` binds a method with another name, or many events at once, and takes the four forms an annotation takes:

```
@On( [ "beforeAIToolExecute", "afterAIToolExecute" ] )
function toolCalled( data ) { log.info( "a tool ran" ) }
```

`@On` naming an event the runtime does not know is reported in `/extensions`, not ignored.

### `interceptors` and `customInterceptionPoints`

As in a module config, `configure()` can name classes from the extension's folder to register, each with its own properties, and points of its own to announce:

```
function configure() {
	variables.interceptors = [ { class : "interceptors.Audit", properties : { level : "info" } } ]
	variables.customInterceptionPoints = [ "onAuditRecorded" ]
}
```

`interceptors/Audit.bx` listens with methods named after events and has `settings`, `log` and `properties` injected. Any extension can then listen to `onAuditRecorded`, and the one that owns it announces it with `BoxAnnounce( "onAuditRecorded", { ... } )`. `extensions.disable` takes `extension:method` to turn one listener off.

ColdBox events (`preProcess`, `postProcess` and the rest) are not part of the terminal chat; they fire only in a served agent.

## Keys and status

`@Key` binds keys in the terminal chat to a method. On a command method it runs that command, with the same rules and events as typing it; on any other method it calls the method with the `agentContext` and an empty text and shows what it returns. `@Hint` (or `hint` in the struct form) says what it does.

```js
@Command
@Hint( "count a pulse" )
@Key( "ctrl+g" )
function pulse( agentContext, commandArguments ) { ... }

@Key( { keys : [ "ctrl+y", "alt+y" ], hint : "reset the count" } )
function resetPulse( agentContext, commandArguments ) { ... }
```

A key is named `extension:method` (`pulse:pulse`). `/keys` lists it with the built-in ones, and a person can give it other keys under `chat: keys:` in `~/.bxagents/bxAgents.yml`. A key a built-in action already uses, or an earlier extension holds, is refused with a sentence that says so. A typed draft stays in the box while a key runs. Keys are for the terminal chat; the web page and chat platforms have commands.

`@Status` is a piece of status next to the size of the context: a method that returns a short text, asked each time the box is drawn in the terminal and after each change to the conversation on the web page (small chips in the header). Return an empty string to show nothing. It must be quick; one that throws is left out and the reason is put on its extension once.

```js
@Status
function beats( agentContext ) {
	return variables.beats > 0 ? "beat #variables.beats#" : ""
}
```

`extensions.disable` takes `extension:method` for a key or a status item too.

## `register( registry )`

What annotations cannot say, because it is worked out in code, is said as calls. If the class has a `register( registry )` method it is called once, right after `configure()`:

```js
function register( registry ) {
	registry.command( "deploy", { run : ( agentContext, commandArguments ) => ..., hint : "ship it", admin : true, aliases : [ "ship" ] } )
	registry.key( "ctrl+d", "/deploy", { hint : "ship it" } )                    // a key that runs a command line
	registry.key( "ctrl+o", ( agentContext ) => "opened", { name : "open", hint : "open it" } )   // or any function
	registry.status( "branch", ( agentContext ) => "main" )
	registry.on( "onChatCommandAfter", ( data ) => ... )                         // an event, or an array of them
}
```

## Prefixes and `@` sources

Both are for the terminal chat only.

`@Prefix` claims the start of a line in the message box. The method gets the `agentContext` and the text after the prefix. It answers one of two ways: a `Reply` (or a string) is shown and nothing is sent, and `{ send : "text" }` is sent to the agent as the message, after `onChatInput` has seen it.

```js
@Prefix( "%" )
@Hint( "ask for an explanation: % why is the sky blue" )
function explain( agentContext, text ) {
	return { send : "Explain this in one short paragraph: #text#" }
}

@Prefix( "=" )
function count( agentContext, text ) {
	return agentContext.reply().ok( "#text.listToArray( ' ' ).len()# words" )
}
```

`/`, `!`, `#` and `@` are the chat's own, and a lone `?` asks for the keys; a prefix that starts with one of them, is empty or has a space is refused with a sentence. The longest prefix wins. Two extensions on one prefix are a warning and the later layer wins.

`@Source( "ticket" )` brings content along with a message the way `@path` brings a file. Write `@ticket:TCK-1` (or `@ticket:"two words"`) and the method is called with the `agentContext` and the query. It returns `{ name, content }`, an array of them or a string; the content goes with the message and the mention stays in it. `@Suggest( "ticket" )` on another method is optional: it returns the values the menu offers as the person types after the colon. It is asked on keystrokes, so it must be quick; one that throws gives no suggestions and the reason is put on its extension once. A source name can be anything that starts with a letter, since files are plain `@path`.

```js
@Source( "ticket" )
function ticket( agentContext, query ) { return { name : "ticket #query#", content : tickets[ query ] } }

@Suggest( "ticket" )
function ticketNames( agentContext, query ) { return tickets.keyArray() }
```

Written as calls: `registry.prefix( "%", ( agentContext, text ) => ..., { hint : "..." } )` and `registry.source( "ticket", ( agentContext, query ) => ..., { hint : "...", suggest : ( agentContext, query ) => [ ... ] } )`.

The person chooses the prefix or the name, by the id `extension:method`, in `~/.bxagents/bxAgents.yml`:

```yaml
chat:
  prefixes:
    desk:explain: "?%"
  sources:
    desk:ticket: issue
```

A choice that cannot be used is reported and the extension's own is kept. `extensions.disable` takes `extension:method` for these too.

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

Extensions cannot yet add web UI slots, gateways, CLI verbs, tools and skills. Those come next; the plan is `EXTENSIONS-PLAN.md` in the repository.
