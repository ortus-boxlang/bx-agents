---
title: "Lesson 18: Interceptors and Module Dependencies"
icon: phosphor-duotone:funnel
summary: ColdBox lifecycle hooks scoped by @scope, and BoxLang module dependencies under modules/.
description: ColdBox lifecycle hooks scoped by @scope, and BoxLang module dependencies under modules/.
tags: [course, conventions, interceptors, modules]
---

# Interceptors and Module Dependencies

Three smaller, independent conventions round out the picture: lifecycle hooks into the
generated ColdBox app, extensions for the chat and the served agent, and declared BoxLang
module dependencies.

## `interceptors/` - ColdBox lifecycle hooks

`interceptors/*.bx` are ColdBox interceptors (`preProcess`, `postProcess`, and other
lifecycle hook points), scoped via an `@scope` annotation on the class itself:

```javascript
// interceptors/AuditLogger.bx
/**
 * @scope agent
 */
class {

	function preProcess( event, interceptData ) {
		// ...
	}

}
```

| Scope | Effect |
|---|---|
| `agent` (default) | Copied into the generated app's own `interceptors/` folder - affects only this app. |
| `runtime` | Copied to `.build/runtime-interceptors`, outside the app, for the whole BoxLang runtime rather than just this app. BxAgents does not register these for you. |

An interceptor with no `@scope` at all defaults to `agent` - the narrower, safer
choice, since `runtime` scope has effects beyond one app. An `@scope` value that isn't
`agent` or `runtime` fails the build with a clear error.

You've already seen a **generated** interceptor without writing one yourself - when you list
`users` on the web chat ([Lesson 15](15-the-generated-web-chat-ui.md)), its sign-in gate is
registered exactly this way, just written by BxAgents instead of by you.

## `extensions/` - add to the chat and the served agent

An interceptor reacts to the ColdBox request. An **extension** adds to BxAgents itself, without
changing it. One `.bx` file is a whole extension: it reads like a ColdBox `ModuleConfig` (a
`configure()`, an `onLoad()`), and annotated methods become chat commands.

```javascript
// extensions/hello.bx
class {

	@Command( "hello" )
	@Hint( "say hello: /hello <name>" )
	function greet( agentContext, commandArguments ) {
		return agentContext.reply().ok( "Hello, #commandArguments#!" )
	}

}
```

Run `bxAgents chat` and type `/hello Ada`; `/extensions` lists what loaded. The same command runs
in the web page and, if allowed, on chat platforms. A folder with an `Extension.bx` can bring more:
keys (`@Key`), status items (`@Status`), `@` sources and message prefixes for the terminal, web
page slots, listeners for chat and bx-ai events, schedulers, tools, skills, a new gateway type or
a `bxAgents` verb. Values for an extension go under `extensions:` in `Agent.yaml`.

Start one with `bxAgents add extension standup`, which asks what to bring and writes working
stubs. Install someone else's with `bxAgents extensions install <folder, zip, owner/repo, address
or ForgeBox slug>`: it shows what the extension adds and asks first, and records it in
`extensions.lock.json`, which you commit. `bxAgents extensions link <folder>` links one you are
working on, and `/reload` picks up your edits. See the [`extensions/`](../conventions/extensions.md)
reference and the guide [Your first extension](../guides/first-extension.md).

## `modules/` - BoxLang module dependencies

`modules/` holds BoxLang module dependencies your agent declares - one immediate
subfolder per module, discovered by folder name (not recursive):

```
modules/
└── my-extra-module/
    ├── module.json
    └── ...
```

A module folder may include a `module.json` with a `dependsOn` array naming other
`modules/*` entries by folder name:

```json
{
	"dependsOn": [ "some-other-module" ]
}
```

This is BxAgents' own dependency-declaration convention for validation purposes - it's
independent of BoxLang's own module-loading mechanism, and today `build` validates and
records these folders in the manifest without loading them into the generated app. **Circular dependencies** are
rejected the same way subagent cycles are (see [Lesson 11](11-composing-subagents.md)):
full cycle path reported, no code generation until the graph is acyclic. A
`module.json` is entirely optional - a module folder with none is assumed to have no
declared dependencies.

## Try it

Try `bxAgents add extension hello --with=command` and `/hello` in the chat. Then add an `interceptors/RequestLogger.bx` with an explicit `@scope agent` annotation that
logs every incoming request via `writeLog()`, rebuild, and check
`.build/app/interceptors/` for the copy plus its registration in
`.build/app/bxagents/Application.bx`.

Full reference: [interceptors/](../conventions/interceptors.md), [modules/](../conventions/modules.md).

Next: [Lesson 19 - Testing Your Agent](19-testing-your-agent.md)
