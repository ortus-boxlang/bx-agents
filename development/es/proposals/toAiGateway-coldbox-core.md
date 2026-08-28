---
title: toAiGateway() para ColdBox Core
icon: phosphor-duotone:lightbulb
summary: "Propuesta preliminar: un hermano con forma de gateway para el propio toAi() de ColdBox."
description: "Propuesta preliminar: un hermano con forma de gateway para el propio toAi() de ColdBox."
tags: [proposals]
---

# Propuesta: `toAiGateway()` — un terminador nativo del DSL de enrutamiento de ColdBox para la superficie de webhook de Gateway de bx-ai

Estado: borrador, escrito desde BxAgents (`ortus-boxlang/bx-agents`). Actualización desde el
primer borrador: `coldbox-platform` (específicamente ColdBox mismo, `Router.cfc`) SÍ se adjuntó y
se leyó directamente después en esta misma sesión — el límite entre propietarios resultó ser
por-estado-de-sesión, no permanente; una vez que el zip de `ColdBox/coldbox-platform` se obtuvo de
su URL de descarga real y se descomprimió, su código fuente de `system/web/routing/Router.cfc` se leyó
en su totalidad. Eso resolvió los dos elementos "vale la pena confirmar" de abajo y, más importante,
corrigió un error real que la sección `toAi()`/`IAiRunnable` de esta propuesta había heredado de
un pase anterior solo de documentación (ver las notas de corrección en línea).

## Por qué

ColdBox 8.1 envía dos terminadores de DSL de enrutamiento específicos de IA:

- `route(pattern).toAi(target)` — 4 rutas auto-registradas (`invoke`/`stream`/`batch`/`info`)
  contra un objetivo `IAiRunnable`.
- `route(pattern).toMCP(target)` — 1 ruta, despacha a `MCPRequestProcessor`.

bx-ai también envía una tercera superficie HTTP que no tiene ningún terminador de ColdBox en absoluto: la
superficie de webhook de channel-adapter `IGateway`/`aiGatewayRegistry()` (entrega Slack/webhook,
aprobación human-in-the-loop), gestionada por un procesador fijo de 3 rutas
(`bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()`). Hoy,
usarla desde una app ColdBox significa cablear a mano 3 rutas simples a un handler de passthrough.
Ese es exactamente el tipo de cableado que `toAi()`/`toMCP()` ya existen para ahorrarle a la gente
hacer a mano para las otras dos superficies de bx-ai — esto propone cerrar la brecha con un
tercer terminador, `toAiGateway()`, construido de la misma manera.

BxAgents (un módulo de framework de agentes basado en convenciones sobre bx-ai + ColdBox) está
enviando este cableado por su cuenta mientras tanto — ver "Workaround actual" abajo — precisamente
para que pueda eliminarse una vez que esto aterrice en el núcleo.

## Lo que ya está probado (verificado contra el código fuente de `bx-ai` esta sesión)

`bxModules.bxai.models.gateway.http.GatewayRequestProcessor`:

```javascript
static string function processHttp() {
    var requestData = static.httpTransport.readRequest();
    var response     = route( requestData );
    static.httpTransport.writeResponse( response );
    return response.content;
}
```

- **Sin argumentos, estático.** Lee el request HTTP en vivo él mismo (vía `cgi.PATH_INFO`,
  `cgi.REQUEST_METHOD`, `getHTTPRequestData()`) y escribe la respuesta él mismo (vía
  `bx:header`/`bx:content reset=true`). No necesita — y no puede usar — el
  `event`/`rc`/`prc` de ColdBox para su propia lógica.
- **Enruta internamente basándose en `cgi.PATH_INFO`**, esperando exactamente 3 formas:
  - `POST /gateways/{gatewayName}/events` — evento de plataforma entrante
  - `GET  /interactions/{requestID}` — hacer poll de una interacción de aprobación humana pendiente
  - `POST /interactions/{requestID}/decisions` — enviar la decisión de un humano
  - (más `OPTIONS` de preflight CORS, también manejado internamente)
- Porque analiza los segmentos de ruta él mismo, cualquier cosa que lo gestione debe exponer estas 3 formas
  **textualmente** (sin prefijo de ruta extra) para que coincidan las comprobaciones de conteo de segmento/nombre en
  `GatewayRequestProcessor.route()`.
- `aiGatewayRegistry()` resuelve gateways por nombre; nada sobre el enrutamiento necesita el
  contenido del registro, solo que los gateways se hayan registrado en algún momento antes de que llegue un
  request (típicamente en el arranque de la app).

Esto significa que `toAiGateway()` no necesita **ninguna interfaz de adaptador en absoluto** — a diferencia del
`IAiRunnable` de `toAi()`, no hay nada que una clase objetivo deba implementar. Todo el trabajo del
terminador es registrar las rutas correctas a la llamada estática correcta y decirle a ColdBox que no
renderice nada después (el procesador ya escribió la respuesta real).

## Implementación propuesta del núcleo

Un único terminador, auto-registrando 3 rutas (reflejando la forma de "una llamada → N
rutas" de `toAi()`) sin **ningún argumento de objetivo** (reflejando la forma sin objetivo de
`toMCP()`, ya que el enrutamiento es impulsado por nombre desde la propia URL, no desde un mapeo de
WireBox):

```javascript
route( "/bxai" ).toAiGateway();
```

registra, en relación a donde sea que `route()` ancle su patrón:

| Verbo | Ruta | Comportamiento |
|---|---|---|
| POST | `{pattern}/gateways/:gatewayName/events` | evento de plataforma entrante |
| GET  | `{pattern}/interactions/:requestID` | hacer poll de la interacción |
| POST | `{pattern}/interactions/:requestID/decisions` | enviar decisión humana |

Las 3 despachan a la misma acción generada/interna, que no hace nada más que:

```javascript
function process( event, rc, prc ) {
    bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp();
    return event.noRender();
}
```

Pregunta abierta para quien implemente esto contra el código fuente real de `Route.bx`: si el
prefijo `{pattern}` es seguro dado que `GatewayRequestProcessor` analiza `cgi.PATH_INFO`
asumiendo **sin prefijo** (ver la nota "textualmente" arriba). Dos formas de resolverlo, en orden
de preferencia:
1. `toAiGateway()` siempre ancla en la raíz de la app (ignora/rechaza un patrón no vacío),
   ya que la propia lógica de análisis de ruta del procesador no puede tolerar un prefijo de todos modos.
2. Si la reescritura de URL de ColdBox siempre hace que `cgi.PATH_INFO` refleje la ruta completa
   solicitada (típico en despliegues de ColdBox de reescribir-todo-a-index.bxm), un prefijo "simplemente
   funciona" de forma transparente y esto en realidad no es una restricción — verificar empíricamente antes de
   elegir cualquiera de las dos opciones.

Los modificadores de ruta estándar (`.as()`, `.withModule()`, `.withDomain()`, etc.) deberían aplicarse
de la misma manera que lo hacen para `toAi()`/`toMCP()`.

## Workaround actual (BxAgents, a eliminar una vez que esto aterrice)

El pipeline de build de BxAgents genera el cableado equivalente a mano hoy:

- `RouterGenerator.bx` emite, solo cuando al menos un gateway de channel-adapter de tipo `http`
  está configurado:
  ```javascript
  post( "/gateways/:gatewayName/events" ).toHandler( "Gateway.process" )
  get( "/interactions/:requestID" ).toHandler( "Gateway.process" )
  post( "/interactions/:requestID/decisions" ).toHandler( "Gateway.process" )
  ```
- `GatewayGenerator.bx` emite un `handlers/Gateway.bx` generado con exactamente una acción:
  ```javascript
  function process( event, rc, prc ) {
      bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()
      return arguments.event.noRender()
  }
  ```
- Se insertan llamadas `aiGatewayRegistry().register( aiGateway( type, options ) )` en el
  `Application.bx onApplicationStart()` de la app generada, una vez por cada gateway de
  channel-adapter configurado.

Una vez que `toAiGateway()` exista en el núcleo, `RouterGenerator` cambia sus 3 rutas escritas a mano
por una llamada `route( ... ).toAiGateway()`, y `GatewayGenerator` deja de generar
`handlers/Gateway.bx` por completo — pura eliminación, sin lógica nueva del lado de BxAgents necesaria.

## Plan de pruebas para el PR del núcleo

- Unitaria: `route(...).toAiGateway()` registra exactamente 3 rutas, verbos/rutas
  correctos, se aplican los modificadores de ruta estándar.
- Integración: un request en vivo a cada una de las 3 rutas alcanza
  `GatewayRequestProcessor::processHttp()` y devuelve su respuesta textualmente (código de
  estado, cabeceras, cuerpo) — registrar un gateway de tipo `mock` vía `aiGatewayRegistry()` en el
  arnés de pruebas (sin necesidad de red/llamada LLM real, `bx-ai` envía un proveedor `"mock"`
  literal exactamente para esto).
- Regresión: confirmar que `event.noRender()` evita que ColdBox escriba una respuesta por duplicado
  después de que `processHttp()` ya haya vaciado una vía `bx:content reset=true`.

## Confirmado más tarde en esta sesión (actualización)

`ColdBox/coldbox-platform` (8.1.0) se obtuvo directamente (`https://downloads.ortussolutions.com/ortussolutions/coldbox/8.1.0/coldbox-8.1.0.zip`)
y `system/web/routing/Router.cfc` se leyó en su totalidad. Ambos elementos originalmente listados aquí como
"vale la pena confirmar" ahora están resueltos, y una suposición anterior en esta misma propuesta
resultó incorrecta y ha sido corregida:

1. **La resolución del objetivo de `toAi(target)` — confirmada tal como se asumió.** Router.cfc:
   `var runnableInstance = isSimpleValue( capturedRunnable ) ? getInstance( capturedRunnable ) : capturedRunnable`.
   Una cadena se resuelve vía `getInstance()` de WireBox; un objeto en vivo se usa directamente.

2. **El contrato real de `IAiRunnable` — CORREGIDO, no lo que esta propuesta originalmente decía.**
   La sección "Lo que ya está probado" de arriba (sin cambios, todavía precisa para la superficie de
   Gateway) se escribió solo a partir del código fuente de bx-ai. Por separado, el propio trabajo M8 de
   BxAgents dependió de una descripción de la *documentación publicada* del contrato de objetivo de
   `toAi()` que resultó ser incorrecta: `invoke`/`stream`/`batch`/`info` son los **nombres de las
   subrutas**, no nombres de métodos que `toAi()` llama en el objetivo. Los closures reales de
   Router.cfc llaman a `runnableInstance.run( input, params, options )` y
   `runnableInstance.stream( onChunk, input, params, options )` — es decir, la propia interfaz
   `IAiRunnable` de bx-ai (`bxModules.bxai.models.runnables.IAiRunnable`), que
   `AiAgent` ya implementa nativamente vía `AiBaseRunnable`. **No se necesita ninguna
   subclase de adaptador en absoluto** — el valor de retorno del BIF `aiAgent()` simple ya
   satisface a `toAi()`. El generador de BxAgents se ha corregido para coincidir (ya no hay más
   `GeneratedAgentRunnable.bx`/`exposeAgentAsRunnable`).

3. **El `.toProvider(closure)` de WireBox** — no revisado de nuevo esta sesión (Router.cfc no
   toca la sintaxis de binder de WireBox); todavía es una suposición en el generador `config/WireBox.bx`
   de BxAgents. Riesgo bajo: `.toProvider()` es un DSL de WireBox bien establecido y de uso
   común, simplemente no algo que este pase específico de código fuente haya tocado.
