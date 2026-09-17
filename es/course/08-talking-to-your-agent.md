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

## `chat` - un REPL interactivo

```bash
bxAgents chat                                  # rápido, en el mismo proceso
bxAgents chat --server [--port=<puerto>]       # aplicación completa, servidor propio desechable
bxAgents chat --connect=http://127.0.0.1:8080  # aplicación completa, servidor que ya tienes en marcha
```

Usa el propio `MiniConsole` de BoxLang para la lectura de líneas. Requiere una terminal
interactiva real (invoca `stty` para el modo raw - no funcionará canalizado ni de forma no
interactiva). Escribe `exit` o `quit` para salir.

El modo por defecto carga la factory generada directamente en este proceso - es el más
rápido, pero sin nada de lo que aporta ColdBox (sin `models/`, sin scheduler, sin
interceptores, sin registro de gateways). Cuando eso importa, `--server` arranca un
miniserver real y conduce el REPL sobre HTTP contra la ruta de agente siempre activa de tu
proyecto, y `--connect` hace lo mismo contra un servidor que ya tengas en marcha. Ambos
modos HTTP hacen **streaming** de la respuesta token a token y arrastran el `threadId` del
servidor entre turnos, así que una sesión es una sola conversación y no una serie de
primeros mensajes inconexos.

## `invoke` - un único turno no interactivo

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
```

Existe para scripting y CI, donde el requisito de TTY de `chat` es un bloqueo total. Por
defecto carga la factory generada en el mismo proceso, el mismo camino que usa `chat`
internamente, solo que sin el bucle del REPL - sin ningún requisito previo de `serve`.
`--json` imprime `{"response": "..."}` en lugar de texto plano.

Añade `--server` para lanzar en su lugar un proceso `boxlang-miniserver` real y desechable y
enviar el mensaje como una petición HTTP genuina a través de la ruta expuesta de tu proyecto -
útil una vez que hayas añadido una entrada en `gateways/` (consulta la
[Lección 13](13-exposing-http-and-mcp.md)).

## `serve` - un servidor HTTP real

```bash
bxAgents serve --port=8080
```

Requiere un `build` previo y requiere `boxlang-miniserver` en el `PATH` (consulta la
[Lección 3](03-installing-bxagents.md)). Lanza un proceso de servidor real apuntando a
`.build/app`, acotado a su propio directorio BoxLang `.build/runtime` para que la caché de
clases compiladas de cada proyecto quede aislada.

!!! warning
    La **primera** petición a la ruta `toAi()` de una aplicación recién arrancada puede
    fallar de forma transitoria - es una carrera genuina de inyección perezosa de
    ColdBox/WireBox, no un fallo de BxAgents. Después funciona de forma fiable. Envía una
    petición de calentamiento antes de depender de una ruta recién desplegada bajo carga.

## Probar sin una clave de API real

Todas estas formas necesitan un modelo real para hablar con un proveedor real - pero todavía
no te hace falta uno. Añade una sobrescritura `test()` a `Agent.bx` (se cubre por completo en
la [Lección 19](19-testing-your-agent.md)):

```javascript
function test() {
	return { model : "mock/mock-model" };
}
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
