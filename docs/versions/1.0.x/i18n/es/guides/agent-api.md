---
title: "Guía: Llama a tu agente desde código"
icon: phosphor-duotone:plugs
summary: "Una sola API HTTP mueve la página web, el terminal y tus programas. Abierta en tu máquina, con tokens cuando la compartes. Llámala con curl, el cliente de BoxLang o cualquier herramienta OpenAPI."
description: "La API del agente: acceso abierto o con token, ejemplos con curl y BoxLang, los frames del stream, control de ejecuciones, conversaciones, gestión de tokens de acceso por la API y el documento OpenAPI."
tags: [guides, api, tokens, client]
---

# Llama a tu agente desde código

Todo agente construido sirve una API HTTP en `/__bxagents`. La página de chat web, el chat de terminal y los gateways usan la misma, así que todo lo que ellos hacen, tu programa también puede hacerlo. Esta guía es el recorrido; cada ruta, con su petición y su respuesta, está en el [documento OpenAPI](#el-documento-openapi) que entrega el servidor, y los ajustes están en [agentApi](../conventions/agent-bx.md#la-ruta-de-agente-siempre-activa).

El proyecto en [`examples/api-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/api-agent) ejecuta todo lo de abajo.

## Abierta o con token

Dos maneras de ejecutar, elegidas con `agentApi` en `Agent.yaml`.

| | Ajustes | Quién puede llamar |
|---|---|---|
| Abierta (por defecto) | nada | Cualquiera que llegue al puerto. Todos son un solo usuario, `local`. Déjala en `127.0.0.1`; `serve` imprime un aviso cuando una API abierta escucha en todas las interfaces. |
| Con token | `tokenEnvVar: MY_SECRET` y/o `tokens: true` | Quien envíe `x-bxagents-token`. El secreto compartido es admin; los tokens emitidos son `chat` o `admin`. Todo lo demás recibe `401`. |

También puedes limitar quién llama con `allowedIPs` y cuántas veces con `rateLimit`; ambos sirven abierta o cerrada.

```yaml
agentApi:
  tokenEnvVar: TOKEN_FOR_ADMIN   # el NOMBRE de una variable de entorno
  tokens: true                   # acepta también tokens hechos con `bxAgents token create`
  manageTokens: true             # un admin puede crear y revocar tokens por la API
```

## Con curl

```bash
export T="x-bxagents-token: $TOKEN_FOR_ADMIN"

curl -H "$T" http://127.0.0.1:8080/__bxagents/whoami

curl -H "$T" -H "Content-Type: application/json" \
     -d '{"input":"¿Qué puedes hacer?"}' \
     http://127.0.0.1:8080/__bxagents/invoke
```

`invoke` responde `{ "success": true, "output": "...", "threadId": "..." }`. Envía `conversationId` para continuar una conversación; el agente la recuerda por ti.

## Con BoxLang

```javascript
import bxModules.bxagents.models.api.AgentApiClient;

client = new AgentApiClient( url = "http://127.0.0.1:8080", token = getSystemSetting( "TOKEN_FOR_ADMIN" ) );

first = client.invoke( "¿Qué puedes hacer?" );
println( first.output );

// el texto a medida que se escribe
client.stream( "Dilo más corto.", ( text ) => print( text ), first.threadId );
```

Construye el cliente con argumentos con nombre. Hay un método por cada ruta: `invoke`, `stream`, `events`, `resume`, `cancel`, `steer`, `sessions`, `history`, `export`, `notes`, `preferences`, `command`, `tokens` y el resto. Una petición incorrecta vuelve como `{ success: false, error, code }`; un token rechazado, una ruta que falta o un fallo del servidor se lanzan como error. Pasa `path` cuando el servidor movió la API con `agentApi.path`, y `source` para nombrar tu programa en la lista de conversaciones.

## Streams

`stream` y `events` responden con eventos enviados por el servidor: cada frame es `event: <nombre>` y luego `data: <json>`.

| Frame | Significado |
|---|---|
| `thread` | Primer frame: el id de la ejecución, para `cancel`, `steer` y `resume`. |
| `chunk` | Un trozo de lo que dice el modelo. |
| `tool` | Una llamada a tool empezó (`running`) o terminó (`ok`). Solo `events`. |
| `suspended` | La ejecución se detuvo a la espera de aprobación. Responde con `resume`. Solo `events`. |
| `error` | La ejecución falló. |
| `done` | Último frame. |

`stream` lleva `thread`, `chunk` y `done`. `events` los lleva todos, y el cliente los convierte en eventos para tu callback: `thread`, `delta`, `reasoning`, `tool`, `suspended`, `error`.

## Control de ejecuciones

Una ejecución pertenece a quien la empezó.

| Llamada | Hace |
|---|---|
| `cancel( threadId )` | La detiene. Solo su dueño, o un admin. |
| `steer( threadId, input )` | Añade un mensaje a una ejecución en marcha. |
| `pending( threadId )` y `resume( threadId, decision )` | Aprobar, rechazar o editar lo que quiere hacer una ejecución detenida. |

## Conversaciones, notas y ajustes

Las conversaciones también pertenecen a quien llama: `sessions()` las lista, las más nuevas primero (un admin puede pasar `all = true` para ver las de todos), y `createSession`, `renameSession`, `forkSession`, `deleteSession`, `history` y `export` trabajan sobre una. `notes()` y `preferences()` guardan lo que el agente debe recordar de quien llama. `command( "/context" )` ejecuta cualquier [comando de barra](slash-commands.md) que esa persona pueda usar.

## Tokens de acceso por la API

Con `manageTokens: true` un admin puede crear tokens sin una shell en el servidor:

```javascript
made = client.createToken( name = "ci", scope = "chat", expires = "90d" );
println( made.token );        // se muestra una vez; el servidor guarda solo una huella
client.revokeToken( "ci" );
```

La misma lista, creación y revocación están en el panel **Tokens** de la [página web](../conventions/web-ui.md) (se muestra a los admins en un servidor que lo permite). Un token `chat` recibe `403`. Sin `manageTokens`, las rutas no existen.

## Errores

Todo error es `{ "success": false, "error": "texto para personas", "code": "codigo_para_maquinas" }`.

| Estado | Códigos |
|---|---|
| 400 | `bad_request`, `bad_profile`, `bad_attachment` |
| 401 | `unauthorized` |
| 403 | `forbidden`, `csrf`, `not_your_run` |
| 404 | `not_found`, `no_notes` |
| 405 | `method_not_allowed` |
| 409 | `busy` (ya hay una ejecución en esa conversación) |
| 429 | `rate_limited` de una comprobación de token; la guarda `rateLimit` (Throttle de cbSecurity) responde `{ "error": true, "messages": [...] }` con una cabecera `Retry-After` |

## El documento OpenAPI

```bash
curl -H "$T" http://127.0.0.1:8080/__bxagents/openapi > agent-api.json
```

Es un documento OpenAPI 3 de las rutas que este servidor realmente tiene: cada ruta, lo que recibe y responde, la cabecera de token en una API cerrada y los frames del stream. Pásalo a un generador de clientes o a una herramienta como Swagger UI o Postman. Las rutas, el documento y el cliente de BoxLang salen de una sola lista, y una prueba falla cuando discrepan.
