---
title: Application.bx
icon: phosphor-duotone:gear-six
summary: "Tu propio Application.bx raíz, que extiende la clase que genera cada build."
description: "Tu propio Application.bx raíz, que extiende la clase que genera cada build."
tags: [conventions, configuration]
---

# Application.bx

Un proyecto tiene su propio `Application.bx` en la raíz. Es donde viven los ajustes y los hooks de ciclo de vida de tu app. **Extiende** una clase que BxAgents genera en cada build, que contiene el cableado:

```javascript
// Application.bx
class extends="bxagents.Application" {

}
```

`bxAgents new` escribe este archivo. Un proyecto que no tenga uno recibe la clase fina de arriba, así que los proyectos antiguos siguen compilando. `bxagents.Application` es el nombre que escribes; el build lo apunta a la clase generada (`app.bxagents.Application`, más abajo), así que un archivo escrito para un BxAgents anterior no necesita cambios.

## Dónde acaba

La app construida sigue la [plantilla ColdBox BoxLang](https://github.com/coldbox-templates/boxlang): la raíz web es `.build/public` y el código es `.build/app`. El Application.bx que carga el servidor es `.build/public/Application.bx`. Está **derivado del `public/Application.bx` de la plantilla y modificado a conveniencia**, y termina como una clase fina que extiende la base generada, `.build/app/bxagents/Application.bx`:

```javascript
// .build/public/Application.bx (el tuyo, o este si el proyecto no tiene)
class extends="app.bxagents.Application" {
}
```

Lo que se deriva del archivo de la plantilla, en los términos de la propia plantilla, y vive en la base generada: los ajustes `COLDBOX_APP_ROOT_PATH`, `COLDBOX_APP_MAPPING` y `COLDBOX_WEB_MAPPING` (`/app` y `/`), la llamada a `new coldbox.system.Bootstrap( ... )` seguida de `loadColdbox()` en `onApplicationStart()`, y `onRequestStart()` pasando la petición al bootstrap.

Lo que cambia:

- el ciclo de vida no está en la raíz web: está en la base, así que `public/` tiene una clase fina y la lógica no se sirve;
- el `name` de la app, las sesiones, el datasource de la interfaz web y `this.schedulers` se generan a partir del proyecto;
- el data home, los logs y los ajustes de bx-ai se preparan antes de que cargue ColdBox, y las tools, los servidores MCP, los gateways y los interceptores se registran cuando ya cargó;
- `onApplicationEnd()`, `onSessionStart()`, `onSessionEnd()` y `onMissingTemplate()` de la plantilla no se trasladan (una clase que extienda la base puede definirlos);
- se añaden tres hooks, `before()`, `after()` y `beforeRequest()`.

El archivo de la plantilla sigue en el módulo (va incluido, ver `templates/coldbox-boxlang/VERSION`) y es lo primero que coloca el build; el generador lo reemplaza después.

## Qué hace la base generada

En cada build se escribe la clase base en `.build/app/bxagents/` y se configura:

- el `name` de la app, las sesiones (activadas cuando hay una interfaz web) y la base de datos de la interfaz web;
- el data home, los logs y los ajustes de bx-ai (aplicados antes de que cargue ColdBox, porque los agentes se construyen mientras carga);
- ColdBox, iniciado desde `onApplicationStart()`;
- las tools, los servidores MCP, los gateways y los [interceptores](interceptors.md), registrados cuando ColdBox ya cargó;
- `this.schedulers`, con la lista de los [schedules/](schedules.md) del proyecto como `app.schedules.<Nombre>`.

Empieza con un comentario que indica que está generado. No lo edites: el siguiente build lo sobrescribe.

## Sobrescribir un hook o añadir un ajuste

Tu clase se carga después de la base, así que un ajuste que asignes gana, y un método que definas reemplaza el de la base. Para añadir algo a un hook en lugar de reemplazarlo, llama a `super`:

```javascript
// Application.bx
class extends="bxagents.Application" {

	this.sessionTimeout = createTimeSpan( 0, 4, 0, 0 )

	// cuando ColdBox ya cargó (y las tools, gateways e interceptores están registrados)
	function after() {
		super.after()
		application.startedAt = now()
	}

}
```

Los tres hooks:

| Hook | Corre |
|---|---|
| `before()` | al inicio del arranque de la app, antes de que cargue ColdBox: el data home, los logs, los ajustes de bx-ai |
| `after()` | cuando ColdBox ya cargó: tools, servidores MCP, gateways, interceptores, el almacén web |
| `beforeRequest()` | al inicio de cada request, antes de que ColdBox lo reciba (espera un cuerpo que el servidor no terminó de leer) |

!!! warning
    Reemplazar un hook sin llamar a `super` elimina lo que contiene (sin `before()`, no hay data home ni ajustes de bx-ai; sin `after()`, no hay tools ni gateways). Llama al método `super`, salvo que eso sea lo que quieres.

Todavía puedes sobrescribir `onApplicationStart()` y `onRequestStart()` (tu clase es la Application) y llamar a `super.onApplicationStart()`; los hooks son la forma más ligera de añadirles algo.

## El nombre `bxagents`

`bxagents.Application` y `bxagents.Scheduler` son los nombres que escribes. En la app construida son las clases de `.build/app/bxagents/`, alcanzadas por el mapeo `/app` de la plantilla: `app.bxagents.Application` y `app.bxagents.Scheduler`. El build reescribe el `extends` de tu Application.bx y de tus schedulers, así que los archivos que extienden se copian con la app y nada depende de que el módulo esté instalado donde se ejecuta.

Las clases generadas existen después de un build. Antes del primer `bxAgents build`, un IDE no puede seguir `bxagents.Application`; la clase en sí no está en tu proyecto.

## Rutas

La raíz web `/` es ahora `.build/public`, así que `expandPath( "/" )` **no** es la app: usa `expandPath( "/app" )` (el mapeo de la plantilla) para un archivo de la app, por ejemplo `expandPath( "/app/config/agent-settings.json" )`.
