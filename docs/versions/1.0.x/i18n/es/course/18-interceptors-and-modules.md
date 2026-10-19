---
title: "Lección 18: Interceptores y dependencias de módulos"
icon: phosphor-duotone:funnel
summary: Hooks de ciclo de vida de ColdBox acotados con @scope, y dependencias de módulos de BoxLang bajo modules/.
description: Hooks de ciclo de vida de ColdBox acotados con @scope, y dependencias de módulos de BoxLang bajo modules/.
tags: [course, conventions, interceptors, modules]
---

# Interceptores y dependencias de módulos

Dos convenciones más pequeñas e independientes completan el cuadro: hooks de ciclo de vida
dentro de la aplicación ColdBox generada, y las dependencias de módulos de BoxLang que se declaran.

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

Ya has visto interceptores **generados** sin haber escrito ninguno tú - las compuertas de
clave de API y de inicio de sesión de la UI web de la [Lección 15](15-the-generated-web-chat-ui.md)
se registran exactamente así, solo que escritas por BxAgents en vez de por ti.

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

Añade un `interceptors/RequestLogger.bx` con una anotación explícita `@scope agent` que
registre cada petición entrante mediante `writeLog()`, reconstruye, y comprueba
`.build/app/interceptors/` para ver la copia, más su registro en
`.build/app/Application.bx`.

Referencia completa: [interceptors/](../conventions/interceptors.md), [modules/](../conventions/modules.md).

Siguiente: [Lección 19 - Probar tu agente](19-testing-your-agent.md)
