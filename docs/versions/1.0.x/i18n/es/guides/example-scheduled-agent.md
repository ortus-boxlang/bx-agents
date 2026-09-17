---
title: "Ejemplo: un agente programado"
icon: phosphor-duotone:alarm
summary: Despierta un agente con una programación cron real de ColdBox, sin necesidad de un demonio cron aparte.
description: Despierta un agente con una programación cron real de ColdBox, sin necesidad de un demonio cron aparte.
tags: [guides, examples, schedules]
---

# Ejemplo: un agente programado

[`examples/scheduled-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/scheduled-agent) despierta un agente cada noche mediante una clase de scheduler ColdBox real, escrita a mano, bajo `schedules/` - la prueba de que las [Programaciones](../conventions/schedules.md) no son un DSL inventado por BxAgents, sino código ColdBox real que el build deja pasar intacto.

## El proyecto

```
scheduled-agent/
├── Agent.bx
├── instructions.md
└── schedules/
    └── Scheduler.bx
```

`Agent.bx` tiene la misma forma que en todos los demás ejemplos - no hace falta nada especial en el lado del agente para que lo dirija una programación:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "scheduled-agent",
			description : "An agent that wakes up on a cron schedule via schedules/.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## El scheduler

`schedules/Scheduler.bx` extiende el propio `ColdBoxScheduler` de ColdBox y usa su DSL fluido de tareas real:

```javascript
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "scheduled-agent" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

Como `build` copia este archivo a la aplicación generada esencialmente tal cual (consulta [`schedules/`](../conventions/schedules.md)), tienes disponible el DSL completo de scheduler de ColdBox - `everyDayAt()`, `everyMinute()`, `withNoOverlaps()`, `onFailure()`, y todo lo demás que soporte el propio scheduler de ColdBox, no un subconjunto reimplementado por BxAgents.

`getInstance( "scheduled-agent" )` resuelve por el `name` declarado en el propio `Agent.bx` de este proyecto - cada agente del árbol de un proyecto queda registrado con su propio nombre en WireBox, no solo la raíz, y eso es lo que hace que esta línea funcione sin ningún cableado adicional.

## Instrucciones para el prompt programado

Las instrucciones describen qué debe hacer el agente cuando se dispara `run( "cleanup" )` - desde el punto de vista del agente no hay diferencia entre un despertar programado y un mensaje de chat; ambos son simplemente una llamada a `run()` con algo de texto de entrada:

```markdown
## Scheduled Agent

You run periodic housekeeping prompts. When asked to "cleanup", summarize
what a cleanup pass would involve for a typical project.
```

## Construir y ejecutar

A diferencia de `chat` (que nunca llega a arrancar ColdBox - consulta [Limitaciones conocidas](../known-limitations.md)), el scheduler solo se dispara de verdad bajo un arranque real de ColdBox, así que este ejemplo necesita `serve`, no `chat`:

```bash
cd examples/scheduled-agent
bxAgents build
bxAgents serve
```

La tarea `nightly` se dispara automáticamente en cuanto `serve` está en marcha - sin ningún demonio cron aparte, sin ninguna entrada `cron` a nivel de sistema operativo. Lo mueve el propio hilo de scheduler en proceso de ColdBox, con la programación declarada en `Scheduler.bx`.

!!! info
    `build` no puede validar de forma significativa el *contenido* de `Scheduler.bx` más allá de comprobar que el archivo existe - una errata en una llamada a `getInstance()` o una referencia a un nombre de agente que no existe pasarán `build` limpiamente y solo saldrán a la luz cuando la aplicación generada arranque de verdad. Consulta [Limitaciones conocidas](../known-limitations.md) para el estado actual de esa carencia.

## Dónde ir a continuación

- [Programaciones](../conventions/schedules.md) para el DSL completo del scheduler y para ver dónde acaba el `config/Scheduler.bx` generado dentro de la salida del build.
- [Ejemplo: un agente mínimo](example-minimal-agent.md) si aún no has visto la forma base de un proyecto.
- [Ejemplo: construir un agente de chat web](example-web-chat-agent.md) para un agente accesible de forma interactiva en lugar de por temporizador.
