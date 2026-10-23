# BxAgents extensions: plan (draft 2)

Goal: let people build on top of BxAgents. An extension adds commands, key bindings, status items, composer prefixes, `@` sources, web UI, gateways, CLI verbs, tools and skills, and can listen to the events and interception points the runtime already announces. It must be simple to write and powerful when needed.

This draft replaces draft 1. It folds in what we decided and what Pi (the Pi coding agent) does well. Installing from ForgeBox (`bxAgents extension install`) comes after this and is out of scope here.

## Decisions

| Question | Answer |
|---|---|
| Authors | Anyone: a project, a user for their own machine, or a ForgeBox module. Same contract everywhere |
| Shape | An extension is a class. One file is enough. A folder is available for bigger ones |
| Layers | core, modules, user (`~/.bxagents/extensions/`), project (`extensions/`). A later layer wins |
| Conflicts | An item replaces an earlier item of the same name. An extension replaces an earlier extension of the same name. Listed at startup and by `/extensions` |
| Off switch | `extensions.disable` in `Agent.yaml`, by extension name, item name, or glob |
| Trust | Installed modules and project code load. Running the project already runs its `Agent.bx`, so there is no extra boundary |
| Web slots | Refreshed once per page load, plus `window.bxagents.refreshSlot( name )` for the slot's own script |
| TUI | Declared pieces only, no raw terminal access |
| Versioning | Ignored for now |

## The shape: an extension is a class

Everything an extension adds ends up in one registry. There are two ways to describe it, and they mix freely.

1. **Annotated methods** (declarative, the simple way).
2. **`register( api )`** (programmatic, for anything built at load time).

For a big extension, **convention folders** hold one class per piece. They are the same classes a method would describe, just split into files.

### The smallest extension: one file

`extensions/deploy.bx` (or `~/.bxagents/extensions/deploy.bx`). The name is the file name.

```
/**
 * @hint Deploy from the chat
 */
class {

	/**
	 * @command deploy
	 * @key ctrl+shift+d
	 * @hint deploy the app: /deploy staging
	 */
	function deploy( ctx, args ) {
		return ctx.reply().ok( "Deploying to #len( args ) ? args : 'staging'#..." )
	}

	/**
	 * @status
	 */
	function branch( ctx ) {
		return "branch: #ctx.project().branch()#"
	}

	/**
	 * @on afterAIAgentRun
	 */
	function noteRun( event ) {
		// any BoxLang interception point: bx-ai's, ColdBox's, or a chat event below
	}

}
```

### A bigger extension: a folder

```
extensions/ci/
  Extension.bx            optional: settings, start/stop, register( api )
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

### The programmatic way

```
class {

	function settings() {
		return { target : { default : "staging", type : "string" } }   // validated at build
	}

	function register( api ) {
		api.command( "deploy", { hint : "deploy", run : ( ctx, args ) => ctx.reply().ok( "ok" ) } )
		api.key( "ctrl+shift+d", "/deploy" )
		api.status( "ci", ctx => "ci: green" )
		api.on( "chat.turn.end", event => { ... } )
		api.slot( "header", ctx => "<span>staging</span>" )
	}

	function start( ctx ) {}    // a session or server began; start timers and connections here
	function stop( ctx ) {}     // it ended; release them here (safe to call twice)

}
```

Load has no side effects. Anything that opens a connection or starts a timer belongs in `start()` and ends in `stop()`, as Pi requires. `/reload` stops and reloads extensions.

## What an extension can add

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
| Event handler | anywhere | see next section |

## Events and interception points

`@on` and `api.on` take three kinds of name. The handler receives an `event` struct.

1. **bx-ai points** (runtime scope): `beforeAIAgentRun`, `afterAIAgentRun`, `beforeAIModelInvoke`, `afterAIModelInvoke`, `beforeAIToolExecute`, `afterAIToolExecute`, `onAIError`, `onGatewayMessageReceived` and the rest of `InterceptionPoints.BXAI`.
2. **ColdBox points** (agent scope): `preProcess`, `postProcess`, `preEvent`, `onException` and the rest of `InterceptionPoints.COLDBOX`. These fire in the generated app.
3. **Chat events** (new, announced by the chat on every transport):

| Event | When | Can |
|---|---|---|
| `chat.session.start` / `chat.session.end` | a terminal chat opens or closes; a web conversation opens | |
| `chat.conversation.change` | `/new`, `/resume`, `/clear`, `/fork`, `/compact` | |
| `chat.input` | before a message is sent | change the text, add attachments, or cancel with a reason |
| `chat.turn.start` / `chat.turn.end` | around one agent turn | |
| `chat.command.before` / `chat.command.after` | around any command | cancel before; change the reply after |
| `chat.reply` | before a command reply is drawn | change blocks |

The `event` struct has `data`, and the methods `cancel( reason )` and `replace( value )` where the table says it can. Handlers run in load order, so a later layer sees the earlier layer's changes. An error in a handler is logged and shown in `/extensions`; it never stops the turn.

## Context passed to extensions

`ctx` is a narrow, stable object (the same `CommandContext` the built-ins use, extended):

- `ctx.reply()`: build a Reply (text, table, choose, file).
- `ctx.ask()`: ask the user for text, a choice or a yes/no. Works on every transport (a prompt in the terminal, a card on the web, a numbered question on a chat platform).
- `ctx.chat()`: the conversation (sessions, notes, history, context report).
- `ctx.transport()`, `ctx.user()`, `ctx.project()`, `ctx.admin()`.
- `ctx.settings()`: this extension's own settings, from `extensions.<name>` in `Agent.yaml` (project) or `~/.bxagents/bxAgents.yml` (user).
- `ctx.state()`: scratch space that lives as long as the session.
- `ctx.log()`.

## Layers and where each one runs

```
core                          built in
modules                       <module>/extensions/<name>/ , installed with install-bx-module
user                          ~/.bxagents/extensions/<name>/   terminal chat on this machine only
project                       <project>/extensions/<name>/     terminal, web, chat platforms, server
```

The user layer exists only for the terminal chat on that machine. A deployed server or gateway never reads a developer's home directory.

A module may also register in code from its `ModuleConfig.bx` by listening for `onBxAgentsExtensions`, which hands it the registry. Both routes feed the same registry.

Naming: `deploy` is an extension; `deploy:status` is its item named `status`. A command, key or status item is also known by its own plain name (`/info`), and that is how it replaces a built-in.

## Switching things off

```yaml
# Agent.yaml
extensions:
  disable: [ ci, "deploy:status", "acme-*" ]    # extension, item, or glob
  deploy:
    target: production                          # that extension's settings
```

## What Pi taught us, and where we differ

Taken from Pi:
- A single file is a complete extension, and the factory style (`register( api )`).
- Lifecycle with no work at load: `start` and `stop`, plus reload.
- Event hooks that can read, change or cancel (`input`, `tool_call`, turn boundaries).
- Settings per extension, and filters by name or glob.
- Bundling more than UI: tools, skills, MCP servers.
- Try one without installing it: `bxAgents chat --extension ./path`.

Different on purpose:
- No custom terminal components. Pieces are declared, so a bad extension cannot break the screen.
- No project trust prompt. Running the project already runs its code.
- Items replace earlier items of the same name (Pi merges lists). That is how a module overrides the core.

## Slices (each its own PR)

1. Registry and scanner: layers, names, replacement rules, `extensions.disable` and settings, `/extensions` and `bxAgents extensions`. Commands only, in single-file and folder form, annotated and `register( api )`.
2. Events: `@on` for bx-ai and ColdBox points, and the chat events.
3. Keys and status items.
4. Prefixes and `@` sources (move `!`, `#` and `@file` onto them).
5. `ctx.ask()` on every transport, and `start`/`stop`/`/reload`.
6. Web slots, assets and `window.bxagents`.
7. Gateway types, CLI verbs, bundled tools and skills.
8. Extension kit: a sample extension, testing helpers, an authoring guide (EN, mirror, ES), and `--extension ./path`.

After that: `bxAgents extension install|list|remove|update`, local or `--user`, from ForgeBox. The module keeps ForgeBox type `boxlang-modules`, with a `bx-agents-extension` tag for discovery.

## To settle

1. Annotation style: docblock tags as above (`@command deploy`), which matches `@scope` on interceptors today. Say if you prefer another form.
2. A `@key` on a method calls that method with no arguments (as with `deploy` above). A key that only runs a command line is `api.key( "ctrl+shift+d", "/deploy" )`.
3. Event names: `chat.*` for chat events. Fine, or a different prefix?
