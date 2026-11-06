---
title: "Lección 18: Interceptores y dependencias de módulos"
icon: phosphor-duotone:funnel
summary: Hooks de ciclo de vida de ColdBox acotados con @scope, y dependencias de módulos de BoxLang bajo modules/.
description: Hooks de ciclo de vida de ColdBox acotados con @scope, y dependencias de módulos de BoxLang bajo modules/.
tags: [course, conventions, interceptors, modules]
---

# Interceptores y dependencias de módulos

Tres convenciones más pequeñas e independientes completan el cuadro: hooks de ciclo de vida
dentro de la aplicación ColdBox generada, extensiones para el chat y el agente servido, y las
dependencias de módulos de BoxLang que se declaran.

## `interceptors/` - hooks de ciclo de vida de ColdBox

Los archivos `interceptors/*.bx` son interceptores de ColdBox (`preProcess`, `postProcess` y
otros puntos de enganche del ciclo de vida), acotados mediante una anotación `@scope` en la
propia clase:

```javascript
// interceptors/AuditLogger.bx
/**
 * @scope agent
 */
class {

	function preProcess( event, interceptData ) {
		// ...
	}

}
```

| Ámbito | Efecto |
|---|---|
| `agent` (por defecto) | Se copia en la carpeta `interceptors/` de la aplicación generada - afecta solo a esta aplicación. |
| `runtime` | Se copia a `.build/runtime-interceptors`, fuera de la aplicación, para todo el runtime de BoxLang y no solo para esta aplicación. BxAgents no los registra por ti. |

Un interceptor sin ningún `@scope` toma por defecto `agent` - la opción más estrecha y segura,
ya que el ámbito `runtime` tiene efectos más allá de una sola aplicación. Un valor de `@scope`
que no sea `agent` ni `runtime` hace fallar el build con un error claro.

Ya has visto un interceptor **generado** sin haber escrito ninguno tú - cuando listas
`users` en el chat web ([Lección 15](15-the-generated-web-chat-ui.md)), su compuerta de inicio de
sesión se registra exactamente así, solo que escrita por BxAgents en vez de por ti.

## `extensions/` - añadir al chat y al agente servido

Un interceptor reacciona a la petición de ColdBox. Una **extensión** añade a BxAgents mismo, sin
cambiarlo. Un archivo `.bx` es una extensión completa: se lee como un `ModuleConfig` de ColdBox (un
`configure()`, un `onLoad()`), y los métodos anotados se convierten en comandos de chat.

```javascript
// extensions/hello.bx
class {

	@Command( "hello" )
	@Hint( "say hello: /hello <name>" )
	function greet( agentContext, commandArguments ) {
		return agentContext.reply().ok( "Hello, #commandArguments#!" )
	}

}
```

Ejecuta `bxAgents chat` y escribe `/hello Ada`; `/extensions` lista lo que se cargó. El mismo comando
funciona en la página web y, si se permite, en las plataformas de chat. Una carpeta con un
`Extension.bx` puede traer más: teclas (`@Key`), elementos de estado (`@Status`), fuentes `@` y
prefijos de mensaje para la terminal, huecos en la página web, listeners de eventos de chat y de
bx-ai, schedulers, tools, skills, un nuevo tipo de gateway o un verbo de `bxAgents`. Los valores de
una extensión van bajo `extensions:` en `Agent.yaml`.

Empieza una con `bxAgents add extension standup`, que pregunta qué traer y escribe stubs que
funcionan. Instala la de otra persona con `bxAgents extensions install <carpeta, zip, owner/repo,
dirección o slug de ForgeBox>`: muestra lo que añade la extensión y pregunta antes, y la registra en
`extensions.lock.json`, que sí versionas. `bxAgents extensions link <carpeta>` enlaza una en la que
estás trabajando, y `/reload` recoge tus ediciones. Consulta la referencia de
[`extensions/`](../conventions/extensions.md) y la guía [Escribe tu primera extensión](../guides/first-extension.md).

## `modules/` - dependencias de módulos de BoxLang

`modules/` contiene las dependencias de módulos de BoxLang que tu agente declara - una
subcarpeta inmediata por módulo, descubierta por nombre de carpeta (no recursivo):

```
modules/
└── my-extra-module/
    ├── module.json
    └── ...
```

Una carpeta de módulo puede incluir un `module.json` con un array `dependsOn` que nombre otras
entradas de `modules/*` por nombre de carpeta:

```json
{
	"dependsOn": [ "some-other-module" ]
}
```

Esta es la convención propia de BxAgents para declarar dependencias a efectos de validación -
es independiente del mecanismo de carga de módulos del propio BoxLang, y hoy `build` valida y
registra estas carpetas en el manifest sin cargarlas en la aplicación generada. Las **dependencias
circulares** se rechazan igual que los ciclos de subagentes (consulta la
[Lección 11](11-composing-subagents.md)): se informa del camino completo del ciclo y no se
genera código hasta que el grafo sea acíclico. Un `module.json` es totalmente opcional - de
una carpeta de módulo que no lo tenga se asume que no declara dependencias.

## Pruébalo

Prueba `bxAgents add extension hello --with=command` y `/hello` en el chat. Después añade un `interceptors/RequestLogger.bx` con una anotación explícita `@scope agent` que
registre cada petición entrante mediante `writeLog()`, reconstruye, y comprueba
`.build/app/interceptors/` para ver la copia, más su registro en
`.build/app/Application.bx`.

Referencia completa: [interceptors/](../conventions/interceptors.md), [modules/](../conventions/modules.md).

Siguiente: [Lección 19 - Probar tu agente](19-testing-your-agent.md)
