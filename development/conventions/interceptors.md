---
title: interceptors/
icon: phosphor-duotone:flow-arrow
summary: ColdBox lifecycle interceptors, scoped by an @scope annotation.
description: ColdBox lifecycle interceptors, scoped by an @scope annotation.
tags: [conventions, interceptors]
---

# interceptors/

`interceptors/*.bx` are ColdBox interceptors (lifecycle hook classes - `preProcess`, `postProcess`, etc.), scoped via an `@scope` annotation on the class itself:

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

## `agent` vs `runtime` scope

| Scope | Effect |
|---|---|
| `agent` (default) | Copied into the generated app's own `interceptors/` folder and registered in the generated `config/ColdBox.bx`'s `interceptors` list - affects only this app. |
| `runtime` | Copied separately (not into the generated app) for registration the same way a BoxLang module registers its own interceptors - affects the whole BoxLang runtime, not just this app. |

An interceptor with **no** `@scope` annotation at all defaults to `agent` - the narrower, safer default, since `runtime` scope has effects beyond this one app.

An `@scope` value that isn't `agent` or `runtime` (case-insensitive) fails the build with a clear error - there's no silent fallback for a typo'd scope.

## Generated wiring

For `agent`-scope interceptors, the generated `config/ColdBox.bx` gets one entry per interceptor:

```javascript
interceptors = [
	{ class : "interceptors.AuditLogger" }
]
```

deterministically referencing every agent-scope interceptor exactly once.