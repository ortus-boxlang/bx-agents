---
title: "Lección 4: Crear el andamiaje de tu primer agente"
icon: phosphor-duotone:sparkle
summary: Ejecuta bxAgents new y mira exactamente qué te crea.
description: Ejecuta bxAgents new y mira exactamente qué te crea.
tags: [course, getting-started]
---

# Crear el andamiaje de tu primer agente

Con BoxLang y BxAgents instalados ([Lección 3](03-installing-bxagents.md)),
crea el andamiaje de tu primer proyecto:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` es **obligatorio** - un slug `provider/model` (verás exactamente cómo se
interpreta en la [Lección 5](05-agent-bx.md)). `--name` y `--description` son opcionales;
`--name` toma por defecto el nombre del propio directorio de destino. `new` se niega a
ejecutarse si el destino ya contiene un `Agent.yaml` o un `Agent.bx`.

## Qué se crea

```
my-agent/
├── Agent.yaml
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
`new` nunca sobrescribe ninguno de los dos si ya existen. BoxLang carga por sí mismo el `.env`
desde la raíz del proyecto, así que también es el sitio para las claves de API de tu proveedor.

Todas las carpetas de convención se crean **vacías**. Añades archivos a las que tu agente
realmente necesita y dejas el resto en paz - una carpeta `tools/` vacía no tiene ningún
efecto sobre la aplicación generada.

## `Agent.yaml` tiene este aspecto

(Si pasas `--description`, `new` añade una línea `description:`.)

```yaml
# Your agent. Most agents need nothing more than this file and instructions.md.
# For code in the definition (hooks, dynamic instructions), scaffold with --class.
name: my-agent
model: openai/gpt-5

environments:
  # `bxAgents test` builds against this override by default (see
  # BaseAgentSpec.bx) so a fresh project's tests need no API key or
  # network access - swap the model to test against a real provider.
  test:
    model: mock/mock-model
```

Esa es toda la definición del agente - más sobre cada clave en la
[Lección 5](05-agent-bx.md). Si necesitas código en la definición, pasa `--class` y `new`
crea en su lugar un `Agent.bx` basado en clase (también se explica al final de la
Lección 5).

## La suite de pruebas se prepara sola

`new` también ejecuta `box install` en la raíz del proyecto creado (su `box.json` lista TestBox), de modo que
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

Siguiente: [Lección 5 - La definición del agente: Agent.yaml](05-agent-bx.md)
