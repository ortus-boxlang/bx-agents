---
title: "Ejemplo: un equipo multiagente"
icon: phosphor-duotone:users-three
summary: Construye un agente raíz que delega en dos subagentes, construidos de la hoja hacia la raíz y cableados automáticamente.
description: Construye un agente raíz que delega en dos subagentes, construidos de la hoja hacia la raíz y cableados automáticamente.
tags: [guides, examples, subagents]
---

# Ejemplo: un equipo multiagente

[`examples/multi-agent-team/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/multi-agent-team) es un agente raíz con dos [subagentes](../conventions/subagents.md) - `researcher` y `writer` - cada uno envuelto automáticamente como una tool invocable del agente raíz por el propio `aiAgent()` de bx-ai. La delegación es enteramente una decisión del modelo en tiempo de ejecución; nada en este proyecto fija por código qué subagente atiende qué mensaje.

## El proyecto

```
multi-agent-team/
├── Agent.bx
├── instructions.md
└── subagents/
    ├── researcher/
    │   ├── Agent.bx
    │   └── instructions.md
    └── writer/
        ├── Agent.bx
        └── instructions.md
```

Cada carpeta `subagents/<nombre>/` es en sí misma un mini-agente completo - con su propio `Agent.bx`, su propio `instructions.md`, y (aquí no se usan, pero están soportados) sus propios `tools/`/`skills/`.

## Declarar el equipo

El `Agent.bx` raíz nombra los subagentes a cablear mediante `configure()`:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "multi-agent-team",
			description : "A root agent delegating to a researcher and a writer subagent.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

	// subAgents here is the list of `subagents/` FOLDER names to wire at
	// build time - a build-time concern, distinct from super.init()'s own
	// `subAgents` argument (which takes already-built AiAgent instances).
	function configure() {
		return {
			subAgents : [ "researcher", "writer" ]
		};
	}

}
```

La lista `subAgents` de `configure()` se resuelve contra los nombres de carpeta bajo `subagents/`; el `Agent.bx` de cada carpeta declara su propio `name`, `description` y `model` de forma independiente:

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "researcher",
			description : "Gathers facts on a topic.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

```javascript
// subagents/writer/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "writer",
			description : "Turns research into polished prose.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## Las instrucciones reparten la responsabilidad

El `instructions.md` de cada agente está deliberadamente acotado a su propio trabajo - la raíz coordina, y a cada subagente se le dice explícitamente lo que *no* hace, para que el modelo no intente hacerlo todo de una sola vez:

```markdown
<!-- instructions.md (root) -->
## Team Lead

You coordinate a small team. Delegate research questions to the `researcher`
subagent and drafting/writing tasks to the `writer` subagent, then combine
their output into a final answer.
```

```markdown
<!-- subagents/researcher/instructions.md -->
## Researcher

You gather and summarize facts on a topic, citing your reasoning. You do
not write final prose - that's the writer's job.
```

```markdown
<!-- subagents/writer/instructions.md -->
## Writer

You turn research notes into clear, polished prose. You do not do your
own research - you rely on what the researcher provides.
```

## Cómo lo cablea el build

`ColdBoxAppGenerator` construye el árbol **de la hoja hacia la raíz**: `researcher` y `writer` se construyen primero, y las instancias ya construidas se pasan a la construcción del propio agente raíz, de modo que la llamada `aiAgent()` de la raíz recibe objetos de subagente reales en vez de nombres que resolver más tarde. Consulta [Subagentes](../conventions/subagents.md) para el orden completo de construcción hoja-primero y para ver cómo cada subagente queda registrado con su propio nombre en WireBox (no solo la raíz).

## Construir y ejecutar

```bash
cd examples/multi-agent-team
bxAgents build
bxAgents chat
```

Pregunta algo que claramente necesite ambos roles, por ejemplo `Give me three facts about the BoxLang language, then turn them into a short paragraph.` Un modelo real normalmente llamaría primero a `researcher`, luego a `writer`, y después compondría la respuesta final - el proveedor `mock` con el que viene este ejemplo no delega realmente (devuelve una respuesta fija sin llamadas a tools), así que cambia a un slug `provider/model` real (consulta [El slug del modelo](../conventions/agent-bx.md#the-model-slug)) para ver la delegación de verdad.

## Dónde ir a continuación

- [Ejemplo: un agente mínimo](example-minimal-agent.md) si aún no has visto la forma base de un proyecto.
- [Subagentes](../conventions/subagents.md) para la detección de ciclos, los árboles de subagentes anidados, y las tools/skills por subagente.
- [Ejemplo: construir un bot de Slack](example-slack-bot.md) para ver un agente parecido accesible desde una plataforma de chat real en lugar del REPL `chat`.
