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

## Para qué sirve

Un slug basta para la mayoría de los agentes. Recurre a los perfiles cuando varios agentes comparten una configuración (un modelo más barato que usan tus subagentes de enrutamiento), o cuando un modelo necesita ajustes que no quieres repetir.

## Pruébalo

Añade un perfil `fast` que apunte a un modelo más pequeño que el de tu agente raíz, y dale a un subagente `profile: fast`, algo natural para el investigador de la [Lección 11](11-composing-subagents.md). Ejecuta `bxAgents inspect --section=ai` para ver el valor por defecto, los proveedores y los perfiles, y de qué variable sale cada clave.

Referencia completa: [Modelos y perfiles](../conventions/models.md).

Siguiente: [Lección 13 - Exponer tu agente por HTTP y MCP](13-exposing-http-and-mcp.md)
