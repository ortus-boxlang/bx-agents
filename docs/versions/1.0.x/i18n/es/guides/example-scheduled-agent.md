---
title: "Ejemplo: un agente programado"
icon: phosphor-duotone:alarm
summary: Despierta un agente con una programación, con un scheduler de BoxLang y sin un demonio cron aparte.
description: Despierta un agente con una programación, con un scheduler de BoxLang y sin un demonio cron aparte.
tags: [guides, examples, schedules]
---

# Ejemplo: un agente programado

[`examples/scheduled-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/scheduled-agent) despierta un agente cada noche con un scheduler de BoxLang bajo `schedules/` - código sencillo de [Programaciones](../conventions/schedules.md) con el propio DSL de tareas de BoxLang (`.every()`, `.everyDayAt()`, `.onWeekdays()` y el resto).

## El proyecto

```text
scheduled-agent/
├── Agent.yml
├── instructions.md
└── schedules/
    └── Nightly.bx
```

`Agent.yml` tiene la misma forma que en todos los demás ejemplos - no hace falta nada especial en el lado del agente para que lo dirija una programación:

```yaml
name: scheduled-agent
description: An agent that wakes up on a daily schedule via schedules/.
model: mock/mock-model
```

## El scheduler

`schedules/Nightly.bx` es una clase sencilla. El build añade la clase base que da `task()` y `run()`:

```javascript
class {

	function configure() {
		task( "nightly" )
			.everyDayAt( "00:00" )
			.call( () => run( "cleanup" ) )
			.withNoOverlaps()
	}

}
```

Tienes disponible el DSL completo de tareas de BoxLang - `every()`, `everyDayAt()`, `onWeekdays()`, `withNoOverlaps()`, `onFailure()` y todo lo demás, no un subconjunto reimplementado por BxAgents (consulta [`schedules/`](../conventions/schedules.md)). Un `cron()` de seis campos también funciona, pero uno de cinco campos nunca se dispara en BoxLang 1.19.0 (ver [Cron](../conventions/schedules.md#cron)).

`run( "cleanup" )` envía el mensaje al agente por defecto del proyecto, el agente raíz. Para llegar a un subagente, usa `agent( "TheAgentName" ).run( ... )`: cada agente del árbol de un proyecto queda registrado con su propio `name` declarado.

## Instrucciones para el prompt programado

Las instrucciones describen qué debe hacer el agente cuando se dispara `run( "cleanup" )` - desde el punto de vista del agente no hay diferencia entre un despertar programado y un mensaje de chat; ambos son simplemente una llamada a `run()` con algo de texto de entrada:

```markdown
## Scheduled Agent

You run periodic housekeeping prompts. When asked to "cleanup", summarize
what a cleanup pass would involve for a typical project.
```

## Construir y ejecutar

A diferencia de un simple `bxAgents chat` (que carga el agente en el proceso del chat y nunca arranca ColdBox), los schedulers solo arrancan con la app servida, así que este ejemplo necesita `serve`. `bxAgents chat --server` también arranca la app, como un servidor local desechable, y conversa con ella:

```bash
cd examples/scheduled-agent
bxAgents build
bxAgents serve
```

La tarea `nightly` se dispara automáticamente en cuanto `serve` está en marcha - sin ningún demonio cron aparte, sin ninguna entrada `cron` a nivel de sistema operativo. Lo mueve el propio scheduler de BoxLang, con la programación declarada en `Nightly.bx`.

Para añadir otra programación a tu propio proyecto, ejecuta `bxAgents add schedule`. Pregunta cuándo (por ejemplo `daily 09:00` o `every 15 minutes`), qué decirle al agente y a qué agente, y escribe `schedules/<Name>.bx` con los propios métodos de la tarea (`daily 09:00` pasa a ser `.everyDayAt( "09:00" )`). Una expresión cron que teclees se escribe como un `.cron()` de seis campos, porque uno de cinco campos no se dispara en BoxLang 1.19.0. `bxAgents inspect` lista las programaciones de un proyecto.

!!! info
    `build` comprueba el nombre de archivo del scheduler y que sea una clase, pero no el *contenido* de `configure()` - una errata en una llamada a `agent()` o una referencia a un nombre de agente que no existe pasarán `build` limpiamente y solo saldrán a la luz cuando la aplicación generada arranque de verdad.

## Dónde ir a continuación

- [Programaciones](../conventions/schedules.md) para los ayudantes que recibe un scheduler, las formas de decir cuándo se ejecuta y la nota sobre cron.
- [Ejemplo: un agente mínimo](example-minimal-agent.md) si aún no has visto la forma base de un proyecto.
- [Ejemplo: construir un agente de chat web](example-web-chat-agent.md) para un agente accesible de forma interactiva en lugar de por temporizador.
