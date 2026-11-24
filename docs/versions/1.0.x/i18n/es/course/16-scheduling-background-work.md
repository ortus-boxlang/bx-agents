---
title: "Programar trabajo en segundo plano"
icon: phosphor-duotone:clock-countdown
summary: schedules/*.bx - schedulers de BoxLang, un archivo cada uno, que dicen cuándo con los propios métodos de la tarea.
description: schedules/*.bx - schedulers de BoxLang, un archivo cada uno, que dicen cuándo con los propios métodos de la tarea.
tags: [course, conventions, scheduling]
---

# Programar trabajo en segundo plano

Cada `schedules/*.bx` es un **scheduler de BoxLang**: una clase sencilla cuyo `configure()`
construye tareas. No hay ColdBox en ella y nada que extender - el build añade la clase base
que le da `task()`, `run()` y `agent()`.

```javascript
// schedules/Nightly.bx
class {

	function configure() {
		task( "nightly" )
			.everyDayAt( "00:00" )
			.call( () => run( "cleanup" ) )
			.withNoOverlaps()
	}

}
```

Los métodos de tarea de BoxLang dicen cuándo: `.every( 15, "minutes" )`, `.everyDayAt( "09:00" )`,
`.onWeekdays( "08:30" )`, `.everyWeekOn( 1, "09:00" )`, `.startOn()`/`.endOn()`, `.when()`,
`.withNoOverlaps()`, hooks de ciclo de vida, zonas horarias. `.cron()` funciona con **seis** campos
(el segundo primero); uno de cinco campos no se dispara en BoxLang 1.19.0, ver
[schedules/](../conventions/schedules.md#cron).

## Recuperar tu agente

`run( ... )` envía un mensaje al **agente por defecto**, el agente raíz que define tu
`Agent.yml`. `agent( "TheAgentName" )` obtiene cualquier otro agente del árbol por el
`name` que declara su definición (consulta [Componer subagentes](11-composing-subagents.md)):

```javascript
task( "weekly-digest" )
	.everyWeekOn( 1, "08:00" )
	.call( () => agent( "ResearchBot" ).run( "summarize this week's findings" ) )
```

## Muchos schedulers

Cada archivo es su propio scheduler, así que agrupa las tareas como prefieras: un archivo por
trabajo, o las tareas relacionadas juntas. BoxLang los arranca con la app y los detiene con ella,
así que se ejecutan mientras la app está servida.

## Validación

`build` comprueba que cada nombre de archivo sea un nombre de clase válido (`MyJob.bx`, no
`my-job.bx`), que un scheduler ya no extienda el scheduler de ColdBox, y avisa de un archivo en
`schedules/` que no sea un `.bx`. El cuerpo es código real: un error de sintaxis o un nombre de
agente incorrecto aparecen cuando la app arranca (`serve`), no en `build`.

## Pruébalo

```bash
bxAgents add schedule --when="weekdays 08:30" --prompt="Summarize yesterday's findings"
bxAgents build --verbose
bxAgents inspect --section=schedule
```

(Con el launcher de BoxLang 1.19.0 un valor entre comillas con espacios se parte en los espacios; ver [Comillas en los valores de los flags](../cli-reference.md#comillas-en-los-valores-de-los-flags).)

`add schedule` escribe `schedules/<Name>.bx` con los propios métodos de la tarea (este es
`.onWeekdays( "08:30" )`); `inspect` lista cada scheduler con sus tareas, cuándo se ejecuta cada
una y el agente. Una expresión cron que pases a `--when` se escribe como un `.cron()` de seis campos.

Referencia completa: [schedules/](../conventions/schedules.md).

Siguiente: [Alojar y consumir servidores MCP](17-hosting-mcp-servers.md)
