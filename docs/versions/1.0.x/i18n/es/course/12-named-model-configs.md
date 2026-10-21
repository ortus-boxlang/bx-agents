---
title: "Lección 12: Configuraciones de modelo con nombre"
icon: phosphor-duotone:brain
summary: Configuraciones de modelo reutilizables y con nombre, referenciadas desde Agent.yaml por su nombre.
description: Configuraciones de modelo reutilizables y con nombre, referenciadas desde Agent.yaml por su nombre.
tags: [course, conventions, models]
---

# Configuraciones de modelo con nombre

`models/` te permite definir configuraciones de modelo reutilizables y con nombre, una por
archivo YAML o JSON, referenciadas desde el campo `model` de `Agent.yaml` por su nombre (sin
`/`, para que no se confunda con un slug `provider/model` - consulta la
[Lección 5](05-agent-bx.md)).

```yaml
# models/summarizer.yaml
provider: openai
model: gpt-5-mini
params:
  temperature: 0.2
```

```yaml
# Agent.yaml
model: summarizer   # se resuelve contra models/summarizer.yaml
```

## ¿Por qué molestarse con una configuración con nombre en vez de escribir el slug?

Un slug `provider/model` basta para la mayoría de los agentes - ya lo viste en la
[Lección 5](05-agent-bx.md). Recurre a `models/` cuando la misma configuración se comparta
entre varios agentes o subagentes (por ejemplo, un modelo más barato que usa todo tu árbol de
`subagents/` para enrutar), o cuando la configuración lleve algo más que un nombre de
proveedor y de modelo y no quieras repetirla.

## Reglas de descubrimiento

- Una entrada por archivo `.yaml`, `.yml` o `.json` de primer nivel directamente bajo `models/` - no es
  recursivo. (Una clase `.bx` que devuelva el mismo struct sigue funcionando.)
- El nombre de la entrada es el nombre base del archivo (`summarizer.yaml` pasa a ser
  `summarizer`).
- Se ignoran los archivos ocultos y las extensiones no reconocidas (como un `README.md` que
  dejes con tus propias notas).
- Dos archivos que resuelvan al mismo nombre fallan la validación con un error de nombre
  duplicado.

## Validación

Si el `model` de `Agent.yaml` no lleva `/`, debe ser **o bien** el nombre de un proveedor
principal conocido (`openai`, `bedrock`, `claude`, `gemini`, `mock`, y otros - consulta
[el slug de modelo](../conventions/agent-bx.md#the-model-slug)) **o bien** coincidir con el nombre de
una entrada de `models/`. Cualquier otra cosa falla la validación con un error claro del tipo
"no hay proveedor y no coincide con ninguna entrada de models/" - una errata aquí se detecta
en tiempo de `build`, y no se deja para que aparezca más tarde como un confuso error de
ejecución.

## Pruébalo

Ejecuta `bxAgents add model fast` (o escribe un `models/fast.yaml`) que apunte a un modelo más pequeño o barato que el
predeterminado de tu agente raíz, y después referencia `model: "fast"` desde el `Agent.yaml`
de un subagente - encaja de forma natural con el subagente investigador de la
[Lección 11](11-composing-subagents.md), que probablemente no necesita tu modelo más grande
para hacer su trabajo.

Además de `provider` y `model`, una entrada puede llevar `params` (como `temperature`), `options` y
`apiKeyEnvVar` - el nombre de una variable de entorno de la que leer su clave. Referencia completa: [models/](../conventions/models.md).

Siguiente: [Lección 13 - Exponer tu agente por HTTP y MCP](13-exposing-http-and-mcp.md)
