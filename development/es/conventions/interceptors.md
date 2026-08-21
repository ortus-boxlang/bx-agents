---
title: interceptors/
icon: phosphor-duotone:funnel
summary: Interceptores de ciclo de vida de ColdBox, delimitados por una anotación @scope.
description: Interceptores de ciclo de vida de ColdBox, delimitados por una anotación @scope.
tags: [conventions, interceptors]
---

# interceptors/

`interceptors/*.bx` son interceptores de ColdBox (clases de hook de ciclo de vida - `preProcess`, `postProcess`, etc.), delimitados vía una anotación `@scope` en la clase misma:

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

## Scope `agent` vs `runtime`

| Scope | Efecto |
|---|---|
| `agent` (por defecto) | Copiado a la propia carpeta `interceptors/` de la app generada y registrado en la lista `interceptors` del `config/ColdBox.bx` generado - afecta solo a esta app. |
| `runtime` | Copiado por separado (no dentro de la app generada) para registro de la misma manera en que un módulo de BoxLang registra sus propios interceptores - afecta a todo el runtime de BoxLang, no solo a esta app. |

Un interceptor sin ninguna anotación `@scope` en absoluto tiene por defecto `agent` - la opción más estrecha y segura, ya que el scope `runtime` tiene efectos más allá de esta única app.

Un valor de `@scope` que no sea `agent` ni `runtime` (sin distinguir mayúsculas/minúsculas) falla el build con un error claro - no hay respaldo silencioso para un scope mal escrito.

## Cableado generado

Para los interceptores de scope `agent`, el `config/ColdBox.bx` generado obtiene una entrada por interceptor:

```javascript
interceptors = [
	{ class : "interceptors.AuditLogger" }
]
```

referenciando de forma determinista a cada interceptor de scope `agent` exactamente una vez.
