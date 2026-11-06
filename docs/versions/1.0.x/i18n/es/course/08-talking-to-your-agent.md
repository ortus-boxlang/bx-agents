---
title: "Lección 8: Hablar con tu agente"
icon: phosphor-duotone:chat-circle-text
summary: chat, invoke y serve - tres formas de ejecutar exactamente el mismo agente construido.
description: chat, invoke y serve - tres formas de ejecutar exactamente el mismo agente construido.
tags: [course, cli]
---

# Hablar con tu agente

Una vez construido tu proyecto ([Lección 7](07-building-your-agent.md)), hay tres formas de
ejecutarlo - todas cargan exactamente el mismo `GeneratedAgentFactory.bx` y construyen
exactamente el mismo árbol de agentes, así que nunca divergen entre sí.

## `chat` - un chat de terminal a pantalla completa

```bash
bxAgents chat                                  # rápido, en el mismo proceso
bxAgents chat --server [--port=<puerto>]       # aplicación completa, servidor propio desechable
bxAgents chat --connect=http://127.0.0.1:8080  # aplicación completa, servidor que ya tienes en marcha
bxAgents chat --connect=https://agent.example.com --token=<token>   # un servidor que pide token
```

En una terminal esto dibuja un chat a pantalla completa, no un prompt pelado (el recorrido está en
[La interfaz de terminal](../guides/terminal-ui.md)). Los turnos terminados son texto normal de la
terminal, así que tu scrollback y la búsqueda siguen funcionando. Las respuestas llegan en streaming
como Markdown con formato, las llamadas a tools muestran sus argumentos y cuánto tardaron, y una
ejecución que necesita aprobación la pide en el sitio. Añade `--no-tui`, o ejecuta sin terminal,
para el prompt de línea a línea.

Qué puedes hacer en él:

- **Teclas.** Enter envía, Alt+Enter añade una línea, Arriba y Abajo recorren tu historial, Esc
  detiene al agente, y un mensaje escrito mientras trabaja lo reconduce. `?` o `/keys` lista
  todas las teclas, y puedes reasignarlas en `~/.bxagents/bxAgents.yml`.
- **Comandos de barra.** Escribe `/` para ver un menú: `/help`, `/tools`, `/model`, `/info` y más.
  Todos los comandos están en [Comandos de barra](../guides/slash-commands.md).
- **Sesiones.** Cada chat es una conversación guardada en `data/chat.db`, la misma lista que muestra
  el chat web. `/sessions` las lista, `/resume` vuelve a una, `/new` empieza otra, `/name` le pone
  nombre, `/fork` la copia y sigue en la copia, y `/export` la guarda como Markdown o HTML.
  `bxAgents chat --continue` reabre la última. Los mensajes duran lo mismo que la memoria del
  agente, así que usa una memoria `file` si los quieres tras un reinicio.
- **Notas.** Con un bloque `notes:` en `Agent.yaml`, `/remember <texto>` y `/notes` guardan notas
  cortas sobre ti que el agente lee al empezar cada conversación.
- **Contexto.** La fila de ayuda bajo la caja muestra cuánto de la ventana del modelo está en uso,
  como `ctx ~12.4k / 128k 9%`. `/context` muestra de qué se compone.
- **Archivos e imágenes.** `@` lista archivos, y `@notes.md` pone el contenido de un archivo de texto
  en tu mensaje. `@picture.png` o Ctrl+V envía una imagen (se rechaza cuando el perfil dice `vision: false`).
- **Grabación.** `bxAgents chat --record=demo.cast`, o `/record` dentro del chat, guarda la pantalla
  como un archivo asciicast para demos.

El modo por defecto carga la factory generada directamente en este proceso - es el más
rápido, pero sin nada de lo que aporta ColdBox (sin scheduler, sin
interceptores, sin registro de gateways). Cuando eso importa, `--server` arranca un
miniserver real y conduce el chat sobre HTTP contra la API de agente de tu
proyecto, y `--connect` hace lo mismo contra un servidor que ya tengas en marcha. Ambos
modos HTTP hacen **streaming** de la respuesta token a token y arrastran la conversación entre
turnos. Si el servidor tiene su API en otro sitio (`agentApi.path`), añade `--api-path=/donde`.
Si pide un token ([Lección 13](13-exposing-http-and-mcp.md)), pasa `--token=<token>` o define `BXAGENTS_TOKEN`.

## `invoke` - un único turno no interactivo

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
```

Existe para scripting y CI, donde el requisito de TTY de `chat` es un bloqueo total. Por
defecto carga la factory generada en el mismo proceso, el mismo camino que usa `chat`
internamente, solo que sin la pantalla de chat - sin ningún requisito previo de `serve`.
`--json` imprime `{"response": "..."}` en lugar de texto plano.

Añade `--server` para lanzar en su lugar un proceso `boxlang-miniserver` real y desechable y
enviar el mensaje como una petición HTTP genuina a la API de agente de tu proyecto -
no hace falta ninguna entrada en `gateways/` (esas llegan en la
[Lección 13](13-exposing-http-and-mcp.md)). Como `serve`, necesita `boxlang-miniserver` en el `PATH`.

## `serve` - un servidor HTTP real

```bash
bxAgents serve --port=8080
```

Requiere un `build` previo y requiere `boxlang-miniserver` en el `PATH` (consulta la
[Lección 3](03-installing-bxagents.md)). Lanza un proceso de servidor real apuntando a
`.build/app`, acotado a su propio directorio BoxLang `.build/runtime` para que la caché de
clases compiladas de cada proyecto quede aislada.

## Probar sin una clave de API real

Todas estas formas necesitan un modelo real para hablar con un proveedor real - pero todavía
no te hace falta uno. (Más adelante, `bxAgents models test` envía a cada modelo una pregunta diminuta, así que una clave o un nombre de modelo equivocados salen a la luz antes que un chat.) Añade una sobrescritura de entorno `test` a `Agent.yaml` (se cubre por completo en
la [Lección 19](19-testing-your-agent.md)):

```yaml
environments:
  test:
    model: mock/mock-model
```

y entonces `bxAgents build --environment=test && bxAgents chat` se ejecuta enteramente contra
el proveedor mock integrado de bx-ai - sin llamadas de red, sin clave de API.

## Pruébalo

```bash
export OPENAI_API_KEY=sk-...   # o usa la sobrescritura mock de arriba
bxAgents chat
```

Saluda al agente cuyo andamiaje creaste y para el que escribiste instrucciones en las
[Lecciones 4-6](04-scaffolding-your-first-agent.md). Es un agente real en ejecución - lo que
pasa es que todavía no le has dado nada que *hacer*. Eso empieza en la próxima lección.

Referencia completa: [Inicio rápido](../getting-started/quick-start.md), [Referencia de la CLI](../cli-reference.md).

Siguiente: [Lección 9 - Dar tools a tu agente](09-giving-your-agent-tools.md)
