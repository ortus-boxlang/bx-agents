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

## Asking the person

A command, key or prefix can put a question to the person while it runs:

```js
var title    = agentContext.ask( "Title of the ticket?", { default : commandArguments, help : "A short sentence." } )
var priority = agentContext.choose( "Priority?", [ "low", "normal", { value : "high", label : "high", hint : "someone is blocked" } ] )
if ( agentContext.confirm( "Make the #priority# ticket?" ) ) { ... }
```

`ask()` returns the text, `choose()` returns the value picked, and `confirm()` is true only for a yes. Esc gives `null` (`false` for `confirm()`). Questions work in the terminal chat only. Where nobody can answer (the web page, chat platforms, a server) they answer at once with `null` (`false`) instead of waiting, and `agentContext.canAsk()` tells you beforehand so a command can say so.

## Reloading

`/reload` loads the extensions again without leaving the chat: it runs `onUnload()` of what was loaded, reads `~/.bxagents/bxAgents.yml` and the `extensions:` settings of `Agent.yaml` anew, and loads what is found, with its commands, keys, status items, prefixes, sources and listeners. An extension that fails to load is reported and left out; the others load. It is for admins and works in the terminal chat only: a served app registers schedulers and ColdBox listeners when it starts, so restart it instead.

## The web page: slots and `web/`

Two ways to add to the web page. Both are served with the page; the terminal chat has no page, so they are ignored there.

**Slots** put a string in a named place of the page: `header` (a chip next to the context size), `sidebar` (a panel under the list of conversations) or `composer` (next to the Attach button). The method is called with the `agentContext` and returns the string:

```js
@Slot( "header" )
function badge( agentContext ) { return variables.pings > 0 ? "#variables.pings# pings" : "" }

@Slot( { place : "sidebar", html : true } )
function about( agentContext ) { return "<strong>Panel</strong><br>Use the Ping button." }
```

The string is shown as text. Only a slot that says `html : true` has its string put into the page as markup; that is the author saying it is their own markup, so it must never carry what a visitor typed (use `encodeForHTML()`). An empty string shows nothing. The page asks for every slot in one request, `GET <path>/api/slots?conversationId=`, behind the same sign-in or API key as the rest of the page's API, each time it refreshes the context size. A slot that throws is left out and the reason is put on its extension once. Written as a call: `registry.slot( "header", ( agentContext ) => "...", { html : false, name : "badge" } )`. `extensions.disable` takes `extension:method` for a slot.

**`web/`** is a folder inside a folder extension. The page serves every file in it (images too) at `<path>/ext/<name>/<file>`, read from the extension itself in the built app; nothing is copied next to the page. The `*.css` and `*.js` files that sit directly in `web/` are linked into the page, in file name order: styles in the head and scripts at the end of the body. An extension turned off by name in `extensions.disable` brings nothing.

```
extensions/panel/
  Extension.bx
  web/
    panel.css
    panel.js
    logo.png        served at <path>/ext/panel/logo.png
```

The page gives scripts one small object, `bxagents`:

| | |
|---|---|
| `bxagents.slot( place )` | a box of your own in `header`, `sidebar` or `composer`, to draw into |
| `bxagents.runCommand( "/ping" )` | runs a slash command as if it were typed |
| `bxagents.onRefresh( fn )` | called after each change to the conversation, once the slots are drawn |
| `bxagents.refresh()` | asks the page to refresh now |
| `bxagents.conversationId()` | the conversation in view |
| `bxagents.apiBase` | the page's API path, for your own `fetch` calls |

## Tools and skills

A folder extension can carry its own tools and skills:

```
extensions/helpdesk/
  Extension.bx
  tools/Tickets.bx             a normal bx-ai tool class
  skills/triage/SKILL.md       a normal skill folder
```

The extension stays as it is. The app reads the folders where they are (`extensions/helpdesk/tools/` in the built app) and gives the tools to the root agent as if they were in the project's own `tools/`, and adds the skills to the global skills every agent gets. Nothing is copied or merged into the project's `tools/` or `skills/`. A tool or skill of the project's own wins over an extension's of the same name, and a later extension wins over an earlier one. `extensions.disable` takes `extension:Tickets` (the tool's file name) or `extension:ticket-triage` (the skill's name) for one, or the extension's name for all of them.

## Gateway types

A class in an extension's `gateways/` folder is a gateway type, named after its file in lower case: `extensions/matrix/gateways/Matrix.bx` is the type `matrix`. It is an ordinary bx-ai gateway (see the built-in ones, which extend `ScheduledGatewayBase`); its `getName()` must be the same as its file, lower case, because that is the key bx-ai's gateway registry holds it under. A project then uses it like any other:

```js
// gateways/chat.bx
class {
	function configure() {
		return { type : "matrix", homeserver : "https://matrix.example.org", tokenEnvVar : "MATRIX_TOKEN" };
	}
}
```

Every option named `<name>EnvVar` is the name of an environment variable: the gateway receives its value as `<name>` (here `token`), and it is read when the app starts, so a secret is never a literal in the build. The app builds the gateway from the extension's own class file and registers it when it starts.

All the types come from one registry, `GatewayTypes`: the built-in ones, and whatever extensions bring. A built-in type cannot be replaced (an extension cannot take over `telegram`). Two extensions on one type is a warning and the later one wins. A file name that is not a usable type name (a letter, then letters, digits and `-`) is refused. `extensions.disable` takes `extension:Matrix` for one type or the extension's name for all of them. The gateway classes are read from the project's extensions only.

## Command line verbs

```js
@Verb( { name : "greet", valueOptions : [ "name" ] } )
@Hint( "say hello from the command line: bxAgents greet --name=Ada" )
function greet( options ) { return "Hello, #options.name ?: 'there'#!" }
```

`bxAgents greet --name=Ada` finds the verb in the extensions (modules, the person's own and the project's, loaded as in the chat) when it is not one of the module's own. The method is called with the flags as a struct, as a built-in verb gets them (`--projectRoot` is always there). It returns an exit code, a message to print, `{ exitCode, message }`, or nothing. A flag that must have a value is listed in `valueOptions`, so `--name` alone is refused as it is for a built-in verb. A method that throws is an error with exit code 1 that names the extension. A built-in verb cannot be replaced, and two extensions on one verb is a warning with the later one winning. `bxAgents help` lists the verbs extensions add. They are not in the generated shell completions, which stay as they are. `registry.verb( "greet", ( options ) => ..., { hint, valueOptions } )` is the call form, and `extensions.disable` takes `extension:method`.

## Where extensions come from

| Layer | Folder | Runs in |
|---|---|---|
| modules | `extensions/` of an installed BoxLang module | everywhere the module is installed |
| user | `~/.bxagents/extensions/` | the terminal chat on that machine only |
| project | `<project>/extensions/` | the terminal chat, the web page, chat platforms, the server |

A later layer wins. An extension with the same name replaces the earlier one, and a command replaces an earlier command of the same name or alias, a built-in included. Both are shown in `/extensions`; nothing is replaced silently. The build copies the project's `extensions/` into the app; a served agent never reads a developer's home folder.

## Installing extensions

`bxAgents extensions install` puts an extension into the project from a folder, a zip, GitHub or ForgeBox.

```bash
bxAgents extensions install ./my-ext                    # a folder
bxAgents extensions install ./my-ext.zip                # a zip file
bxAgents extensions install acme/tools                  # GitHub: owner/repo, or owner/repo#ref
bxAgents extensions install https://github.com/acme/tools
bxAgents extensions install https://example.org/ext.zip # a zip by address
bxAgents extensions install acme-tools@1.2.0            # a ForgeBox slug, optionally with a version
bxAgents extensions install ./my-ext --system           # for you, in ~/.bxagents/extensions
```

A folder that exists wins over `owner/repo`. To say which you mean, start with `path:`, `github:`, `forgebox:` or `url:`.

An extension is code that runs when the chat or the app starts, so `install` fetches it into a temporary folder, looks at it without running anything, and shows you what it adds (commands, keys, prefixes, listeners, gateways, tools, skills, web files, verbs) and what its code mentions (files, network, processes, java). It then asks for a yes. `--yes` skips the question and is required when there is no terminal. Nothing is placed until you agree.

| Command | Does |
|---|---|
| `install <source>` | fetch, preview, ask, place. `--name=<name>` renames it, `--force` replaces one that is there, `--system` installs for you instead of the project |
| `install` | with no source, brings back everything `extensions.lock.json` lists |
| `list --installed` | what was installed, where from, and whether it is `intact`, `changed` or `missing` |
| `update [name...]` | fetches again, shows the change and asks. A source pinned to a version or ref (`#v1`, `@1.2.0`) is left alone |
| `remove <name>` | deletes it and its lock entry. A folder you edited needs `--force` |

The project keeps `extensions.lock.json` (`~/.bxagents/extensions.lock.json` with `--system`): the name, the source, the version or ref fetched, and a checksum of the files. **Commit the lock.** `bxAgents build` brings back anything in it that is missing, and refuses a package whose files no longer match their checksum. You may commit `extensions/` too; the result is the same.

What `install` refuses: a zip entry with an absolute path, a `..` part or a backslash, more than 5000 files or 50 MB, a name that is not safe as a folder name, a name already there that this command did not install (unless `--force`), a BoxLang module (`ModuleConfig.bx`), and anything that is not an extension. Symbolic links and `.git` are left out. The preview is a quick read of the text, not a security review: install what you trust.

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

## What stays in the project

Tools, skills, gateway types and `web/` files are read from the project's own `extensions/` folder, which the build copies into the app as it is. An extension in an installed module or in your own `~/.bxagents/extensions` still adds commands, keys, prefixes, listeners and verbs to the chat and the command line, but it does not travel into a built app: a server never reads a developer's home folder.
