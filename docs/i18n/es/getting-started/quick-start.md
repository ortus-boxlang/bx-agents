---
title: Inicio rápido
icon: phosphor-duotone:rocket-launch
summary: "El ciclo de vida completo de un proyecto: generar andamiaje, editar, construir, ejecutar."
description: "El ciclo de vida completo de un proyecto: generar andamiaje, editar, construir, ejecutar."
tags: [getting-started]
---

# Inicio rápido

Esto recorre el ciclo de vida completo de un proyecto BxAgents: generar el andamiaje, editar, construir, ejecutar.

## 1. Genera el andamiaje de un proyecto

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` es requerido (un slug `provider/model` - ver [Agent.bx](../conventions/agent-bx.md) para cómo se analiza). `--name` y `--description` son opcionales; `--name` por defecto toma el propio nombre del directorio destino.

Esto crea:

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

`Agent.bx` se ve así:

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

`extends` el propio `AiAgent` de bx-ai, así que *es* el agente - hereda y añade lo que tu agente necesite directamente en la clase. Ver [Agent.bx](../conventions/agent-bx.md).

Cada carpeta de convención se crea vacía - añade archivos a las que tu agente realmente necesite y elimina (o simplemente ignora) el resto.

## 2. Edita

Abre `instructions.md` y escribe el system prompt del agente. Añade una tool:

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

Ver la sección de [Convenciones](../conventions/agent-bx.md) para cada otra carpeta (`skills/`, `subagents/`, `gateways/`, `schedules/`, `mcp/`, `interceptors/`, `models/`, `modules/`).

## 3. Pruébalo

```bash
cd tests && box install && cd ..   # una vez, para obtener testbox/
bxAgents test
```

El `tests/specs/AgentSpec.bx` generado pasa de inmediato - construye tu agente contra el proveedor `mock` (sin necesidad de clave de API ni red) y afirma sobre una respuesta guionizada. Ver [tests/](../conventions/testing.md) para `mockResponses()` y los matchers personalizados (`toHaveCalledTool`, etc.) disponibles para tus propios specs.

## 4. Construye

```bash
bxAgents build
```

Ejecuta el [pipeline de build](../build-pipeline.md) completo - resolución de configuración, descubrimiento, validación, generación de código, normalización de manifest - y escribe una aplicación ColdBox real en `.build/app/`, más `.build/manifest.json`. Ejecuta `bxAgents build --environment=production` para construir contra un override de entorno de `Agent.bx` (ver [Agent.bx](../conventions/agent-bx.md)).

Si tu proyecto falla la validación (nombres de tool duplicados, una expresión cron mala, un proveedor de modelo desconocido, ...) `build` falla con todos los errores recopilados - no solo el primero.

## 5. Ejecútalo

Dos formas de hablar con el agente construido - ambas cargan exactamente el mismo `GeneratedAgentFactory.bx` y construyen exactamente el mismo árbol de agentes, así que nunca divergen:

**De forma interactiva, desde la terminal:**

```bash
bxAgents chat
```

**Sobre HTTP**, vía un proceso real de [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver):

```bash
bxAgents serve --port=8080
```

Si tu proyecto tiene una entrada `gateways/*` con `{ exposes: "agent", path: "/api/chat" }`, el agente ahora es alcanzable en `POST http://localhost:8080/api/chat/invoke` (y `/stream`, `/batch`, `/info` - ver [gateways/](../conventions/gateways/index.md)).

!!! warning
    El primer request a la ruta `toAi()` de una app recién arrancada puede fallar transitoriamente - ver [Limitaciones conocidas](../known-limitations.md). Envía un request de calentamiento antes de depender de ello bajo carga.

## 6. Inspecciona, empaqueta, despliega

```bash
bxAgents inspect              # imprime .build/manifest.json de forma legible
bxAgents package --version=1.0.0   # escribe dist/my-agent-1.0.0.bxa + .sha256
bxAgents deploy --destination=/path/to/somewhere   # copia el .bxa más nuevo allí
```

Ver [El manifest](../manifest.md) y [Despliegue y secretos](../deployment-and-secrets.md).

## 7. Limpia

```bash
bxAgents clean
```

Elimina solo `.build/` y `dist/` - las convenciones fuente de tu proyecto (`Agent.bx`, `tools/`, etc.) nunca se tocan.

## Próximos pasos

- Recorre cada carpeta de convención en [Convenciones](../conventions/agent-bx.md).
- Mira los proyectos de muestra funcionales en [`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples).
- Ver los flags de cada verbo en [Referencia de CLI](../cli-reference.md).
