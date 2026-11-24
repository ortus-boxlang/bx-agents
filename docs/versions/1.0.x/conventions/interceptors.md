---
title: interceptors/
icon: phosphor-duotone:funnel
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

!!! tip
    `bxAgents add interceptor` scaffolds one: pick the scope and the interception points and it writes `interceptors/<Name>.bx` with a method for each. See [`add`](../cli-reference.md#add-interceptor).

## `agent` vs `runtime` scope

| Scope | Effect |
|---|---|
| `agent` (default) | Copied into the generated app's own `interceptors/` folder and registered with ColdBox when the app starts - affects only this app. |
| `runtime` | Copied separately to `.build/runtime-interceptors` (not into the generated app), for the way a BoxLang module registers its own interceptors. BxAgents does not register them for you: loading them is up to you. |

An interceptor with **no** `@scope` annotation at all defaults to `agent` - the narrower, safer default, since `runtime` scope has effects beyond this one app.

An `@scope` value that isn't `agent` or `runtime` (case-insensitive) fails the build with a clear error - there's no silent fallback for a typo'd scope.

## Generated wiring

For each `agent`-scope interceptor, the generated wiring ([`bxagents/Wiring.bx`](application-bx.md)) registers an instance with ColdBox's interceptor service from `after()`, once ColdBox has loaded:

```javascript
application.cbController.getInterceptorService().register(
	target: application.cbController.getWireBox().getInstance( "app.interceptors.AuditLogger" ),
	name: "AuditLogger"
)
```

Every agent-scope interceptor is registered exactly once. The generated `config/Coldbox.bx` has no `interceptors` array: the registration happens at startup instead. (A declarative array was once measured not to reach ColdBox's interceptor service, but against a config file ColdBox was not loading; that was not measured again, and the registration at startup works.)
