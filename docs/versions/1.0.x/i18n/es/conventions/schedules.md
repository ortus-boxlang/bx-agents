---
title: schedules/
icon: phosphor-duotone:clock-countdown
summary: Schedulers de BoxLang, un archivo cada uno, con sintaxis cron y el agente a una llamada de distancia.
description: Schedulers de BoxLang, un archivo cada uno, con sintaxis cron y el agente a una llamada de distancia.
tags: [conventions, scheduling]
---

# schedules/

Cada `schedules/*.bx` es un **scheduler de BoxLang**: una clase sencilla cuyo `configure()` construye tareas con el propio DSL de tareas de BoxLang. No hay ColdBox en ella y nada que extender:

```javascript
// schedules/Nightly.bx
class {

	function configure() {
		task( "cleanup" )
			.everyDayAt( "00:00" )
			.call( () => run( "clean up old tickets" ) )
			.withNoOverlaps()
	}

}
```

El build copia cada archivo en la app como `schedules/<Name>.bx`, los lista en `this.schedulers` de la [`Application` base generada](application-bx.md), y BoxLang los arranca con la app y los detiene con ella. Se ejecutan mientras la app está servida (`bxAgents serve`).

!!! note
    Un scheduler es para el desarrollador. Para los prompts que las personas que usan el agente crean por sí mismas, pidiéndolos, mira las rutinas (`routines`).

!!! tip
    `bxAgents add schedule` escribe uno por ti: indica cuándo se ejecuta, qué decirle al agente y qué agente. Ver [`add`](../cli-reference.md#add-schedule).

## Lo que obtienes sin escribir un `extends`

El build añade `extends="bxagents.Scheduler"` a cualquier clase de scheduler que no nombre un padre propio. Esa clase se copia en la app (`bxagents/Scheduler.bx`) y da a tu scheduler estos métodos:

| Método | Qué hace |
|---|---|
| `task( name )` | El constructor de tareas de BoxLang: `.every()`, `.everyDayAt()`, `.onWeekdays()`, `.cron()` (seis campos), `.withNoOverlaps()`, `.call()` ... |
| `run( input, params, options )` | Envía un mensaje al **agente por defecto**, el agente raíz que define tu `Agent.yml` o `Agent.bx`. Toma los mismos argumentos que el `run()` del agente. |
| `agent( name )` | Cualquier agente del árbol del proyecto por el `name` que declara su propia definición, raíz o subagente a cualquier profundidad. Sin nombre es el agente por defecto. |
| `defaultAgent()` | El agente raíz. |
| `getInstance( dsl )` | El `getInstance()` de WireBox, para cualquier otra cosa que la app haya registrado. |
| `controller()` | El controlador de ColdBox en ejecución. |

```javascript
// schedules/Digest.bx
class {

	function configure() {
		task( "weekly-digest" )
			.everyWeekOn( 1, "08:00" )
			.call( () => agent( "ResearchBot" ).run( "summarize this week's findings" ) )
	}

}
```

Todo se resuelve cuando una tarea se dispara, no cuando se ejecuta `configure()`, así que un scheduler puede configurarse antes de que ColdBox haya terminado de arrancar.

Si una clase ya nombra un padre (`class extends="my.BaseScheduler" {`), el build la deja como está. Haz que tu padre extienda `bxagents.Scheduler` para conservar los métodos de arriba.

## Cuándo se ejecuta

Dilo con los propios métodos de la tarea. Cada uno de estos se sirvió en BoxLang 1.19.0 y se esperó hasta que se disparó:

```javascript
.every( 15, "minutes" )          // desde que arranca la app, y luego cada 15 minutos
.everyHour()  .everyHourAt( 15 ) // cada hora, o a los :15
.everyDayAt( "09:00" )           // cada día a las 09:00
.onWeekdays( "08:30" )           // de lunes a viernes; .onWeekends( "10:00" ) para los otros dos
.everyWeekOn( 1, "09:00" )       // 1 es lunes
.everyMonthOn( 1, "09:00" )
.onFirstBusinessDayOfTheMonth( "09:00" )
```

Las horas son `HH:mm` en la zona horaria del scheduler. También hay: `.startOn()`, `.endOn()`, `.when()`, `.withNoOverlaps()`, `.onSuccess()`, `.onFailure()` y zonas horarias.

## Cron

`.cron( "..." )` necesita **seis campos**, con el segundo primero:

```javascript
.cron( "0 */15 * * * *" )       // cada 15 minutos
.cron( "0 0 9 * * 1-5" )        // 09:00:00 en días laborables
.cron( "0 30 8 * * MON-FRI" )   // 08:30:00 en días laborables
```

Funcionan listas (`1,3,5`), rangos (`1-5`), pasos (`*/5`), nombres de mes (`JAN`) y de día (`MON`).

!!! warning "Un cron de cinco campos no se dispara en BoxLang 1.19.0"
    La documentación de BoxLang dice que `.cron()` toma cinco campos, y su parser los acepta, pero una tarea escrita como `.cron( "* * * * *" )`, `.cron( "*/2 * * * *" )` o `.cron( "30 14 * * *" )` nunca se ejecutó en una app servida ni en una ejecución simple de `boxlang schedule` (minutos de espera, sin error). La misma programación con seis campos, con `.every()` o con `.everyDayAt()`, se ejecutó a su hora. Una expresión de cinco campos late una vez por minuto y BoxLang exige entonces que el segundo sea 0; en una prueba el latido cayó justo antes del minuto, así que la comprobación falló siempre. Trátalo como un error de BoxLang: escribe seis campos, o uno de los métodos de arriba. `bxAgents add schedule` lo hace por ti, y escribe una expresión de cinco campos tecleada con un `0` delante.

## Recuperar un agente

Cada agente del árbol del proyecto se registra en el `config/WireBox.bx` generado bajo su propio `name` declarado. `agent( "ResearchBot" )` lo resuelve, y `run( ... )` es el agente raíz. Como `name` es también una clave de binding de WireBox, debe ser **único en todo el proyecto**: `build` falla la validación si dos agentes comparten uno. Ver [subagents/](subagents.md#retrieving-an-agent-from-schedules).

```yaml
# subagents/researcher/Agent.yml
name: ResearchBot
model: openai/gpt-5
```

## Validación

`build` comprueba lo siguiente, porque cada cosa solo fallaría al arrancar la app:

- el nombre de archivo se convierte en el nombre de la clase (`schedules.<Name>`), así que debe ser letras, dígitos y guiones bajos, empezando por una letra o un guion bajo. `my-job.bx` se rechaza; `MyJob.bx` está bien;
- dos archivos que harían la misma clase de scheduler se rechazan: renombra uno;
- un scheduler que extiende `coldbox.system.web.tasks.ColdBoxScheduler` se rechaza, con lo que hay que cambiar;
- un archivo en `schedules/` que no es un `.bx` se ignora, con un aviso para que una programación que dejó de ejecutarse en silencio sea visible.

Un error de sintaxis o un nombre de agente incorrecto en el cuerpo aparece cuando la app arranca (`serve`), como en cualquier otra clase de BoxLang.

!!! note "El scheduler de ColdBox es otra cosa"
    Los [gateways](gateways/index.md) de plataformas de chat registran sus tareas de sondeo en el scheduler propio de la app de ColdBox. Eso no se toca, y los `schedules/` de un proyecto nunca pasan por él.
