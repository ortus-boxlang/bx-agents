---
title: Application.bx
icon: phosphor-duotone:gear-six
summary: "Tu propio Application.bx raíz, que extiende la clase que genera cada build."
description: "Tu propio Application.bx raíz, que extiende la clase que genera cada build."
tags: [conventions, configuration]
---

# Application.bx

Un proyecto tiene su propio `Application.bx` en la raíz. Es el archivo que carga el runtime, así que los ajustes y los hooks de ciclo de vida de tu app viven aquí. **Extiende** una clase que BxAgents genera en cada build, que contiene el cableado:

```javascript
// Application.bx
class extends="bxagents.Application" {

}
```

`bxAgents new` escribe este archivo. El build lo copia tal cual a la app generada. Un proyecto que no tenga uno recibe exactamente este archivo generado, así que los proyectos antiguos siguen compilando.

## Qué hace la base generada

En cada build se escribe `bxagents/Application.bx` en `.build/app/` y se configura:

- el `name` de la app, las sesiones (activadas cuando hay una interfaz web) y la base de datos de la interfaz web;
- ColdBox, iniciado desde `onApplicationStart()`, con los ajustes de bx-ai aplicados primero;
- las tools, los servidores MCP, los gateways y los [interceptores](interceptors.md), registrados al arrancar;
- `this.schedulers`, con la lista de los [schedules/](schedules.md) del proyecto.

Empieza con un comentario que indica que está generado. No lo edites: el siguiente build lo sobrescribe.

## Sobrescribir un hook o añadir un ajuste

Tu clase se carga después de la base, así que un ajuste que asignes gana, y un método que definas reemplaza el de la base. Para añadir algo a un hook en lugar de reemplazarlo, llama a `super`:

```javascript
// Application.bx
class extends="bxagents.Application" {

	this.sessionTimeout = createTimeSpan( 0, 4, 0, 0 )

	function onApplicationStart() {
		var started = super.onApplicationStart()
		application.startedAt = now()
		return started
	}

}
```

!!! warning
    Reemplazar `onApplicationStart()` o `onRequestStart()` sin llamar a `super` elimina el cableado anterior (ColdBox nunca arranca). Llama siempre al método `super`, salvo que eso sea lo que quieres.

## El mapeo `bxagents`

`bxagents.Application` y `bxagents.Scheduler` se resuelven a la carpeta `bxagents/` dentro de la app construida, así que los archivos que extienden se copian con ella y nada depende de que el módulo esté instalado donde se ejecuta la app. Los helpers de runtime que necesita la app construida viven ahí.

La carpeta existe después de un build. Antes del primer `bxAgents build`, un IDE no puede seguir `bxagents.Application`; la clase en sí no está en tu proyecto.

## Rutas

La base vive una carpeta más abajo, así que resuelve las rutas desde la carpeta de la app, no desde su propia ubicación. Si escribes código en `Application.bx` que lee un archivo, usa `expandPath( "/..." )` desde la raíz de la app.
