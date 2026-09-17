---
title: "Lección 4: Crear el andamiaje de tu primer agente"
icon: phosphor-duotone:sparkle
summary: Ejecuta bxAgents new y mira exactamente qué te crea.
description: Ejecuta bxAgents new y mira exactamente qué te crea.
tags: [course, getting-started]
---

# Crear el andamiaje de tu primer agente

Con BoxLang, `bx-ai` y BxAgents instalados ([Lección 3](03-installing-bxagents.md)),
crea el andamiaje de tu primer proyecto:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` es **obligatorio** - un slug `provider/model` (verás exactamente cómo se
interpreta en la [Lección 5](05-agent-bx.md)). `--name` y `--description` son opcionales;
`--name` toma por defecto el nombre del propio directorio de destino. `new` se niega a
ejecutarse si el destino ya contiene un `Agent.bx`.

## Qué se crea

```
my-agent/
├── Agent.bx
├── instructions.md
├── tools/
├── skills/
├── subagents/
├── models/
├── gateways/
├── schedules/
├── mcp/
├── interceptors/
├── modules/
└── tests/
    ├── box.json
    └── specs/
        └── AgentSpec.bx
```

Más un `.env` que declara `BOXLANG_HOME=.build/runtime` (coincidiendo con el propio
directorio de runtime acotado de `serve`) y un `.gitignore` (`.build/`, `dist/`, `.env`) -
`new` nunca sobrescribe ninguno de los dos si ya existen.

Todas las carpetas de convención se crean **vacías**. Añades archivos a las que tu agente
realmente necesita y dejas el resto en paz - una carpeta `tools/` vacía no tiene ningún
efecto sobre la aplicación generada.

## `Agent.bx` tiene este aspecto

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

`extends` directamente el propio `AiAgent` de bx-ai - más sobre qué significa eso
exactamente en la [Lección 5](05-agent-bx.md).

## La suite de pruebas se prepara sola

`new` también ejecuta `box install` dentro de la carpeta `tests/` creada, de modo que
`bxAgents test` ([Lección 19](19-testing-your-agent.md)) funciona de inmediato sin ningún
paso aparte. Esto es de mejor esfuerzo - si `box` no está en el `PATH` o la instalación
falla, `new` sigue teniendo éxito y simplemente te dice que lo ejecutes tú. Pasa
`--skipInstall` para desactivarlo por completo.

## Pruébalo

```bash
bxAgents new my-agent --model=openai/gpt-5
cd my-agent
ls
```

Ya tienes un proyecto BxAgents real, aunque mínimo. Las cuatro lecciones siguientes
recorren lo que hace falta de verdad para ejecutarlo.

Siguiente: [Lección 5 - Agent.bx: el agente en sí](05-agent-bx.md)
