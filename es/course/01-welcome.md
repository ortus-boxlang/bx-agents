---
title: "Lección 1: Bienvenido a BxAgents"
icon: phosphor-duotone:hand-waving
summary: Qué cubre este curso, qué vas a construir, y cómo está organizada cada lección.
description: Qué cubre este curso, qué vas a construir, y cómo está organizada cada lección.
tags: [course, getting-started]
---

# Bienvenido a BxAgents

¡Bienvenido! Este es un curso de 20 lecciones sobre **BxAgents**, un framework de agentes
de IA basado en convenciones para [BoxLang](https://www.boxlang.io), construido sobre
[ColdBox](https://www.coldbox.org) y [BX AI](https://ai.boxlang.io).

La idea detrás de BxAgents es sencilla: describes un agente con **archivos y carpetas**,
no con la superficie de API de un framework, y un solo comando - `bxAgents build` -
ensambla con ello una aplicación ColdBox real y ejecutable.

```
my-agent/
├── Agent.bx           # name, model, description
├── instructions.md    # the system prompt
├── tools/             # @AITool functions
├── skills/            # SKILL.md capabilities
├── subagents/         # nested agent trees
├── models/            # named model configs
├── gateways/           # HTTP/MCP/chat exposure
├── schedules/          # a real ColdBox scheduler
├── mcp/                # MCP servers you host
├── interceptors/        # lifecycle hooks
└── modules/            # module dependencies
```

Todas las carpetas de arriba son opcionales excepto `Agent.bx`. Añade las que tu agente
realmente necesite; el resto pueden quedarse vacías o simplemente no existir.

## Cómo está organizado este curso

Las 20 lecciones siguen el orden en el que construirías de forma natural un proyecto real:

1. **Lecciones 1-4** - orientación, instalación, y tu primer proyecto creado con el andamiaje.
2. **Lecciones 5-8** - las piezas obligatorias: `Agent.bx`, las instrucciones, construir, y
   ejecutar el agente desde la terminal.
3. **Lecciones 9-12** - dar capacidades a tu agente: tools, skills, subagentes y modelos
   con nombre.
4. **Lecciones 13-16** - alcanzar tu agente: exposición HTTP/MCP, plataformas de chat, la
   UI web generada, y el trabajo programado en segundo plano.
5. **Lecciones 17-18** - alojar tus propios servidores MCP, interceptores de ciclo de vida,
   y dependencias de módulos.
6. **Lecciones 19-20** - probarlo de verdad, y después empaquetar y desplegar lo construido.

## Qué necesitas

- Una terminal.
- Entre 30 y 60 minutos por lección si la sigues con las manos en el teclado (la mayoría
  funcionan bien también en modo lectura).
- No hace falta experiencia previa con BoxLang ni ColdBox - la lección 3 instala todo lo
  que necesitas.

Cada lección enlaza de vuelta a la referencia completa de [Convenciones](../conventions/agent-bx.md)
para todo lo que este curso solo resume - el curso es el camino guiado, y la sección de
Convenciones es la referencia exhaustiva a la que volverás más adelante.

Siguiente: [Lección 2 - ¿Qué es BxAgents?](02-what-is-bxagents.md)
