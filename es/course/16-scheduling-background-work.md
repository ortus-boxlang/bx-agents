---
title: "Lección 16: Programar trabajo en segundo plano"
icon: phosphor-duotone:clock-countdown
summary: schedules/Scheduler.bx - un scheduler ColdBox real, escrito a mano, que pasa intacto.
description: schedules/Scheduler.bx - un scheduler ColdBox real, escrito a mano, que pasa intacto.
tags: [course, conventions, scheduling]
---

# Programar trabajo en segundo plano

`schedules/Scheduler.bx` - si existe - es una **clase de scheduler ColdBox real, escrita a
mano**, que pasa al build sin tocarse: una simple copia de archivo a `config/Scheduler.bx`,
sin generación, sin traducción.

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "my-agent" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

No hay nada específico de BxAgents en el cuerpo de ese archivo - es el propio DSL de scheduler
de ColdBox, al completo: `.cron( "0 9 * * 1-5" )`, `.everyWeekOn()`,
`.startOn()`/`.endOn()`/`.between()`, `.when()`, `.withNoOverlaps()`, hooks de ciclo de vida,
zonas horarias - todo lo que soporte el `ScheduledTask` de ColdBox.

## Recuperar tu agente

Cada agente del árbol de tu proyecto - el proyecto raíz y cada entrada de `subagents/*` - queda
registrado en el `config/WireBox.bx` generado bajo su propio `name` declarado (consulta la
[Lección 11](11-composing-subagents.md)). Una programación alcanza el agente que quiera con un
simple `getInstance( "TheAgentName" )` - sin ninguna búsqueda específica de BxAgents, solo
WireBox.

```javascript
task( "weekly-digest" )
	.call( () => getInstance( "ResearchBot" ).run( "summarize this week's findings" ) )
	.everyWeekOn( 1, "08:00" )
```

## Validación

`build` solo busca exactamente un archivo: `schedules/Scheduler.bx`. Cualquier otra cosa en
`schedules/` se ignora, y `build` emite un **aviso** (no un error) si `schedules/` existe pero
no contiene ningún `Scheduler.bx` - de modo que una programación que dejó de ejecutarse en
silencio al menos sea visible. Más allá de eso, es código real: un error de sintaxis o un
nombre incorrecto en `getInstance()` aparecen cuando la aplicación generada arranca de verdad
(`serve`), no en la validación de `build`.

## Pruébalo

Añade un `schedules/Scheduler.bx` que llame a tu agente raíz una vez al día, después construye
e inspecciona el `.build/app/config/Scheduler.bx` generado - verás tu archivo copiado byte a
byte.

```bash
bxAgents build --verbose
```

La salida detallada te dice si se encontró un `schedules/Scheduler.bx`.

Referencia completa: [schedules/](../conventions/schedules.md).

Siguiente: [Lección 17 - Alojar y consumir servidores MCP](17-hosting-mcp-servers.md)
