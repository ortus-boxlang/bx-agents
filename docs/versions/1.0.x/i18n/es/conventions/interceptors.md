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
| `agent` (por defecto) | Copiado a la propia carpeta `interceptors/` de la app generada y registrado en ColdBox cuando la app arranca - afecta solo a esta app. |
| `runtime` | Copiado por separado a `.build/runtime-interceptors` (no dentro de la app generada), para la forma en que un módulo de BoxLang registra sus propios interceptores. BxAgents no los registra por ti: cargarlos queda de tu lado. |

Un interceptor sin ninguna anotación `@scope` en absoluto tiene por defecto `agent` - la opción más estrecha y segura, ya que el scope `runtime` tiene efectos más allá de esta única app.

Un valor de `@scope` que no sea `agent` ni `runtime` (sin distinguir mayúsculas/minúsculas) falla el build con un error claro - no hay respaldo silencioso para un scope mal escrito.

## Cableado generado

Por cada interceptor de scope `agent`, el `Application.bx` generado registra una instancia en el servicio de interceptores de ColdBox desde `onApplicationStart()`:

```javascript
application.cbController.getInterceptorService().register(
	target: application.cbController.getWireBox().getInstance( "interceptors.AuditLogger" ),
	name: "AuditLogger"
)
```

Cada interceptor de scope `agent` se registra exactamente una vez. El `config/ColdBox.bx` generado no tiene ningún array `interceptors`: un array declarativo ahí nunca llega al servicio de interceptores de ColdBox en el stack para el que genera BxAgents, así que el registro ocurre en el arranque.
