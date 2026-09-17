---
title: "Lección 12: Configuraciones de modelo con nombre"
icon: phosphor-duotone:brain
summary: Configuraciones de modelo reutilizables y con nombre, referenciadas desde Agent.bx por su nombre.
description: Configuraciones de modelo reutilizables y con nombre, referenciadas desde Agent.bx por su nombre.
tags: [course, conventions, models]
---

# Configuraciones de modelo con nombre

`models/` te permite definir configuraciones de modelo reutilizables y con nombre, una por
archivo `.bx` o `.json`, referenciadas desde el campo `model` de `Agent.bx` por su nombre (sin
`/`, para que no se confunda con un slug `provider/model` - consulta la
[Lección 5](05-agent-bx.md)).

```javascript
// models/summarizer.bx
class {

	function configure() {
		return {
			provider : "openai",
			model    : "gpt-5-mini"
		};
	}

}
```

```javascript
// Agent.bx
function configure() {
	return {
		model : "summarizer"   // resolves against models/summarizer.bx
	};
}
```

## ¿Por qué molestarse con una configuración con nombre en vez de escribir el slug?

Un slug `provider/model` basta para la mayoría de los agentes - ya lo viste en la
[Lección 5](05-agent-bx.md). Recurre a `models/` cuando la misma configuración se comparta
entre varios agentes o subagentes (por ejemplo, un modelo más barato que usa todo tu árbol de
`subagents/` para enrutar), o cuando la configuración lleve algo más que un nombre de
proveedor y de modelo y no quieras repetirla.

## Reglas de descubrimiento

- Una entrada por archivo `.bx` o `.json` de primer nivel directamente bajo `models/` - no es
  recursivo.
- El nombre de la entrada es el nombre base del archivo (`summarizer.bx` pasa a ser
  `summarizer`).
- Se ignoran los archivos ocultos y las extensiones no reconocidas (como un `README.md` que
  dejes con tus propias notas).
- Dos archivos que resuelvan al mismo nombre fallan la validación con un error de nombre
  duplicado.

## Validación

Si el `model` de `Agent.bx` no lleva `/`, debe ser **o bien** el nombre de un proveedor
principal conocido (`openai`, `bedrock`, `claude`, `gemini`, `mock`, y otros - consulta
[Agent.bx](../conventions/agent-bx.md#the-model-slug)) **o bien** coincidir con el nombre de
una entrada de `models/`. Cualquier otra cosa falla la validación con un error claro del tipo
"no hay proveedor y no coincide con ninguna entrada de models/" - una errata aquí se detecta
en tiempo de `build`, y no se deja para que aparezca más tarde como un confuso error de
ejecución.

## Pruébalo

Añade una configuración `models/fast.bx` que apunte a un modelo más pequeño o barato que el
predeterminado de tu agente raíz, y después referencia `model: "fast"` desde el `configure()`
de un subagente - encaja de forma natural con el subagente investigador de la
[Lección 11](11-composing-subagents.md), que probablemente no necesita tu modelo más grande
para hacer su trabajo.

Referencia completa: [models/](../conventions/models.md).

Siguiente: [Lección 13 - Exponer tu agente por HTTP y MCP](13-exposing-http-and-mcp.md)
