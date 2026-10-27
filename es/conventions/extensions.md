---
title: extensions/
icon: phosphor-duotone:puzzle-piece
summary: Añade comandos y tareas programadas al chat y al agente servido, en un archivo o una carpeta, con configuración.
description: Añade comandos y tareas programadas al chat y al agente servido, en un archivo o una carpeta, con configuración.
tags: [conventions, extensions, commands, scheduling]
---

# extensions/

Una **extensión** añade cosas a BxAgents sin modificarlo: comandos de chat (`/deploy`, `/roll 2d6`), listeners de los eventos del chat y de bx-ai, y tareas programadas que se ejecutan cuando el agente se sirve. Es una clase que se ve y se comporta como un `ModuleConfig` de ColdBox: tiene `configure()`, `onLoad()` y `onUnload()`, su configuración viene de `Agent.yaml` y se le entregan objetos con `$inject`.

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
  schedulers/         schedulers de BoxLang, que arrancan cuando se sirve el agente
```

Una clase en `commands/` extiende `models.chat.commands.BaseCommand@bxagents` y define `name()`, `hint()`, `transports()` y `run( context, args )`. `settings` y `log` se le inyectan.

## Schedulers

Una clase en `schedulers/` es un **scheduler de BoxLang**: una clase con un `configure()` que define tareas mediante la propiedad `scheduler` que BoxLang le da, como cualquier otro scheduler de BoxLang. Cuando se sirve el agente (`bxAgents serve`, un `.bxa`, un servidor desplegado) arranca en el servicio de schedulers del runtime. Como toda clase de una extensión, recibe `settings` (los valores por defecto con los de `Agent.yaml`) y `log` antes de que se ejecute `configure()`:

```
class {

	function configure() {
		scheduler.task( "standup-reminder" )
			.call( () => log.info( "Hora del standup de #settings.channel#" ) )
			.everyDayAt( settings.at )
			.withNoOverlaps()
	}

}
```

Los métodos de ciclo de vida de los schedulers de BoxLang (`onStartup()`, `onShutdown()`, `onAnyTaskError()` y el resto) funcionan como siempre. Cada scheduler se registra como `extension-<extension>-<scheduler>`, y uno que no arranca se informa en su extensión dentro de `/extensions` mientras los demás siguen. El chat de terminal no arranca schedulers: pertenecen al agente servido.

## Escuchar eventos

Una extensión también es un interceptor. Un método con el nombre de un evento lo escucha, igual que un interceptor de BoxLang o de ColdBox:

```
class {

	function onChatInput( data ) {
		if ( data.text contains "password" ) {
			data.cancel( "Eso parece una contraseña, así que no se envió." )
		}
	}

	function onAIError( data ) {
		log.warn( "el modelo falló" )
	}

}
```

Se pueden escuchar dos cosas:

- **Eventos de bx-ai** (`beforeAIAgentRun`, `afterAIModelInvoke`, `onAIError`, `beforeAIToolExecute` y el resto). Se disparan donde corra el agente.
- **Eventos del chat**, anunciados por BxAgents:

| Evento | Cuándo | `data` tiene | Un listener puede |
|---|---|---|---|
| `onChatSessionStart` / `onChatSessionEnd` | el chat de terminal se abre o se cierra | `agent`, `transport` | |
| `onChatInput` | antes de enviar un mensaje | `text`, `transport` | `cancel( reason )`, o `replace( nuevoTexto )` |
| `onChatTurnStart` / `onChatTurnEnd` | alrededor de un turno del agente | `text`, `transport` (`reply`, `status` al final) | |
| `onChatConversationChange` | `/new`, `/resume`, `/clear`, `/fork` o `/compact` cambió la conversación | `line`, `transport` | |
| `onChatCommandBefore` | antes de cualquier comando, en todos los transportes | `line`, `name`, `arguments`, `transport` | `cancel( reason )` |
| `onChatCommandAfter` | después de cualquier comando, en todos los transportes | `line`, `name`, `reply`, `transport` | `replace( nuevaRespuesta )` |

Los eventos de sesión, entrada, turno y conversación son del chat de terminal; los dos eventos de comando se disparan igual en la terminal, la web y las plataformas de chat. Un listener que lanza una excepción se captura: nunca puede detener un turno, los listeners siguientes se ejecutan y el error aparece en `/extensions`.

`@On` asocia un método con otro nombre, o con varios eventos a la vez, y admite las cuatro formas de una anotación:

```
@On( [ "beforeAIToolExecute", "afterAIToolExecute" ] )
function toolCalled( data ) { log.info( "se ejecutó una herramienta" ) }
```

Si `@On` nombra un evento que el runtime no conoce, se informa en `/extensions` en vez de ignorarse.

### `interceptors` y `customInterceptionPoints`

Como en un module config, `configure()` puede nombrar clases de la carpeta de la extensión para registrar, cada una con sus propiedades, y puntos propios para anunciar:

```
function configure() {
	variables.interceptors = [ { class : "interceptors.Audit", properties : { level : "info" } } ]
	variables.customInterceptionPoints = [ "onAuditRecorded" ]
}
```

`interceptors/Audit.bx` escucha con métodos que llevan el nombre del evento y recibe `settings`, `log` y `properties` inyectados. Cualquier extensión puede escuchar `onAuditRecorded`, y la dueña lo anuncia con `BoxAnnounce( "onAuditRecorded", { ... } )`. `extensions.disable` acepta `extension:method` para apagar un solo listener.

Los eventos de ColdBox (`preProcess`, `postProcess` y el resto) no forman parte del chat de terminal; solo se disparan en un agente servido.

## Atajos y estado

`@Key` asocia teclas del chat de terminal a un método. En un método de comando ejecuta ese comando, con las mismas reglas y eventos que escribirlo; en cualquier otro método llama al método con el `agentContext` y un texto vacío y muestra lo que devuelve. `@Hint` (o `hint` en la forma struct) dice qué hace.

```js
@Command
@Hint( "contar un pulso" )
@Key( "ctrl+g" )
function pulse( agentContext, commandArguments ) { ... }

@Key( { keys : [ "ctrl+y", "alt+y" ], hint : "reiniciar la cuenta" } )
function resetPulse( agentContext, commandArguments ) { ... }
```

Un atajo se llama `extensión:método` (`pulse:pulse`). `/keys` lo lista junto a los integrados, y la persona puede darle otras teclas bajo `chat: keys:` en `~/.bxagents/bxAgents.yml`. Una tecla que ya usa una acción integrada, o que tiene una extensión anterior, se rechaza con una frase que lo dice. Un borrador escrito se queda en la caja mientras se ejecuta el atajo. Los atajos son del chat de terminal; la página web y las plataformas de chat tienen comandos.

`@Status` es un dato de estado junto al tamaño del contexto: un método que devuelve un texto corto, consultado cada vez que se dibuja la caja en la terminal y tras cada cambio de la conversación en la página web (pequeñas etiquetas en la cabecera). Devuelve una cadena vacía para no mostrar nada. Debe ser rápido; el que lanza un error se omite y el motivo se anota una vez en su extensión.

```js
@Status
function beats( agentContext ) {
	return variables.beats > 0 ? "pulso #variables.beats#" : ""
}
```

`extensions.disable` acepta `extensión:método` también para un atajo o un elemento de estado.

## `register( registry )`

Lo que las anotaciones no pueden decir, porque se calcula en código, se dice con llamadas. Si la clase tiene un método `register( registry )`, se llama una vez, justo después de `configure()`:

```js
function register( registry ) {
	registry.command( "deploy", { run : ( agentContext, commandArguments ) => ..., hint : "publicar", admin : true, aliases : [ "ship" ] } )
	registry.key( "ctrl+d", "/deploy", { hint : "publicar" } )                    // un atajo que ejecuta una línea de comando
	registry.key( "ctrl+o", ( agentContext ) => "abierto", { name : "open", hint : "abrir" } )   // o cualquier función
	registry.status( "branch", ( agentContext ) => "main" )
	registry.on( "onChatCommandAfter", ( data ) => ... )                         // un evento, o un array de ellos
}
```

## Prefijos y fuentes `@`

Ambos son solo para el chat de terminal.

`@Prefix` reclama el comienzo de una línea en la caja de mensajes. El método recibe el `agentContext` y el texto que sigue al prefijo. Responde de una de dos formas: un `Reply` (o una cadena) se muestra y no se envía nada, y `{ send : "texto" }` se envía al agente como mensaje, después de que `onChatInput` lo haya visto.

```js
@Prefix( "%" )
@Hint( "pedir una explicación: % por qué el cielo es azul" )
function explain( agentContext, text ) {
	return { send : "Explica esto en un párrafo corto: #text#" }
}

@Prefix( "=" )
function count( agentContext, text ) {
	return agentContext.reply().ok( "#text.listToArray( ' ' ).len()# palabras" )
}
```

`/`, `!`, `#` y `@` son del propio chat, y un `?` solo pide las teclas; un prefijo que empieza con uno de ellos, está vacío o tiene un espacio se rechaza con una frase. Gana el prefijo más largo. Dos extensiones con el mismo prefijo son un aviso y gana la capa posterior.

`@Source( "ticket" )` trae contenido junto al mensaje como `@ruta` trae un archivo. Escribe `@ticket:TCK-1` (o `@ticket:"dos palabras"`) y se llama al método con el `agentContext` y la consulta. Devuelve `{ name, content }`, un array de ellos o una cadena; el contenido viaja con el mensaje y la mención se queda en él. `@Suggest( "ticket" )` en otro método es opcional: devuelve los valores que ofrece el menú mientras se escribe tras los dos puntos. Se consulta en cada tecla, así que debe ser rápido; el que lanza un error no da sugerencias y el motivo se anota una vez en su extensión. El nombre de una fuente puede ser cualquiera que empiece con una letra, ya que los archivos son `@ruta` a secas.

```js
@Source( "ticket" )
function ticket( agentContext, query ) { return { name : "ticket #query#", content : tickets[ query ] } }

@Suggest( "ticket" )
function ticketNames( agentContext, query ) { return tickets.keyArray() }
```

Escrito como llamadas: `registry.prefix( "%", ( agentContext, text ) => ..., { hint : "..." } )` y `registry.source( "ticket", ( agentContext, query ) => ..., { hint : "...", suggest : ( agentContext, query ) => [ ... ] } )`.

La persona elige el prefijo o el nombre, por el id `extensión:método`, en `~/.bxagents/bxAgents.yml`:

```yaml
chat:
  prefixes:
    desk:explain: "?%"
  sources:
    desk:ticket: issue
```

Una elección que no se puede usar se avisa y se mantiene la de la extensión. `extensions.disable` acepta `extensión:método` también para estos.

## Preguntar a la persona

Un comando, atajo o prefijo puede hacer una pregunta a la persona mientras se ejecuta:

```js
var title    = agentContext.ask( "¿Título del ticket?", { default : commandArguments, help : "Una frase corta." } )
var priority = agentContext.choose( "¿Prioridad?", [ "low", "normal", { value : "high", label : "high", hint : "alguien está bloqueado" } ] )
if ( agentContext.confirm( "¿Crear el ticket #priority#?" ) ) { ... }
```

`ask()` devuelve el texto, `choose()` devuelve el valor elegido y `confirm()` es verdadero solo con un sí. Esc da `null` (`false` en `confirm()`). Las preguntas funcionan solo en el chat de terminal. Donde nadie puede responder (la página web, las plataformas de chat, un servidor) responden al instante con `null` (`false`) en vez de esperar, y `agentContext.canAsk()` lo dice de antemano para que un comando pueda avisar.

## Recargar

`/reload` carga de nuevo las extensiones sin salir del chat: ejecuta `onUnload()` de lo cargado, vuelve a leer `~/.bxagents/bxAgents.yml` y los ajustes `extensions:` de `Agent.yaml`, y carga lo que encuentra, con sus comandos, atajos, elementos de estado, prefijos, fuentes y oyentes. Una extensión que no carga se avisa y se deja fuera; las demás cargan. Es para administradores y solo en el chat de terminal: una app servida registra schedulers y oyentes de ColdBox al arrancar, así que se reinicia.

## La página web: slots y `web/`

Dos formas de añadir a la página web. Ambas se sirven con la página; el chat de terminal no tiene página, así que allí se ignoran.

**Los slots** ponen una cadena en un lugar con nombre de la página: `header` (una etiqueta junto al tamaño del contexto), `sidebar` (un panel bajo la lista de conversaciones) o `composer` (junto al botón Attach). El método recibe el `agentContext` y devuelve la cadena:

```js
@Slot( "header" )
function badge( agentContext ) { return variables.pings > 0 ? "#variables.pings# pings" : "" }

@Slot( { place : "sidebar", html : true } )
function about( agentContext ) { return "<strong>Panel</strong><br>Usa el botón Ping." }
```

La cadena se muestra como texto. Solo un slot que diga `html : true` tiene su cadena puesta en la página como marcado; es el autor diciendo que es su propio marcado, así que nunca debe llevar lo que escribió un visitante (usa `encodeForHTML()`). Una cadena vacía no muestra nada. La página pide todos los slots en una sola petición, `GET <path>/api/slots?conversationId=`, tras el mismo inicio de sesión o clave de API que el resto de la API de la página, cada vez que refresca el tamaño del contexto. Un slot que lanza un error se omite y el motivo se anota una vez en su extensión. Escrito como llamada: `registry.slot( "header", ( agentContext ) => "...", { html : false, name : "badge" } )`. `extensions.disable` acepta `extensión:método` para un slot.

**`web/`** es una carpeta dentro de una extensión de carpeta. La compilación la copia a `<path>/ext/<nombre>/` junto a la página, así que todo archivo en ella (también imágenes) se sirve desde ahí. Los archivos `*.css` y `*.js` que están directamente en `web/` se enlazan en la página, por orden de nombre: estilos en el head y scripts al final del body. Una extensión desactivada por nombre en `extensions.disable` no aporta nada.

```
extensions/panel/
  Extension.bx
  web/
    panel.css
    panel.js
    logo.png        se sirve en <path>/ext/panel/logo.png
```

La página da a los scripts un objeto pequeño, `bxagents`:

| | |
|---|---|
| `bxagents.slot( place )` | una caja propia en `header`, `sidebar` o `composer`, para dibujar en ella |
| `bxagents.runCommand( "/ping" )` | ejecuta un comando como si se hubiera escrito |
| `bxagents.onRefresh( fn )` | se llama tras cada cambio de la conversación, una vez dibujados los slots |
| `bxagents.refresh()` | pide a la página que refresque ya |
| `bxagents.conversationId()` | la conversación a la vista |
| `bxagents.apiBase` | la ruta de la API de la página, para tus propios `fetch` |

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

Las extensiones aún no pueden añadir gateways, verbos de CLI, herramientas y skills. Eso viene después.
