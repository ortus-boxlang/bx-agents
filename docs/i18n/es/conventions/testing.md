---
title: tests/
icon: phosphor-duotone:test-tube
summary: Cada proyecto generado con andamiaje obtiene una suite de TestBox lista para ejecutar.
description: Cada proyecto generado con andamiaje obtiene una suite de TestBox lista para ejecutar.
tags: [conventions, testing]
---

# tests/

Cada proyecto generado vía `bxAgents new` obtiene una carpeta `tests/` lista para ejecutar: un `tests/box.json` (declarando una dependencia `testbox`) y `tests/specs/AgentSpec.bx`, un spec de ejemplo que pasa de inmediato.

```bash
cd my-agent/tests
box install       # obtiene testbox/ en tests/testbox
cd ..
bxAgents test
```

!!! info
    Inspirado en la propia carpeta dedicada `tests/` + `box.json` de la plantilla `coldbox-templates/boxlang` - adaptado a la historia de pruebas más simple propia de BX Agents. Probar un agente trata sobre su **comportamiento** (qué dice, qué tools llama), no el enrutamiento HTTP, así que no hay ningún `Application.bx`/app virtual de ColdBox involucrado aquí en absoluto.

## Escribiendo un spec

Extiende `bxModules.bxagents.models.testing.BaseAgentSpec` (una subclase de `testbox.system.BaseSpec`) en lugar de `testbox.system.BaseSpec` directamente:

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

`BaseAgentSpec` construye tu agente una vez por paquete de spec (`beforeAll()`), contra una **copia temporal desechable** de tu proyecto - nunca toca tu `.build/app` real, así que ejecutar pruebas nunca destruye (ni es destruido por) un ciclo real de `build`/`serve`/`package`. El agente construido se expone como `agent`.

## Probando contra el proveedor mock

Por defecto, `bxAgents test` construye tu agente usando el override de entorno `test()` de `Agent.bx` (generado automáticamente):

```javascript
// Agent.bx
function test() {
	return {
		model : "mock/mock-model"
	};
}
```

Esto significa que tus pruebas no necesitan **ni clave de API ni acceso a red** desde el principio - la misma convención de proveedor `mock` usada en toda la propia suite de pruebas de BX Agents. Edita este override si quieres que un spec se ejecute contra un proveedor real en su lugar (necesitarás una clave de API real disponible en el entorno que ejecuta las pruebas).

### `mockResponses( responses )`

Programa las siguientes respuestas del agente, consumidas en orden - una por round-trip de LLM, incluyendo los turnos intermedios de un bucle de invocación de tool:

```javascript
mockResponses( [
	{ toolCalls: [ { name: "getWeather", arguments: { city: "Miami" } } ] },
	"It's sunny in Miami!"
] )

var response = agent.run( "What's the weather in Miami?" )
```

Una cadena simple programa una respuesta final. Un struct `{ toolCalls: [ { name, arguments } ] }` programa un turno de invocación de tool - la tool nombrada **realmente se ejecuta de verdad** (contra tu propia implementación real de `tools/`), y su valor de retorno real es lo que el siguiente round-trip ve; solo la propia respuesta del LLM está programada, nunca el comportamiento de la tool.

## Matchers personalizados

`BaseAgentSpec` registra algunos matchers, adaptados a probar el comportamiento del agente, vía el propio punto de extensión `addMatchers()` de TestBox - úsalos exactamente como cualquier matcher incorporado de TestBox, incluyendo negación (`notTo...`):

| Matcher | Comprueba |
|---|---|
| `toContainText( "substring" )` | El valor real (usualmente una cadena de respuesta) contiene el texto dado, sin distinguir mayúsculas/minúsculas. |
| `toHaveCalledTool( "toolName" )` | Los propios requests de proveedor registrados del agente muestran que realmente decidió invocar la tool nombrada - no solo que la tool existe. |
| `toHaveReceivedMessage( "substring" )` | Algún mensaje realmente enviado al proveedor (cualquier rol, cualquier round-trip) contenía el texto dado - útil para afirmar que tu system prompt/instrucciones realmente llegaron al modelo. |

```javascript
expect( agent ).toHaveCalledTool( "getWeather" )
expect( agent ).notToHaveCalledTool( "getStockPrice" )
```

## Ejecutando pruebas

```bash
bxAgents test
```

Ejecuta los `tests/specs/**` de tu proyecto vía TestBox, en un proceso hijo nuevo (así que nunca compite por las propias cachés de mapeo de clases de BoxLang con cualquier otra cosa que estés ejecutando). Imprime conteos de paquete/suite/spec y totales de aprobado/fallido/con error/omitido, más una línea por fallo, y sale con código distinto de cero si algo falló - adecuado como puerta de CI antes de `deploy`.

!!! warning
    `bxAgents test` requiere `testbox` realmente instalado bajo `tests/testbox` (`cd tests && box install`) - falla claramente, en lugar de reportar silenciosamente cero specs, si eso todavía no se ha hecho.
