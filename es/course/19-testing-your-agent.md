---
title: "Lección 19: Probar tu agente"
icon: phosphor-duotone:test-tube
summary: Una suite TestBox lista para ejecutar, mockResponses(), y matchers pensados para el comportamiento de agentes.
description: Una suite TestBox lista para ejecutar, mockResponses(), y matchers pensados para el comportamiento de agentes.
tags: [course, testing]
---

# Probar tu agente

Todo proyecto creado con `bxAgents new` ([Lección 4](04-scaffolding-your-first-agent.md)) ya
trae una carpeta `tests/` lista para ejecutar: `tests/box.json` y `tests/specs/AgentSpec.bx`,
una spec que pasa de fábrica.

```bash
cd my-agent/tests
box install       # fetches testbox/ into tests/testbox - new already ran this for you
cd ..
bxAgents test
```

## Escribir una spec

Extiende `bxModules.bxagents.models.testing.BaseAgentSpec` en lugar de
`testbox.system.BaseSpec` directamente:

```javascript
// tests/specs/AgentSpec.bx
class extends="bxModules.bxagents.models.testing.BaseAgentSpec" {

	function run() {
		describe( "my-agent", function() {

			it( "responds to a greeting", function() {
				mockResponses( [ "Hello! How can I help you today?" ] )

				var response = agent.run( "Hi there" )

				expect( response ).toContainText( "Hello" )
			} )

		} )
	}

}
```

`BaseAgentSpec` construye tu agente una vez por bundle de specs, contra una **copia temporal
desechable** de tu proyecto - nunca toca tu `.build/app` real, así que probar nunca destroza un
ciclo real de `build`/`serve`/`package`. El agente construido se expone como `agent`.

## Probar no necesita ninguna clave de API

Por defecto, `bxAgents test` construye tu agente usando una sobrescritura de entorno `test()`
en `Agent.bx`, creada automáticamente por `new`:

```javascript
function test() {
	return {
		model : "mock/mock-model"
	};
}
```

Es el mismo proveedor `mock` que conociste en la [Lección 5](05-agent-bx.md) - sin llamadas de
red, sin clave de API, con una CI determinista.

## `mockResponses()`

Programa las siguientes respuestas del agente, consumidas en orden - una por cada ida y vuelta
al LLM, incluidos los turnos intermedios de un bucle de llamada a tools:

```javascript
mockResponses( [
	{ toolCalls: [ { name: "getWeather", arguments: { city: "Miami" } } ] },
	"It's sunny in Miami!"
] )

var response = agent.run( "What's the weather in Miami?" )
```

Una cadena simple programa una respuesta final. Un struct `{ toolCalls: [...] }` programa un
turno de llamada a tool - la tool nombrada **se ejecuta realmente de verdad** contra tu
implementación real en `tools/` (de la [Lección 9](09-giving-your-agent-tools.md)); solo se
programa la respuesta del propio LLM, nunca el comportamiento de la tool.

## Matchers pensados para el comportamiento de agentes

| Matcher | Comprueba |
|---|---|
| `toContainText( "substring" )` | Que la respuesta contiene el texto dado, sin distinguir mayúsculas. |
| `toHaveCalledTool( "toolName" )` | Que el agente decidió realmente invocar la tool nombrada. |
| `toHaveReceivedMessage( "substring" )` | Que algún mensaje enviado al proveedor contenía el texto dado - útil para afirmar que tu `instructions.md` llegó de verdad al modelo. |

```javascript
expect( agent ).toHaveCalledTool( "getWeather" )
expect( agent ).notToHaveCalledTool( "getStockPrice" )
```

## Pruébalo

Escribe una spec que programe una llamada a la tool `GetTime` de la
[Lección 9](09-giving-your-agent-tools.md), y afirma `toHaveCalledTool( "now" )`.

```bash
bxAgents test
```

Imprime los conteos de pasadas/fallos/errores/omitidas, una línea por fallo, y sale con un
código distinto de cero si algo falla - apto como barrera de CI antes de desplegar en la
siguiente lección.

Referencia completa: [tests/](../conventions/testing.md).

Siguiente: [Lección 20 - Empaquetar, desplegar y cerrar](20-packaging-deploying-and-wrapping-up.md)
