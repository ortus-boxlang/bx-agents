---
title: "Lección 18: Interceptores y dependencias de módulos"
icon: phosphor-duotone:funnel
summary: Hooks de ciclo de vida de ColdBox acotados con @scope, y dependencias de módulos de BoxLang bajo modules/.
description: Hooks de ciclo de vida de ColdBox acotados con @scope, y dependencias de módulos de BoxLang bajo modules/.
tags: [course, conventions, interceptors, modules]
---

# Interceptores y dependencias de módulos

Dos convenciones más pequeñas e independientes completan el cuadro: hooks de ciclo de vida
dentro de la aplicación ColdBox generada, y las dependencias de módulos de BoxLang que tu
agente necesita en tiempo de ejecución.

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
| `runtime` | Se registra contra todo el runtime de BoxLang, no solo contra esta aplicación. |

Un interceptor sin ningún `@scope` toma por defecto `agent` - la opción más estrecha y segura,
ya que el ámbito `runtime` tiene efectos más allá de una sola aplicación. Un valor de `@scope`
que no sea `agent` ni `runtime` hace fallar el build con un error claro.

Ya has visto un interceptor **generado** sin haber escrito ninguno tú -
`GatewaySessionBootstrap.bx` de la [Lección 14](14-connecting-chat-platforms.md) y
`WebUiSchema.bx` de la [Lección 15](15-the-generated-web-chat-ui.md) funcionan exactamente así,
solo que escritos por BxAgents en vez de por ti.

## `modules/` - dependencias de módulos de BoxLang

`modules/` contiene las dependencias de módulos de BoxLang que tu agente necesita - una
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
es independiente del mecanismo de carga de módulos del propio BoxLang. Las **dependencias
circulares** se rechazan igual que los ciclos de subagentes (consulta la
[Lección 11](11-composing-subagents.md)): se informa del camino completo del ciclo y no se
genera código hasta que el grafo sea acíclico. Un `module.json` es totalmente opcional - de
una carpeta de módulo que no lo tenga se asume que no declara dependencias.

## Pruébalo

Añade un `interceptors/RequestLogger.bx` con una anotación explícita `@scope agent` que
registre cada petición entrante mediante `writeLog()`, reconstruye, y comprueba
`.build/app/interceptors/` para ver la copia, más su registro en
`.build/app/config/ColdBox.bx`.

Referencia completa: [interceptors/](../conventions/interceptors.md), [modules/](../conventions/modules.md).

Siguiente: [Lección 19 - Probar tu agente](19-testing-your-agent.md)
