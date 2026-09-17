---
title: "Lección 5: Agent.bx - el agente en sí"
icon: phosphor-duotone:robot
summary: El único archivo obligatorio - una clase real que el build instancia, no un struct de configuración.
description: El único archivo obligatorio - una clase real que el build instancia, no un struct de configuración.
tags: [course, conventions]
---

# Agent.bx - el agente en sí

`Agent.bx` es el **único archivo obligatorio** de un proyecto BxAgents. Extiende el propio
[`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents) de bx-ai,
así que *es* el agente - el build lo instancia en lugar de reconstruir uno a partir de un
struct de configuración, de modo que lo que escribes es lo que se ejecuta.

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "A helpful assistant",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

Al ser una clase real y no un descriptor que devuelve un struct, un IDE puede
introspeccionarla como cualquier otra clase de BoxLang - ir a la definición, autocompletar
métodos heredados, todo. Hereda y añade lo que necesites: helpers privados, métodos
sobrescritos, tools registradas por código.

## La regla: una declaración explícita gana

Todo lo que el build puede añadir por encima de la clase es **opcional** - declara un método
`configure()` que devuelva cualquiera de las claves de abajo para sobrescribir lo que la
propia clase fijó, o apóyate en la carpeta de convención correspondiente:

| Lo que declaras | Lo que emite el build | Si no lo declaras |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | se mantienen las instrucciones de la clase |
| `model` en `configure()` | `setModel( aiModel( ... ) )` | se mantiene el modelo de la clase |
| `name` / `description` en `configure()` | `setName()` / `setDescription()` | se mantienen los de la clase |
| *(nada que declarar)* | `withTools( aiToolRegistry().getAll() )` | siempre - las `tools/` descubiertas se añaden |
| `subAgents` en la clase, o `subagents/` en disco | `addSubAgent( ... )` por cada hijo | se añaden igualmente |
| `checkpointer` en `configure()` | `withCheckpointer( ... )` | **se inyecta igualmente** con el valor por defecto `cache` |

!!! info
    El checkpointer es lo único que el build rellena sin que se lo pidas. Un agente
    accesible desde un gateway sin checkpointer tiene el humano-en-el-bucle roto en
    silencio, así que una clase que no fije ninguno recibe igualmente el valor por
    defecto `cache`.

## El slug del modelo

`model` es una convención propia de BxAgents - bx-ai en sí toma `provider` y `model` como
dos argumentos separados. BxAgents parte el slug **solo por la primera `/`**:

| Valor de `model` | provider | model |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

`mock` es un proveedor real que nunca hace ninguna llamada de red - útil para pruebas
(consulta la [Lección 19](19-testing-your-agent.md)) y para seguir este curso sin ninguna
clave de API.

## `configure()` - sobrescribir lo que fijó la clase

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "with-mcp-servers-agent",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			mcpServers : [ "https://example.com/mcp" ]
		};
	}

}
```

Campos útiles: `name` (que es además la clave de binding de este agente en WireBox - debe
ser única en todo el proyecto), `model`, `description`, `subAgents` (consulta la
[Lección 11](11-composing-subagents.md)), `mcpServers` (consulta la
[Lección 17](17-hosting-mcp-servers.md)), `security`, `memory`, `checkpointer`,
`gatewaySession` (consulta la [Lección 14](14-connecting-chat-platforms.md)).

## Sobrescrituras por entorno

`Agent.bx` puede declarar un método con el nombre de un entorno (`production()`,
`development()`, o cualquier nombre propio) que devuelva un struct de sobrescrituras:

```javascript
function production() {
	return {
		model : "openai/gpt-5-mini"
	};
}
```

El entorno activo se resuelve así, y gana el primero: flag `--environment` de la CLI >
variable de entorno `BX_AGENTS_ENV` > el valor por defecto `"development"`.
`bxAgents build --environment=production` lo recoge. Usarás este mismo mecanismo para el
proveedor `mock` en tus pruebas ([Lección 19](19-testing-your-agent.md)).

Referencia completa: [Agent.bx](../conventions/agent-bx.md).

Siguiente: [Lección 6 - instructions.md y el system prompt](06-instructions-and-system-prompt.md)
