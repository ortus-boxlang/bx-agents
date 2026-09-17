---
title: "Ejemplo: un agente mínimo"
icon: phosphor-duotone:seedling
summary: Construye el proyecto BxAgents completo más pequeño posible - un agente, una tool, una skill.
description: Construye el proyecto BxAgents completo más pequeño posible - un agente, una tool, una skill.
tags: [guides, examples, tools, skills]
---

# Ejemplo: un agente mínimo

El proyecto BxAgents completo más pequeño es [`examples/minimal-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/minimal-agent) - tres archivos que muestran la forma completa de un proyecto: un `Agent.bx`, unas instrucciones, una [tool](../conventions/tools.md) y una [skill](../conventions/skills.md). Todos los demás ejemplos de esta serie de guías parten exactamente de esta forma.

## El proyecto

```
minimal-agent/
├── Agent.bx
├── instructions.md
├── tools/
│   └── Greeter.bx
└── skills/
    └── greeting/
        └── SKILL.md
```

`Agent.bx` extiende el propio `AiAgent` de bx-ai y declara un nombre, una descripción y un modelo en `init()`:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "minimal-agent",
			description : "The smallest complete BX Agents project: one tool, one skill.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

`instructions.md` es el system prompt - un archivo Markdown plano, copiado tal cual en tiempo de build:

```markdown
## Minimal Agent

You are a friendly assistant. When someone tells you their name, use the
`sayHello` tool to greet them, and follow the greeting skill's guidance
on tone.
```

## La tool

Cualquier `class` bajo `tools/` con una función anotada con `@AITool` se convierte automáticamente en una tool invocable - sin paso de registro, sin entrada de configuración. `tools/Greeter.bx`:

```javascript
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

La cadena que se pasa a `@AITool` es la descripción de la tool, y se envía al modelo exactamente tal como está escrita - consulta [Tools](../conventions/tools.md) para ver cómo los tipos de argumento de BoxLang se traducen al esquema JSON que ve el modelo.

## La skill

Una skill en `skills/<nombre>/SKILL.md` es orientación que el modelo puede incorporar cuando decide que es relevante - no está siempre activa como `instructions.md`. `skills/greeting/SKILL.md`:

```markdown
---
name: greeting
description: How to greet people warmly.
---

Always greet the user warmly and use their name if known.
```

Consulta [Skills](../conventions/skills.md) para ver cómo `description` determina cuándo se usa realmente una skill.

## Construir y ejecutar

```bash
cd examples/minimal-agent
bxAgents build
bxAgents chat
```

`build` ensambla todo lo anterior en una aplicación ColdBox normal bajo `.build/app` (consulta [El pipeline de build](../build-pipeline.md)); `chat` arranca el agente generado en el mismo proceso y te deja en un REPL de terminal contra él. Prueba con:

```
> My name is Ada.
```

El modelo debería recurrir a la tool `sayHello` y responder con calidez, siguiendo la orientación de la skill - todo ello a partir de una sola frase de instrucciones más una tool de dos líneas y una skill de dos líneas.

## Dónde ir a continuación

- [Ejemplo: un equipo multiagente](example-multi-agent-team.md) - la misma forma, con subagentes que se delegan trabajo entre sí.
- [Ejemplo: un agente programado](example-scheduled-agent.md) - la misma forma, despertado por una programación cron en lugar de por un prompt de chat.
- [Tools](../conventions/tools.md) y [Skills](../conventions/skills.md) para las convenciones completas que siguen estos dos archivos.
