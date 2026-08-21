---
title: interceptors/
icon: phosphor-duotone:funnel
summary: ColdBox-Lifecycle-Interceptors, gescoped über eine @scope-Annotation.
description: ColdBox-Lifecycle-Interceptors, gescoped über eine @scope-Annotation.
tags: [conventions, interceptors]
---

# interceptors/

`interceptors/*.bx` sind ColdBox-Interceptors (Lifecycle-Hook-Klassen - `preProcess`, `postProcess` usw.), gescoped über eine `@scope`-Annotation auf der Klasse selbst:

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

## `agent`- vs. `runtime`-Scope

| Scope | Wirkung |
|---|---|
| `agent` (Standard) | Wird in den eigenen `interceptors/`-Ordner der generierten App kopiert und in der generierten `config/ColdBox.bx`s `interceptors`-Liste registriert - wirkt nur auf diese App. |
| `runtime` | Wird separat kopiert (nicht in die generierte App) zur Registrierung auf dieselbe Weise, wie ein BoxLang-Modul seine eigenen Interceptors registriert - wirkt auf die gesamte BoxLang-Runtime, nicht nur auf diese App. |

Ein Interceptor ganz **ohne** `@scope`-Annotation fällt standardmäßig auf `agent` zurück - den engeren, sichereren Standard, da `runtime`-Scope Wirkungen über diese eine App hinaus hat.

Ein `@scope`-Wert, der weder `agent` noch `runtime` ist (ohne Berücksichtigung von Groß-/Kleinschreibung), lässt den Build mit einem klaren Fehler scheitern - es gibt keinen stillen Fallback für einen vertippten Scope.

## Generierte Verdrahtung

Für Interceptors mit `agent`-Scope erhält die generierte `config/ColdBox.bx` einen Eintrag pro Interceptor:

```javascript
interceptors = [
	{ class : "interceptors.AuditLogger" }
]
```

referenziert deterministisch jeden Interceptor mit `agent`-Scope genau einmal.
