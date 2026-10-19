---
title: "Lesson 18: Interceptors and Module Dependencies"
icon: phosphor-duotone:funnel
summary: ColdBox lifecycle hooks scoped by @scope, and BoxLang module dependencies under modules/.
description: ColdBox lifecycle hooks scoped by @scope, and BoxLang module dependencies under modules/.
tags: [course, conventions, interceptors, modules]
---

# Interceptors and Module Dependencies

Two smaller, independent conventions round out the picture: lifecycle hooks into the
generated ColdBox app, and declared BoxLang module dependencies.

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

You've already seen **generated** interceptors without writing one yourself - the web
UI's API-key and login gates from [Lesson 15](15-the-generated-web-chat-ui.md) are
registered exactly this way, just written by BxAgents instead of by you.

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

Add an `interceptors/RequestLogger.bx` with an explicit `@scope agent` annotation that
logs every incoming request via `writeLog()`, rebuild, and check
`.build/app/interceptors/` for the copy plus its registration in
`.build/app/Application.bx`.

Full reference: [interceptors/](../conventions/interceptors.md), [modules/](../conventions/modules.md).

Next: [Lesson 19 - Testing Your Agent](19-testing-your-agent.md)
