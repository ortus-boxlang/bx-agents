---
title: "Guía: Llama a tu agente desde código"
icon: phosphor-duotone:plugs
summary: "Una sola API HTTP mueve la página web, el terminal y tus programas. Abierta en tu máquina, con tokens cuando la compartes. Llámala con curl, el cliente de BoxLang o cualquier herramienta OpenAPI."
description: "La API del agente: acceso abierto o con token, ejemplos con curl y BoxLang, los frames del stream, control de ejecuciones, conversaciones, gestión de tokens de acceso por la API y el documento OpenAPI."
tags: [guides, api, tokens, client]
---

# Llama a tu agente desde código

Todo agente construido sirve una API HTTP en `/__bxagents`. La página de chat web, el chat de terminal y los gateways usan la misma, así que todo lo que ellos hacen, tu programa también puede hacerlo. Esta guía es el recorrido; cada ruta, con su petición y su respuesta, está en el [documento OpenAPI](#el-documento-openapi) que entrega el servidor, y los ajustes están en [agentApi](../conventions/agent-bx.md#la-ruta-de-agente-siempre-activa).

<video controls preload="metadata" poster="/assets/video/api-tour-poster.png" style="max-width:100%">
  <source src="/assets/video/api-tour.mp4" type="video/mp4">
  <source src="/assets/video/api-tour.webm" type="video/webm">
  <track kind="captions" src="/assets/video/api-tour.vtt" srclang="en" label="English" default>
</video>

*Dos minutos y medio: modo abierto y su aviso de arranque, modo con token, las protecciones, el cliente de BoxLang, el documento OpenAPI, la página web, el chat de terminal y las sesiones de gateway. Las respuestas del agente son simuladas (el proveedor mock), y la parte de gateway ejecuta las pruebas de sesión de gateway.*

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

El id de hilo del primer frame de una ejecución es todo lo que piden `cancel` y `steer`. Una ejecución en pausa solo la puede reanudar quien la empezó.

| Llamada | Hace |
|---|---|
| `cancel( threadId )` | La detiene. |
| `steer( threadId, input )` | Añade un mensaje a una ejecución en marcha. |
| `pending( threadId )` y `resume( threadId, decision )` | Aprobar, rechazar o editar lo que quiere hacer una ejecución detenida. |

## Conversaciones, notas y ajustes

Las conversaciones también pertenecen a quien llama: `sessions()` las lista, las más nuevas primero (un admin puede pasar `all = true` para ver las de todos), y `createSession`, `renameSession`, `forkSession`, `deleteSession`, `history` y `export` trabajan sobre una. `notes()` y `preferences()` guardan lo que el agente debe recordar de quien llama. `command( "/context" )` ejecuta cualquier [comando de barra](slash-commands.md) que esa persona pueda usar.

![La página Access de la web app, que es un cliente de esta API](../assets/webui/webui-access.png)

## Tokens de acceso por la API

Con `manageTokens: true` un admin puede crear tokens sin una shell en el servidor:

```javascript
made = client.createToken( name = "ci", scope = "chat", expires = "90d" );
println( made.token );        // se muestra una vez; el servidor guarda solo una huella
client.revokeToken( "ci" );
```

La misma lista, creación y revocación están en la pestaña **Tokens** de la página Access de la [app web](../conventions/web-ui.md) (`<path>/access/tokens`, se muestra a los admins en un servidor que lo permite). Un token `chat` recibe `403`. Sin `manageTokens`, las rutas no existen.

## Todas las rutas

Todas las rutas cuelgan de `/__bxagents` (o de tu `agentApi.path`). Hay 76 rutas (83 pares de verbo y ruta); las rutas de tokens solo existen con `manageTokens: true`. La tabla sale de la lista única de `ApiContract.bx` con la que el build crea las rutas y el documento OpenAPI; la autoridad es el documento que un servidor en marcha entrega en `GET /openapi`, que además trae las formas de petición y respuesta. Las descripciones de la columna Hace son las del propio documento OpenAPI, en inglés. **Admin** responde `403` a quien no es admin; **Open** no necesita token ni en una API cerrada.

### Turns

| Ruta | Quién | Hace |
|---|---|---|
| `POST /invoke` | Quien llama | One whole turn: the agent's answer once it is done. |
| `POST /stream` | Quien llama | One turn as a stream of thread, chunk and done frames (the small subset of events). |
| `POST /batch` | Quien llama | Several inputs, one after another, in one conversation. |
| `POST /events` | Quien llama | One turn as the full stream: thread, chunk, tool, suspended, error and done frames. |

### About the agent

| Ruta | Quién | Hace |
|---|---|---|
| `GET /info` | Quien llama | What is served: name, model and the routes of the agent. |
| `GET /tools` | Quien llama | The tools the agent has. |
| `GET /health` | Abierta | Is the server up. |
| `GET /profiles` | Quien llama | The models a caller may ask for with options.profile. |
| `GET /whoami` | Quien llama | Who the server takes the caller to be: id, scope and where the call came from. |
| `GET /volumes` | Quien llama | The folders the agent may use, by name and mode. |
| `GET /logs` | Admin | The agent's logs: which there are, or the last lines of one. |
| `POST /gateways/reconnect` | Admin | Stops and starts one gateway in place, so a fixed credential or a dropped connection does not need an app restart. |
| `GET /gateways` | Admin | The gateways and the state of each: connected, which credentials are set (never their values), last activity, last error and the chats each has talked to (ids and when, never text). |
| `GET /skills/read` | Quien llama | One skill's SKILL.md text with its origin, size and when it was saved. |
| `GET /skills` | Quien llama | The skills the agent can load: name, description and whether the project or the agent wrote it. |
| `GET /agent/composition` | Admin | How the agent is put together in one call: what comes in, its parts, the agent tree, what goes out and the tools that ask first. |
| `GET /agent/files` | Admin | The project's own files that are safe to show (Agent.yaml, instructions, tools, skills, subagents, gateways), by relative path and size. |
| `GET /agent/file` | Admin | One of those files as text, read only; secrets in Agent.yaml are shown as stars and a long file is cut. |
| `GET /agent` | Quien llama | The agent in full: model, window, tools, the agent tree (agents, each sub-agent a caller may talk to directly) and what this server can do (capabilities). |
| `GET /usage` | Admin | Tokens by day and by model: a small snapshot, off until usage is turned on (then enabled is false). |
| `GET /data/backups` | Admin | The backups of the data home, newest first, and the restore waiting for the next start. |
| `POST /data/backup` | Admin | Makes a backup of the data home now. |
| `GET /data/backup` | Admin | Downloads one backup as a zip. |
| `POST /data/restore` | Admin | Schedules a backup to be put back the next time the app starts; what is there is kept as before-restore. |
| `POST /extensions/reload` | Admin | Loads the extensions again, as /reload does in the terminal. |
| `GET /extensions` | Admin | The extensions this app loaded, with what each adds and what went wrong. |
| `GET /data` | Admin | Where the agent keeps everything, how big each part is, and where each volume is. |
| `POST /ping` | Quien llama | Asks a model for one word to see that it answers. |
| `GET /context` | Quien llama | What the next turn would send, by part, against the model's window. |
| `GET /status` | Quien llama | The status items extensions show. |
| `GET /slots` | Quien llama | What extensions put in the page's slots. |
| `GET /openapi` | Quien llama | This description of the API, as an OpenAPI 3 document. |

### Runs

| Ruta | Quién | Hace |
|---|---|---|
| `POST /cancel` | Quien llama | Stops a run. |
| `POST /steer` | Quien llama | Adds a message to a run that is going. |
| `POST /resume` | Quien llama | Carries on a run that paused for approval, as a stream. |
| `GET /pending` | Quien llama | What a paused run is waiting to have approved. |

### Conversations

| Ruta | Quién | Hace |
|---|---|---|
| `POST /sessions/rename` | Quien llama | Names one of the caller's conversations. |
| `POST /sessions/fork` | Quien llama | Copies a conversation under a new name. |
| `POST /sessions/delete` | Quien llama | Deletes a conversation and its messages. |
| `POST /sessions` | Quien llama | Starts a conversation, for the main agent or one named in agent. |
| `GET /sessions` | Quien llama | A page of the caller's conversations, newest first, with the total that match. |
| `GET /export` | Quien llama | One conversation as a file, Markdown or a page of HTML. |
| `GET /history` | Quien llama | The messages of one conversation. |
| `POST /clear` | Quien llama | Deletes the messages of a conversation, keeps the conversation. |
| `POST /compact` | Quien llama | Summarizes the older messages and keeps the recent ones. |
| `POST /memory/clear` | Quien llama | Forgets the messages of conversations and keeps the conversations: one of the caller's (conversationId), or with all (an admin) every conversation, or those of one agent. |

### Routines

| Ruta | Quién | Hace |
|---|---|---|
| `POST /routines/reports/clean` | Quien llama | Removes the reports of a routine older than some days, or all of them. |
| `POST /routines/reports/delete` | Quien llama | Removes one report file of a routine. |
| `GET /routines/reports` | Quien llama | The report files of a routine, newest first. |
| `GET /routines/report` | Quien llama | One report file of a routine as text; a long one is cut and says so. |
| `POST /routines/update` | Quien llama | Changes a routine's schedule, prompt or where its answer goes. |
| `POST /routines/pause` | Quien llama | Stops a routine from running until it is resumed. |
| `POST /routines/resume` | Quien llama | Starts a paused routine again and forgets its failures. |
| `POST /routines/run` | Quien llama | Makes a routine due now; the heartbeat starts it within a minute. |
| `POST /routines/delete` | Quien llama | Deletes a routine. |
| `GET /routines/schedule` | Quien llama | What a schedule means before it is saved: the stored form, the reading in words and the next run. |
| `GET /routines/get` | Quien llama | One routine in full, with its prompt. |
| `POST /routines` | Quien llama | Makes a routine. |
| `GET /routines` | Quien llama | The caller's routines with the schedule in words, status, next and last run and where the answer goes. |

### Vault

| Ruta | Quién | Hace |
|---|---|---|
| `GET /vault/activity` | Admin | The vault's key status and its recent audit lines: what was used, by whom and when. |
| `POST /vault/update` | Quien llama | Changes a secret: its value, description or hosts. |
| `POST /vault/remove` | Quien llama | Removes a secret. |
| `POST /vault` | Quien llama | Stores a secret. |
| `GET /vault` | Quien llama | The secrets the caller can use, by name, never a value: their own and the agent's. |

### Accounts

| Ruta | Quién | Hace |
|---|---|---|
| `POST /users/admin` | Admin | Makes an account an admin, or takes that away. |
| `GET /users` | Admin | The sign-in accounts and whether each is an admin. |

### Preferences

| Ruta | Quién | Hace |
|---|---|---|
| `POST /preferences/set` | Quien llama | Keeps one setting of the caller. |
| `POST /preferences/delete` | Quien llama | Forgets one setting of the caller. |
| `GET /preferences` | Quien llama | The caller's settings. |

### Commands

| Ruta | Quién | Hace |
|---|---|---|
| `GET /commands` | Quien llama | The slash commands this caller may run. |
| `POST /command` | Quien llama | Runs one slash command. |

### Connections

| Ruta | Quién | Hace |
|---|---|---|
| `GET /connect/callback` | Abierta | Where a provider sends the person back after they sign in. |
| `POST /connect/remove` | Quien llama | Forgets the caller's sign in to one server. |
| `POST /connect` | Quien llama | Starts a sign in for the caller and answers with the address to send them to. |
| `GET /connect` | Quien llama | The servers that ask people to sign in, and which the caller has connected. |

### Notes

| Ruta | Quién | Hace |
|---|---|---|
| `POST /notes/clear` | Quien llama | Removes every note of one scope and says how many: the caller's own (user) or the agent's (agent, which takes an admin). |
| `POST /notes/update` | Quien llama | Changes a note. |
| `POST /notes/remove` | Quien llama | Removes a note. |
| `POST /notes` | Quien llama | Adds a note. |
| `GET /notes` | Quien llama | The notes about the caller and about the agent's own work. |

### Tokens

| Ruta | Quién | Hace |
|---|---|---|
| `POST /tokens/revoke` | Admin | Stops a token working. |
| `POST /tokens` | Admin | Makes an access token. |
| `GET /tokens` | Admin | The access tokens, never a secret. |

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
