---
title: "Comandos con barra"
icon: phosphor-duotone:command
summary: "Los 26 comandos del chat: qué hace cada uno, dónde funciona (terminal, página web, plataformas de chat) y un ejemplo."
description: "Los 26 comandos del chat: qué hace cada uno, dónde funciona (terminal, página web, plataformas de chat) y un ejemplo."
tags: [guides, cli, tui, reference]
---

# Comandos con barra

Escribe `/` en el chat de terminal o en el [chat web](../conventions/web-ui.md#comandos-con-barra) para ver los comandos. Cada uno se escribe una sola vez, como una clase pequeña que responde con datos, y cada superficie dibuja esa respuesta a su manera. En las [plataformas de chat](../conventions/gateways/index.md#comandos-en-un-gateway) escribe el comando como un mensaje; el prefijo por defecto es `/` y un gateway puede cambiarlo.

**Dónde** es `T` terminal, `W` página web, `G` plataformas de chat. Un comando marcado con `G` aún debe estar en la lista `allow` del gateway; la lista por defecto es `help`, `info`, `tools`, `model`, `ping`, `notes` y `remember`.

![/sessions tras poner nombre y bifurcar una conversación](../assets/tui/chat-sessions.png)

*`/name`, `/fork` y `/sessions` en un chat real.*

## Conversaciones

| Comando | Dónde | Hace | Ejemplo |
|---|---|---|---|
| `/new` | T W G | Empieza una conversación nueva. La anterior sigue en la lista | `/new` |
| `/sessions` | T W G | Lista tus conversaciones recientes, numeradas | `/sessions` |
| `/resume [número o id]` | T W G | Vuelve a una y muestra lo que se dijo. Sin argumento: la más reciente | `/resume 2` |
| `/name <nombre>` | T W | Pone nombre a esta conversación | `/name Quarterly plan` |
| `/fork [nombre]` | T W | Copia esta conversación, con todos sus mensajes, y sigue en la copia | `/fork Other approach` |
| `/clear` | T W G | Olvida los mensajes de esta conversación, conserva la conversación | `/clear` |
| `/compact` | T W G | Sustituye los mensajes antiguos por un resumen. Necesita un modelo de resumen en la memoria del agente | `/compact` |
| `/export [archivo] [--format=md\|html]` | T W | Guarda la conversación. El nombre del archivo decide el formato salvo que `--format` diga otro | `/export plan.html` |
| `/exit` (alias `/quit`) | T | Sale del chat | `/exit` |

En un gateway, `/new`, `/clear`, `/compact`, `/sessions` y `/resume` están desactivados hasta que el gateway defina `commands.conversation: true`.

## Saber qué está pasando

| Comando | Dónde | Hace | Ejemplo |
|---|---|---|---|
| `/help` | T W G | Lista los comandos que puedes ejecutar aquí | `/help` |
| `/info` | T W G | Agente, modelo, conversación, número de mensajes, notas y base de datos | `/info` |
| `/tools` | T W G | Lista las tools del agente | `/tools` |
| `/context` | T W | Qué tamaño tiene el contexto y de qué se compone. Se calcula en local, sin llamar al modelo | `/context` |
| `/stats [días] [--by=model\|provider\|day\|user]` | T | Tokens que usaron las llamadas al modelo. `/stats enable` activa el registro de uso | `/stats 7 --by=day` |
| `/keys` | T W | Qué tecla hace qué, con el nombre de la acción de cada una. `?` solo hace lo mismo | `/keys` |

## Modelos

| Comando | Dónde | Hace | Ejemplo |
|---|---|---|---|
| `/model` | T W G | Muestra el modelo en uso, su perfil, la ventana de contexto y el soporte de imágenes | `/model` |
| `/profile [nombre]` | T | Elige un [perfil](../conventions/models.md#perfiles) de una lista, o cambia directo a uno. La conversación se conserva | `/profile fast` |
| `/default` | T | Vuelve al modelo por defecto de la app | `/default` |
| `/ping [perfil]` | T W G | Comprueba que el modelo responde, con una pregunta mínima. Indica cuánto tardó, o por qué no lo hizo | `/ping fast` |

Con `--connect` o `--server`, `/profile` solo puede cambiar entre los perfiles que el servidor lista en [`agentApi.profiles`](../conventions/agent-bx.md#agentapi).

## Notas

| Comando | Dónde | Hace | Ejemplo |
|---|---|---|---|
| `/remember <texto>` | T W G | Guarda una nota sobre ti | `/remember I prefer short answers` |
| `/notes` | T W G | Abre la pantalla de notas (terminal) | `/notes` |
| `/notes list` | T W G | Imprime tus notas y las del agente, con lo llena que está cada lista | `/notes list` |
| `/notes add [agent] <texto>` | T W G | Añade una nota sobre ti, o con `agent` sobre el trabajo del agente | `/notes add agent Use metric units` |
| `/notes edit <id> <texto>` | T W G | Cambia una nota; el id es el código corto de la lista | `/notes edit a3f New text` |
| `/notes remove <id>` | T W G | Elimina una nota. Eliminar una del agente necesita un token `admin` con `--connect` | `/notes remove a3f` |
| `/notes stats` | T W G | Caracteres usados frente al límite, y los tokens aproximados que añaden | `/notes stats` |

## Tu terminal

Estos actúan sobre tu propia máquina o tu propia sesión, así que se quedan en la terminal (`/extensions` también funciona en la página web).

| Comando | Dónde | Hace | Ejemplo |
|---|---|---|---|
| `/extensions [nombre]` | T W | Lista las extensiones que carga el chat y lo que añadió cada una; con un nombre, una en detalle | `/extensions` |
| `/reload` | T | Carga de nuevo las extensiones y sus ajustes. Solo administradores | `/reload` |
| `/prompt [estilo]` | T | Muestra o cambia el aspecto del cuadro de mensaje para este chat | `/prompt box`, `/prompt top +git -clock` |
| `/copy` | T | Copia la última respuesta al portapapeles (OSC 52, respetado por la mayoría de las terminales) | `/copy` |
| `/record [archivo]`, `/record stop` | T | Graba la pantalla como un archivo `.cast` | `/record demo.cast` |

## Añadir los tuyos

`/extensions` y `/reload` vienen con el soporte de [extensiones](../conventions/extensions.md). Una extensión añade al chat comandos como `/deploy` o `/roll 2d6`, y [una primera extensión](first-extension.md) recorre una. Los comandos por HTTP son `GET /__bxagents/commands` y `POST /__bxagents/command`, consulta [Control de ejecución](../conventions/agent-bx.md#control-de-ejecución).
