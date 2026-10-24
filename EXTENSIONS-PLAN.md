# BxAgents extensions: plan (draft 3)

Goal: let people build on top of BxAgents. An extension adds commands, key bindings, status items, composer prefixes, `@` sources, web UI, gateways, CLI verbs, tools and skills, and can listen to the events and interception points the runtime already announces. It must be simple to write and powerful when needed.

An extension looks and feels like a ColdBox / BoxLang `ModuleConfig`. Installing from ForgeBox (`bxAgents extension install`) comes after this and is out of scope here.

## Decisions

| Question | Answer |
|---|---|
| Authors | Anyone: a project, a user for their own machine, or a ForgeBox module. Same contract everywhere |
| Shape | An extension is a class. One file is enough. A folder is available for bigger ones. The class looks like a `ModuleConfig` |
| Lifecycle | `configure()`, `onLoad()`, `onUnload()`, as in a ColdBox module |
| Settings | `configure()` sets `settings`; `Agent.yaml` / `bxAgents.yml` override them |
| Injection | A `$inject( name, object )` method on every extension class. It puts the object in `this` and `variables` |
| Layers | core, modules, user (`~/.bxagents/extensions/`), project (`extensions/`). A later layer wins |
| Conflicts | An item replaces an earlier item of the same name. An extension replaces an earlier extension of the same name. Listed at startup and by `/extensions` |
| Off switch | `extensions.disable` in `Agent.yaml`, by extension name, item name, or glob |
| Trust | Installed modules and project code load. Running the project already runs its `Agent.bx`, so there is no extra boundary |
| Web slots | Refreshed once per page load, plus `window.bxagents.refreshSlot( name )` for the slot's own script |
| TUI | Declared pieces only, no raw terminal access |
| Versioning | Ignored for now |

## 1. An extension is a module config

A folder extension has an `Extension.bx` that reads like a `ModuleConfig.bx`. The properties are the ones a module has (checked against this repo's `ModuleConfig.bx` and ColdBox 8.3 modules).

```
class {

	// Extension properties
	this.title        = "Release helper";
	this.author       = "Ortus Solutions, Corp";
	this.webURL       = "https://www.ortussolutions.com";
	this.description  = "Ship from the chat";
	this.version      = "1.0.0";
	this.enabled      = true;
	// Other extensions that must load first, by name
	this.dependencies = [];

	/**
	 * Describe the extension. No work here.
	 */
	function configure() {
		// Defaults. Agent.yaml (or bxAgents.yml) overrides them.
		settings = {
			ciUrl  : "",
			branch : "main",
			target : "staging"
		};
	}

	/**
	 * Fires after everything is registered and injected.
	 * Open connections, start timers.
	 */
	function onLoad() {}

	/**
	 * Fires on shutdown, /reload, or when disabled. Release what onLoad took.
	 * Safe to call twice.
	 */
	function onUnload() {}

}
```

As in a module, `settings = {...}` in `configure()` is the variables-scope `settings`. The lifecycle:

| Method | When |
|---|---|
| `configure()` | once, first. Sets `settings`; no work |
| `onLoad()` | after the pieces are registered and everything is injected |
| `onUnload()` | on shutdown, `/reload`, or when disabled |

`/reload` runs `onUnload()` and then loads again. An error in any of them is logged and shown in `/extensions`; that extension is skipped and the rest load. Nothing has side effects before `onLoad()`.

## 2. Settings

The defaults come from `configure()`. The user declares values under the extension's name in `Agent.yaml` (project) or `~/.bxagents/bxAgents.yml` (user). User file first, then the project over it, then merged over the defaults:

```yaml
extensions:
  release:
    ciUrl: https://ci.example.com
    target: production
```

After that `settings` holds the merged struct. Nested structs merge key by key; arrays are replaced.

## 3. Injection

Every class in an extension (the `Extension.bx`, a command, a status item, a gateway, a model) has a method:

```
$inject( name, object )
```

It puts the object in both the `this` and the `variables` scope under `name`. For private only, in `variables`:

```
$inject( name, object, "variables" )
```

The registry calls it on each class after creating it, before `onLoad()`:

| `name` | Object |
|---|---|
| `settings` | the extension's merged settings struct |
| `log` | a logger named after the extension |
| the file name of each class in `models/` | a singleton of that class, created once per extension |

So a class in `models/CiClient.bx` is available as `CiClient` in every other file of the extension, with no lookup call and no global state:

```
class {

	function run( ctx, args ) {
		return ctx.reply().ok( CiClient.latestRun( settings.branch ) )
	}

}
```

The same method is how a test (or any code) hands an extension class a fake: `ext.$inject( "CiClient", fake )`. An extension can also call `$inject` itself from `onLoad()` to hand things between its own classes.

## 4. How pieces are described

Everything an extension adds ends up in one registry. There are three ways to describe a piece, and they mix freely.

1. **Annotated methods**: `@Command`, `@Key`, `@Status`, `@On`, `@Prefix`, `@Source`, `@Slot`, `@Tool`. Normal BoxLang annotations, written like Java's, on the class and its methods. Comments are left alone.
2. **Convention folders** (section 6): one class per piece.
3. **Code**: an optional `register( api )` method.

### The smallest extension: one file

`extensions/deploy.bx` (or `~/.bxagents/extensions/deploy.bx`). The name is the file name. A single file is a full extension: it may also have `configure()`, `onLoad()` and `onUnload()`.

```
@Description( "Deploy from the chat" )
class {

	@Command( "deploy" )
	@Key( "ctrl+shift+d" )
	@Hint( "deploy the app: /deploy staging" )
	function deploy( ctx, args ) {
		return ctx.reply().ok( "Deploying to #len( args ) ? args : 'staging'#..." )
	}

	@Status
	function branch( ctx ) {
		return "branch: #ctx.project().branch()#"
	}

	@On( "afterAIAgentRun" )
	function noteRun( event ) {
		// any BoxLang interception point: bx-ai's, ColdBox's, or a chat event below
	}

}
```

Checked on the BoxLang 1.18 runtime: this form compiles and `getMetaData()` returns each annotation with its value (`@Key( [ "ctrl+d", "alt+d" ] )` gives an array, a bare `@Status` gives an empty string).

### Annotation values: bare, simple, array or struct

A BoxLang annotation value can be nothing, a simple value, an array or a struct. All four work on 1.18, and every BxAgents annotation accepts all four:

| Written | Means | Example |
|---|---|---|
| bare | defaults; the name comes from the method name | `@Command` on `function deploy()` is `/deploy` |
| simple | the main value | `@Command( "deploy" )`, `@Key( "ctrl+shift+d" )` |
| array | several of the main value | `@Key( [ "ctrl+d", "alt+d" ] )`, `@On( [ "beforeAIToolExecute", "afterAIToolExecute" ] )` |
| struct | the full options | `@Command( { name : "deploy", hint : "deploy the app", admin : true, keys : [ "ctrl+d" ], transports : [ "tui", "web" ] } )` |

So one annotation can say everything, and the extra annotations are only shorthand:

```
@Command( { name : "deploy", hint : "deploy the app", admin : true, keys : [ "ctrl+shift+d", "alt+d" ] } )
function deploy( ctx, args ) { ... }
```

is the same as

```
@Command( "deploy" )
@Hint( "deploy the app" )
@Admin
@Key( [ "ctrl+shift+d", "alt+d" ] )
function deploy( ctx, args ) { ... }
```

A struct option wins over a separate annotation if both are given, and a clash is reported at startup. Struct keys per annotation are listed in the authoring guide (slice 8).

### In code: `register( api )`

For anything built at load time. Called once, after `configure()`.

```
function register( api ) {
	api.command( "deploy", { hint : "deploy", run : ( ctx, args ) => ctx.reply().ok( "ok" ) } )
	api.key( "ctrl+shift+d", "/deploy" )
	api.status( "ci", ctx => "ci: green" )
	api.on( "onChatTurnEnd", data => { ... } )
	api.slot( "header", ctx => "<span>staging</span>" )
}
```

## 5. Events and interception points

**An extension class is also an interceptor.** Name a method after an interception point and it listens, with no annotation, exactly like a BoxLang or ColdBox interceptor:

```
class {

	function beforeAIToolExecute( data ) {
		// runs before any tool; data.name, data.arguments ...
	}

	function afterAIAgentRun( data ) { ... }

	function onChatTurnEnd( data ) { ... }

}
```

Checked on the 1.18 runtime: `BoxRegisterInterceptor( object, "point" )` calls the method of the same name when the point is announced. The registry does this for every method whose name is a known point, so bx-ai events (`beforeAIAgentRun`, `afterAIModelInvoke`, `onAIError`, `onGatewayMessageReceived` and the rest of `InterceptionPoints.BXAI`) work with no extra code.

Use `@On` when the method needs another name, or to listen to several points with one method:

```
@On( [ "beforeAIToolExecute", "afterAIToolExecute" ] )
function audit( data ) { ... }
```

Three kinds of point can be listened to, both ways:

1. **bx-ai points** (runtime scope): everything in `InterceptionPoints.BXAI`. They fire wherever the agent runs: the terminal chat process or the served app.
2. **ColdBox points** (agent scope): `preProcess`, `postProcess`, `preEvent`, `onException` and the rest of `InterceptionPoints.COLDBOX`. They fire only in the generated app (web page, server API, chat platforms), not in the in-process terminal chat.
3. **Chat events** (new, announced by the chat on every transport). Plain camelCase names, like bx-ai's:

| Event | When | Can |
|---|---|---|
| `onChatSessionStart` / `onChatSessionEnd` | a terminal chat opens or closes; a web conversation opens | |
| `onChatConversationChange` | `/new`, `/resume`, `/clear`, `/fork`, `/compact` | |
| `onChatInput` | before a message is sent | change the text, add attachments, or cancel with a reason |
| `onChatTurnStart` / `onChatTurnEnd` | around one agent turn | |
| `onChatCommandBefore` / `onChatCommandAfter` | around any command | cancel before; change the reply after |
| `onChatReply` | before a command reply is drawn | change blocks |

Chat events carry a `data` struct. Where the table says an event can change or cancel something, `data` has `data.cancel( reason )` and `data.replace( value )`. Handlers run in load order, so a later layer sees the earlier layer's changes. An error in a handler is logged and shown in `/extensions`; it never stops the turn.

Custom points: an extension can announce its own with `BoxRegisterInterceptionPoints` and `BoxAnnounce`, and other extensions listen the same way.

## 6. A bigger extension: a folder

```
extensions/ci/
  Extension.bx            the module config (section 1)
  models/CiClient.bx      plain classes, injected into every other file by name
  commands/status.bx      one class per command (ICommand, as the built-ins are)
  keys/open-run.bx
  status/ci.bx
  prefixes/ , sources/
  gateways/mychat.bx      a gateway class; the type name is the file name
  web/slots/header.html   markup for a web slot
  web/assets/             static files served with the page
  cli/release.bx          a CLI verb: bxAgents release
  interceptors/           the same folder an agent project already has
  tools/ , skills/        and so are these
```

The principle: **an extension folder has the same shape as an agent project, plus the UI pieces.** Anyone who knows a project already knows an extension.

## 7. What an extension can add

| Piece | Where it shows | Notes |
|---|---|---|
| Command | terminal, web, chat platforms, server API | `transports()` and the admin flag work as for built-ins |
| Key binding | terminal | id `extension:name`, appears in `/keys`, rebindable in `bxAgents.yml` |
| Status item | terminal hint row, web header chip | refreshed on turn, clear, compact, resume, notes change |
| Composer prefix | terminal | `!` and `#` become the first two |
| `@` source | terminal | `@file` becomes the first |
| Web slot | web page | `head`, `header`, `sidebar`, `messageActions`, `composer`, `footer` |
| Gateway | `Agent.yaml` `type:` | options schema declared, so `build` validates them |
| CLI verb | `bxAgents <verb>`, help, completions | |
| Tool, skill, MCP server, interceptor | the agent | bundled with the extension |
| Event handler | anywhere | section 5 |

## 8. Context passed to commands and handlers

`ctx` is a narrow, stable object (the same `CommandContext` the built-ins use, extended):

- `ctx.reply()`: build a Reply (text, table, choose, file).
- `ctx.ask()`: ask the user for text, a choice or a yes/no. Works on every transport (a prompt in the terminal, a card on the web, a numbered question on a chat platform).
- `ctx.chat()`: the conversation (sessions, notes, history, context report).
- `ctx.transport()`, `ctx.user()`, `ctx.project()`, `ctx.admin()`.
- `ctx.log()`.

Settings, the logger and models are not on `ctx`; they are injected (section 3).

## 9. Layers and where each one runs

```
core                          built in
modules                       <module>/extensions/<name>/ , installed with install-bx-module
user                          ~/.bxagents/extensions/<name>/   terminal chat on this machine only
project                       <project>/extensions/<name>/     terminal, web, chat platforms, server
```

The user layer exists only for the terminal chat on that machine. A deployed server or gateway never reads a developer's home directory.

A module may also register in code from its `ModuleConfig.bx` by listening for `onBxAgentsExtensions`, which hands it the registry. Both routes feed the same registry.

Naming: `deploy` is an extension; `deploy:status` is its item named `status`. A command, key or status item is also known by its own plain name (`/info`), and that is how it replaces a built-in.

## 10. Switching things off

```yaml
# Agent.yaml
extensions:
  disable: [ ci, "deploy:status", "acme-*" ]    # extension, item, or glob
  deploy:
    target: production                          # that extension's settings (section 2)
```

## 11. What Pi taught us, and where we differ

Taken from Pi:
- A single file is a complete extension.
- Lifecycle with no work at load, plus reload (named as in a ColdBox module: `configure`, `onLoad`, `onUnload`).
- Event hooks that can read, change or cancel (`input`, `tool_call`, turn boundaries).
- Settings per extension, and filters by name or glob.
- Bundling more than UI: tools, skills, MCP servers.
- Try one without installing it: `bxAgents chat --extension ./path`.

Different on purpose:
- No custom terminal components. Pieces are declared, so a bad extension cannot break the screen.
- No project trust prompt. Running the project already runs its code.
- Items replace earlier items of the same name (Pi merges lists). That is how a module overrides the core.

## Slices (each its own PR)

1. Registry and scanner: layers, names, replacement rules, `extensions.disable`; `Extension.bx` as a module config (properties, `configure()`, settings merge, `onLoad()`, `onUnload()`); `$inject` with `settings`, `log` and `models/`; `/extensions` and `bxAgents extensions`. Commands only, in single-file and folder form, annotated and `register( api )`.
2. Events: `@On` and by-name methods for bx-ai and ColdBox points, and the chat events.
3. Keys and status items.
4. Prefixes and `@` sources (move `!`, `#` and `@file` onto them).
5. `ctx.ask()` on every transport, and `/reload`.
6. Web slots, assets and `window.bxagents`.
7. Gateway types, CLI verbs, bundled tools and skills.
8. Extension kit: a sample extension, testing helpers, an authoring guide (EN, mirror, ES), and `--extension ./path`.

After that: `bxAgents extension install|list|remove|update`, local or `--user`, from ForgeBox. The module keeps ForgeBox type `boxlang-modules`, with a `bx-agents-extension` tag for discovery.

## To settle

1. A `@Key` on a method calls that method with no arguments (as with `deploy` above). A key that only runs a command line is `api.key( "ctrl+shift+d", "/deploy" )`.
2. Annotation names are matched ignoring case, so `@command` and `@Command` both work. Capitalised (`@Command`) is the documented form.
3. `$inject` is added to each extension class by the registry (a mixin), not written by the author, unless the class defines its own. To verify in slice 1 that BoxLang lets us add a method to a class instance; the fallback is a small base class.
4. Settings merge: nested structs merge key by key, arrays are replaced (the default if you say nothing).
