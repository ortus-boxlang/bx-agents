---
title: "Lección 5: La definición del agente - Agent.yaml"
icon: phosphor-duotone:robot
summary: El único archivo obligatorio - un archivo YAML simple que dice qué es tu agente.
description: El único archivo obligatorio - un archivo YAML simple que dice qué es tu agente.
tags: [course, conventions]
---

# La definición del agente - Agent.yaml

`Agent.yaml` es el **único archivo obligatorio** de un proyecto BxAgents (además de las
instrucciones a las que apunta). Son ajustes en texto plano - un nombre, un modelo y
cualquier extra opcional - y el build los convierte en un
[agente real de BX AI](https://ai.ortusbooks.com/main-components/agents/class-based-agents).
No hace falta código.

```yaml
name: my-agent
description: A helpful assistant
model: openai/gpt-5
instructions: |
  You are a helpful assistant.
```

Eso es un agente completo. `bxAgents new` crea esta forma por ti (consulta la
[Lección 4](04-scaffolding-your-first-agent.md)), con el system prompt en un
`instructions.md` a su lado (consulta la [Lección 6](06-instructions-and-system-prompt.md)).

!!! info
    Una carpeta contiene **una** definición de agente. Un `Agent.yaml` junto con un
    `Agent.bx` (o un `Agent.yml`) en la misma carpeta es un error, y el build nombra ambos
    archivos para que conserves uno.

## Las claves

| Clave | Qué hace |
|---|---|
| `name` | El nombre del agente. Es además su clave de binding en WireBox, así que debe ser única en todo el proyecto. |
| `model` | Un slug `provider/model` (ver abajo). |
| `description` | Opcional. |
| `instructions` | System prompt en línea. Un `instructions.md` junto al archivo gana si existen ambos. |
| `tools` | Tools de módulos que recibe este agente, como `item@module` o `*@module` (consulta la [Lección 9](09-giving-your-agent-tools.md)). |
| `toolOptions` | Opciones para las tools de un módulo, indexadas por nombre de módulo. |
| `subAgents` | Nombres de carpetas hermanas bajo `subagents/` (consulta la [Lección 11](11-composing-subagents.md)). |
| `mcpServers` | Servidores MCP remotos que el agente puede llamar (consulta la [Lección 17](17-hosting-mcp-servers.md)). |
| `security`, `memory`, `checkpointer` | Guardrails, memoria de conversación y estado de humano-en-el-bucle. |
| `gatewaySession` | Cómo los gateways de chat ponen en cola las sesiones (consulta la [Lección 14](14-connecting-chat-platforms.md)). |
| `agentApi` | La ruta de agente siempre activa. |
| `environments` | Sobrescrituras por entorno (ver abajo). |

Una **clave desconocida es un error** que lista las válidas, así que un error tipográfico
como `modle:` nunca puede no hacer nada en silencio. Los tipos incorrectos y los valores
vacíos también son errores.

!!! info
    El checkpointer es lo único que el build rellena sin que se lo pidas. Un agente
    accesible desde un gateway sin checkpointer tiene el humano-en-el-bucle roto en
    silencio, así que una definición que no fije ninguno recibe igualmente el valor por
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

## Añadir ajustes

Los demás ajustes son simplemente más claves:

```yaml
name: with-mcp-servers-agent
model: openai/gpt-5
mcpServers:
  - https://example.com/mcp
```

## Sobrescrituras por entorno

`environments` asocia el nombre de un entorno (`production`, `development`, o cualquier
nombre propio) con un bloque de sobrescrituras:

```yaml
name: my-agent
model: openai/gpt-5

environments:
  production:
    model: openai/gpt-5-mini
  test:
    model: mock/mock-model
```

El entorno activo se resuelve así, y gana el primero: flag `--environment` de la CLI >
variable de entorno `BX_AGENTS_ENV` > el valor por defecto `"development"`.
`bxAgents build --environment=production` lo recoge. Solo se aplica el bloque activo, por
encima de las claves de primer nivel. Usarás este mismo mecanismo para el proveedor `mock`
en tus pruebas ([Lección 19](19-testing-your-agent.md)), por eso `bxAgents new` ya te da un
bloque `test`.

Referencia completa: [Agent.yaml](../conventions/agent-yaml.md).

## Cuando necesitas código: Agent.bx

`Agent.yaml` cubre casi todos los agentes. Recurre a la forma avanzada basada en clase,
`Agent.bx`, solo cuando la propia definición necesita código: hooks, instrucciones
dinámicas, tools registradas por código, un método sobrescrito, o calcular el entorno con
`detectEnvironment()`. Es una clase real que extiende el `AiAgent` de bx-ai, y que el build
instancia:

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

Crea uno con `bxAgents new --class`, o empieza en YAML y cambia más tarde: crea el
`Agent.bx`, traslada los ajustes y borra el `Agent.yaml`. Referencia completa:
[Agent.bx](../conventions/agent-bx.md).

Siguiente: [Lección 6 - instructions.md y el system prompt](06-instructions-and-system-prompt.md)
