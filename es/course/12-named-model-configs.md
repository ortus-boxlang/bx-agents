---
title: "Lección 12: Modelos y perfiles"
icon: phosphor-duotone:brain
summary: Elige el modelo por defecto, configura otros proveedores y da nombre a combinaciones como fast y planner, todo en Agent.yaml.
description: Elige el modelo por defecto, configura otros proveedores y da nombre a combinaciones como fast y planner, todo en Agent.yaml.
tags: [course, conventions, models, profiles]
---

# Modelos y perfiles

Ya eliges un modelo con un slug, `model: openai/gpt-5` ([Lección 5](05-agent-bx.md)). Cuando quieres más de un modelo en el mismo proyecto, les pones nombre: un **perfil** es un proveedor, un modelo y algunos ajustes bajo un nombre como `fast` o `planner`. Todo vive en `Agent.yaml`; nunca escribes un `boxlang.json`.

```yaml
provider: openai
model: gpt-5
params: { temperature: 0.2 }

profiles:
  fast:    { description: Barato y rápido, provider: openai, model: gpt-5-mini, params: { temperature: 0 } }
  planner: { description: Planificación cuidadosa, provider: claude, model: claude-opus-4, apiKeyEnv: ANTHROPIC_API_KEY }
```

Un subagente elige uno con `profile:`; un agente que no dice nada usa el valor por defecto. Un perfil no puede llamarse `default` ni como un proveedor, y una clave nunca se escribe en el archivo: `apiKeyEnv` nombra la variable de entorno que la guarda.

`defaultProfile: fast` convierte un perfil en el modelo por defecto (si también hay un `model` de nivel superior, gana el perfil y `build` y `doctor` avisan de que el modelo se ignora). `bxAgents add profile` y `add provider` escriben estos bloques por ti, con una clave vacía de relleno en `.env`.

## Lo que el proyecto puede decir de un modelo

`contextWindow` y `vision` en el modelo por defecto y en cada perfil dicen cuánto puede contener el modelo y si puede ver imágenes. Ambos son opcionales y no se adivina nada. `/info`, `/model` y el tamaño de contexto en el chat los muestran, y una imagen enviada a un perfil con `vision: false` se rechaza con ese motivo.

## Usar y probar perfiles

- En el chat de terminal, `/model` muestra el modelo, `/profile` elige un perfil de una lista (o `/profile fast`) y `/default` vuelve. La conversación, la memoria y las tools se mantienen.
- Una entrada de chat web o una API de agente que liste `profiles` los ofrece como selector. Solo se pueden elegir los listados, y la página nunca ve una clave.
- `bxAgents models list` muestra con qué puede hablar el proyecto, y `bxAgents models test --all` envía a cada modelo una pregunta diminuta y dice si respondió y cuánto tardó. En el chat, `/ping` hace lo mismo.
- Pon `usage: true` en `Agent.yaml` y `bxAgents stats` (o `/stats`) muestra lo que usaron las llamadas al modelo, por modelo, proveedor, día o usuario. Solo guarda recuentos.

## Para qué sirve

Un slug basta para la mayoría de los agentes. Recurre a los perfiles cuando varios agentes comparten una configuración (un modelo más barato que usan tus subagentes de enrutamiento), o cuando un modelo necesita ajustes que no quieres repetir.

## Pruébalo

Añade un perfil `fast` que apunte a un modelo más pequeño que el de tu agente raíz, y dale a un subagente `profile: fast`, algo natural para el investigador de la [Lección 11](11-composing-subagents.md). Ejecuta `bxAgents inspect --section=ai` para ver el valor por defecto, los proveedores y los perfiles, y de qué variable sale cada clave.

Referencia completa: [Modelos y perfiles](../conventions/models.md).

Siguiente: [Lección 13 - Exponer tu agente por HTTP y MCP](13-exposing-http-and-mcp.md)
