---
title: extensions/
icon: phosphor-duotone:puzzle-piece
summary: Añade comandos y tareas programadas al chat y al agente servido, en un archivo o una carpeta, con configuración.
description: Añade comandos y tareas programadas al chat y al agente servido, en un archivo o una carpeta, con configuración.
tags: [conventions, extensions, commands, scheduling]
---

# extensions/

Una **extensión** añade cosas a BxAgents sin modificarlo: hoy, comandos de chat (`/deploy`, `/roll 2d6`) y tareas programadas que se ejecutan cuando el agente se sirve. Es una clase que se ve y se comporta como un `ModuleConfig` de ColdBox: tiene `configure()`, `onLoad()` y `onUnload()`, su configuración viene de `Agent.yaml` y se le entregan objetos con `$inject`.

Un archivo es una extensión completa:

```
extensions/
  hello.bx             /hello
  roll.bx              /roll, /coin
  standup/             una carpeta también es una extensión
    Extension.bx
    commands/Standup.bx
    schedulers/Reminder.bx
```

Un proyecto funcional con todo esto es [`examples/extensions-agent`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/extensions-agent).

## La extensión más pequeña

`extensions/hello.bx`. El nombre del archivo es el nombre de la extensión.

```
class {

	function configure() {
		variables.settings = { greeting : "Hola" }
	}

	@Command( "hello" )
	@Hint( "saluda: /hello <nombre>" )
	function greet( agentContext, commandArguments ) {
		return agentContext.reply().ok( "#settings.greeting#, #commandArguments#!" )
	}

}
```

Ejecuta `bxAgents chat` y escribe `/hello Ada`. `/extensions` muestra lo que está cargado.

Un método de comando recibe el `agentContext` (la conversación y nada más; el mismo objeto que reciben los comandos integrados) y el texto que sigue al nombre del comando. Devuelve un `Reply` (`agentContext.reply().ok( "..." )`, `.warn()`, `.keyValues()`, `.grid()`, `.choose()`) o simplemente una cadena. Si lanza una excepción, la persona ve un aviso con el nombre de la extensión y el chat continúa.

## Anotaciones

Las anotaciones son anotaciones normales de BoxLang sobre un método. Cada una se puede escribir de cuatro maneras, y todas las anotaciones de BxAgents aceptan las cuatro:

| Escrita | Significa | Ejemplo |
|---|---|---|
| sin valor | valores por defecto; el nombre sale del método | `@Command` sobre `function roll()` es `/roll` |
| simple | el valor principal | `@Command( "deploy" )` |
| arreglo | varios | `@Alias( [ "dice", "d" ] )` |
| struct | todas las opciones | `@Command( { name : "deploy", hint : "planifica", admin : true, aliases : [ "ship" ], transports : [ "tui", "web" ] } )` |

Las anotaciones abreviadas dicen una opción cada una: `@Hint( "..." )`, `@Admin`, `@Alias( ... )`, `@Transports( [ "tui", "web" ] )`. Una opción del struct gana a una abreviada, y el conflicto se muestra en `/extensions`. Los nombres de anotación no distinguen mayúsculas.

`transports` indica dónde corre el comando: `tui` (el chat de terminal), `web` (la página web y la ruta HTTP de comandos) y `gateway` (plataformas de chat). Por defecto son las tres. Una plataforma de chat solo responde a los comandos que su gateway permite (`gatewaySession.commands.allow`), y un comando con `@Admin` solo lo ejecutan los administradores indicados allí.

## Configuración

La extensión dice sus valores por defecto en `configure()`, igual que un módulo:

```
function configure() {
	variables.settings = { target : "staging", environments : [ "staging", "production" ] }
}
```

Quienes la usan los cambian bajo el nombre de la extensión en `Agent.yaml`:

```yaml
extensions:
  deploy:
    target: production
```

Una persona puede poner sus propios valores en `~/.bxagents/bxAgents.yml` (mismo bloque `extensions:`); los del proyecto ganan a los suyos. Los structs anidados se fusionan clave por clave; los arreglos y los valores simples reemplazan. Dentro de la extensión, `settings` es el struct fusionado.

## Ciclo de vida

| Método | Cuándo |
|---|---|
| `configure()` | una vez, primero. Define `variables.settings`. Sin trabajo aquí |
| `onLoad()` | tras fusionar la configuración e inyectar todo. Abre conexiones, inicia temporizadores |
| `onUnload()` | cuando termina el chat o el servidor. Libéralos |

`this.title`, `this.author`, `this.webURL`, `this.description`, `this.version` y `this.enabled` se leen como en un módulo, y `this.dependencies = [ "otra-extension" ]` carga primero esa extensión. Una extensión que falla al cargar aparece como fallida en `/extensions` con el motivo; las demás se cargan igual.

## Inyección

Toda clase de una extensión tiene `$inject( name, object )`. Pone el objeto en los ámbitos `this` y `variables`. Solo privado: `$inject( name, object, "variables" )`. `$read( name )` lee desde fuera una entrada de `variables`.

BxAgents inyecta dos cosas antes de `onLoad()`: `settings` y `log` (`log.info( "..." )`, `.warn()`, `.error()`; lo que una extensión registra también aparece en `/extensions`). Para compartir un objeto entre los archivos de una extensión, créalo en `onLoad()` y hazle `$inject` donde haga falta. La misma llamada sirve a una prueba para entregar un doble a una extensión.

## Una extensión en carpeta

Una carpeta tiene la misma forma que un proyecto de agente:

```
extensions/standup/
  Extension.bx        opcional: el module config (propiedades, configure(), onLoad(), onUnload())
  commands/           una clase por comando, como los integrados
  schedulers/         clases scheduler de ColdBox, que arrancan cuando se sirve el agente
```

Una clase en `commands/` extiende `models.chat.commands.BaseCommand@bxagents` y define `name()`, `hint()`, `transports()` y `run( context, args )`. `settings` y `log` se le inyectan.

## Schedulers

Una clase en `schedulers/` es un scheduler de ColdBox real, como el `schedules/Scheduler.bx` del proyecto. Cuando se sirve el agente (`bxAgents serve`, un `.bxa`, un servidor desplegado) se registra en el servicio de schedulers de ColdBox y arranca. La configuración fusionada de la extensión está en el setting de ColdBox `bxAgentsExtensionSettings`, bajo su nombre, cuando se ejecuta su `configure()`:

```
class {

	function configure() {
		var standup = getSetting( "bxAgentsExtensionSettings" ).standup

		task( "standup-reminder" )
			.call( () => writeLog( text : "Hora del standup", log : "bxagents-extensions" ) )
			.everyDayAt( standup.at )
			.withNoOverlaps()
	}

}
```

El chat de terminal no arranca schedulers: pertenecen al agente servido.

## De dónde vienen las extensiones

| Capa | Carpeta | Corre en |
|---|---|---|
| modules | `extensions/` de un módulo de BoxLang instalado | donde esté instalado el módulo |
| user | `~/.bxagents/extensions/` | solo el chat de terminal de esa máquina |
| project | `<proyecto>/extensions/` | el chat de terminal, la web, las plataformas de chat y el servidor |

Gana la capa posterior. Una extensión con el mismo nombre reemplaza a la anterior, y un comando reemplaza a uno anterior con el mismo nombre o alias, incluido uno integrado. Ambos casos se muestran en `/extensions`; nada se reemplaza en silencio. La compilación copia el `extensions/` del proyecto a la app; un agente servido nunca lee la carpeta personal de un desarrollador.

## Desactivar cosas

```yaml
extensions:
  disable: [ roll, "deploy:deploy", "acme-*" ]
```

Un nombre simple desactiva la extensión con ese nombre (y cualquier comando que se llame así); `extension:item` desactiva un solo comando; `*` coincide con cualquier secuencia de caracteres. Tanto `Agent.yaml` como `~/.bxagents/bxAgents.yml` lo aceptan.

## Verlas

`/extensions` en el chat, o desde la terminal:

```bash
bxAgents extensions          # la lista, de dónde viene cada una y qué añadió
bxAgents extensions --json
```

## Todavía no

Las extensiones aún no pueden escuchar eventos y puntos de interceptación, ni añadir atajos de teclado, elementos de estado, prefijos del compositor, fuentes `@`, huecos en la interfaz web, gateways, verbos de CLI, herramientas y skills. Eso viene después; el plan es `EXTENSIONS-PLAN.md` en el repositorio.
