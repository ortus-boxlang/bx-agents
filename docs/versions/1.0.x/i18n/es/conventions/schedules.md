---
title: schedules/
icon: phosphor-duotone:clock-countdown
summary: Un scheduler de ColdBox real, escrito a mano, pasado sin tocar.
description: Un scheduler de ColdBox real, escrito a mano, pasado sin tocar.
tags: [conventions, scheduling]
---

# schedules/

`schedules/Scheduler.bx` - si está presente - es una **clase de scheduler de ColdBox real y escrita a mano**, pasada al build sin tocar (una simple copia de archivo a `config/Scheduler.bx`, sin generación, sin traducción):

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "SupportBot" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

No hay nada específico de BxAgents en el cuerpo de ese archivo - es el propio DSL de scheduler de ColdBox, en su totalidad: `.cron( "0 9 * * 1-5" )`, `.everyWeekOn()`, `.startOn()`/`.endOn()`/`.between()`, `.when()`, `.withNoOverlaps()`, hooks `before()`/`after()`/`onSuccess()`/`onFailure()`, zonas horarias - cualquier cosa que soporte el `ScheduledTask` de ColdBox, este proyecto no la limita ni la reinterpreta. (Una versión anterior de esta convención era una forma de datos `{ cron, action }` traducida en el DSL de método de frecuencia propio de ColdBox aquí - esa traducción solo cubría un subconjunto estrecho de cron y descartaba todo lo demás que ofrece la API real del scheduler, así que ya no existe. Si estás migrando un proyecto antiguo, ver abajo.)

## Recuperar un agente

Cada agente en el árbol del proyecto - el propio `Agent.bx` del proyecto raíz y cada entrada `subagents/*`, sin importar cuán profundamente anidada - se registra en el `config/WireBox.bx` generado bajo su propio `name` declarado (el `name` que su `Agent.bx` configuró vía `super.init()`, o un `name` declarado en `configure()` que lo sobreescriba). Un schedule alcanza cualquier agente que quiera con un simple `getInstance( "TheAgentName" )` - sin búsqueda específica de BxAgents, solo WireBox, exactamente como las llamadas `getInstance()` en cualquier otro lugar de una app ColdBox.

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "ResearchBot",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

```javascript
// schedules/Scheduler.bx
task( "weekly-digest" )
	.call( () => getInstance( "ResearchBot" ).run( "summarize this week's findings" ) )
	.everyWeekOn( 1, "08:00" )
```

Porque `name` ahora es también una clave de binding de WireBox, debe ser **único en todo el proyecto** - `build` falla la validación si dos agentes (raíz o subagente, a cualquier profundidad) comparten un nombre, incluyendo dos que ambos dejan sin configurar y por defecto silenciosamente toman `"BxAi"`. Ver [subagents/](subagents.md#retrieving-an-agent-from-schedulesschedulerbx) para la distinción entre el nombre de carpeta de un subagente (usado para conectar `subAgents: [...]`) y su propio `name` declarado (usado aquí).

## Validación

- `build` solo busca exactamente un archivo: `schedules/Scheduler.bx`. Cualquier otra cosa en `schedules/` (incluyendo archivos antiguos `{ cron, action }` de antes de que cambiara esta convención) se ignora - `build` emite una advertencia si `schedules/` existe pero no tiene `Scheduler.bx`, así que un schedule que silenciosamente dejó de ejecutarse al menos es visible.
- Más allá de eso, `schedules/Scheduler.bx` es código real - la misma clase de territorio de "no podemos validar esto de forma significativa sin un arranque real de ColdBox" que cualquier otra clase de BoxLang. Un error de sintaxis o un nombre malo en `getInstance()` sale a la superficie cuando la app generada realmente arranca (`serve`), no en tiempo de validación de `build`.

## Migrando desde la vieja convención `{ cron, action }`

Antes, cada archivo bajo `schedules/` era su propia entrada `{ cron: "0 0 * * *", action: "cleanup" }`, traducida en una llamada de método de frecuencia de ColdBox contra el único binding raíz `"GeneratedAgent"`. Para migrar: elimina esos archivos, añade un `schedules/Scheduler.bx` que extienda `coldbox.system.web.tasks.ColdBoxScheduler`, y por cada entrada antigua añade un `task( name ).call( () => getInstance( "TheAgentName" ).run( "action text" ) )` con el método real de frecuencia de ColdBox o la llamada `.cron()` que coincida con la expresión cron antigua.
