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

`bxAgents new` escribe este archivo. Un proyecto que no tenga uno recibe el cableado simple, así que los proyectos antiguos siguen compilando. `bxagents.Application` es el nombre que escribes; el build lo apunta a la clase generada (`app.bxagents.Wiring` o `app.bxagents.Application`, más abajo), así que un archivo escrito para un BxAgents anterior no necesita cambios.

## Dónde acaba

La app construida sigue la [plantilla ColdBox BoxLang](https://github.com/coldbox-templates/boxlang): la raíz web es `.build/public` y el código es `.build/app`. El Application.bx que carga el servidor es `.build/public/Application.bx`. Tiene dos variantes, elegidas al construir BxAgents (decisión del propietario, una línea en `ColdBoxAppGenerator.defaultVariant()`), y lo que puedes personalizar es lo mismo en ambas: **ajustes** y los tres **hooks**.

### Las dos variantes

| | `template` (por defecto) | `stub` |
|---|---|---|
| `.build/public/Application.bx` | el archivo de la plantilla, byte a byte, más cuatro bloques acotados | `class extends="app.bxagents.Application" {}`, o tu propio archivo |
| el cableado | `.build/app/bxagents/Wiring.bx` | `.build/app/bxagents/Application.bx` (la clase base) |
| tu `Application.bx` raíz | `.build/app/bxagents/UserApplication.bx`, `extends="app.bxagents.Wiring"`, creado por el archivo de la plantilla | `.build/public/Application.bx`, `extends="app.bxagents.Application"` |
| quién arranca ColdBox | el `onApplicationStart()` de la plantilla | el `onApplicationStart()` de la clase base |
| métodos de ciclo de vida que puedes definir | ninguno (`onApplicationStart`, `onRequestStart`, `onSessionStart` ... son del archivo de la plantilla) | todos: tu clase ES la Application |
| para elegirla | la de por defecto | `BXAGENTS_APPLICATION_VARIANT=stub` al construir |

En la variante `template` el archivo de la plantilla solo se **amplía**, nunca se edita: cada bloque va entre `// >>> BXAGENTS` y `// <<< BXAGENTS`, y quien compare el archivo con la plantilla ve cuatro pequeñas adiciones y nada más: se crea el cableado y sus ajustes se copian a `this`, `before()` corre primero en `onApplicationStart()`, `after()` corre justo después de `loadColdbox()`, y `beforeRequest()` corre primero en `onRequestStart()`.

## Qué hace el cableado generado

En cada build se escribe la clase de cableado en `.build/app/bxagents/` y se configura:

- el `name` de la app, las sesiones (activadas cuando hay una interfaz web) y la base de datos de la interfaz web;
- el data home, los logs y los ajustes de bx-ai (aplicados antes de que cargue ColdBox, porque los agentes se construyen mientras carga);
- las tools, los servidores MCP, los gateways y los [interceptores](interceptors.md), registrados cuando ColdBox ya cargó;
- `this.schedulers`, con la lista de los [schedules/](schedules.md) del proyecto como `app.schedules.<Nombre>`.

Empieza con un comentario que indica que está generado. No lo edites: el siguiente build lo sobrescribe.

## Sobrescribir un hook o añadir un ajuste

Tu clase se carga después del cableado, así que un ajuste que asignes gana, y un método que definas reemplaza el del cableado. Para añadir algo a un hook en lugar de reemplazarlo, llama a `super`:

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

Los tres hooks, iguales en ambas variantes:

| Hook | Corre |
|---|---|
| `before()` | al inicio del arranque de la app, antes de que cargue ColdBox: el data home, los logs, los ajustes de bx-ai |
| `after()` | cuando ColdBox ya cargó: tools, servidores MCP, gateways, interceptores, el almacén web |
| `beforeRequest()` | al inicio de cada request, antes de que ColdBox lo reciba (espera un cuerpo que el servidor no terminó de leer) |

!!! warning
    Reemplazar un hook sin llamar a `super` elimina el cableado que contiene (sin `before()`, no hay data home ni ajustes de bx-ai; sin `after()`, no hay tools ni gateways). Llama al método `super`, salvo que eso sea lo que quieres.

!!! note "Archivos antiguos"
    Un archivo que define `onApplicationStart()` u `onRequestStart()` y llama a `super.onApplicationStart()` es lo que documentaba un BxAgents anterior. En la variante `template` esos métodos son del archivo de la plantilla, así que el build avisa de que no se llaman: mueve el código a `before()`, `after()` o `beforeRequest()`, o construye con la variante `stub`, donde funcionan como antes.

## El nombre `bxagents`

`bxagents.Application` y `bxagents.Scheduler` son los nombres que escribes. En la app construida son las clases de `.build/app/bxagents/`, alcanzadas por el mapeo `/app` de la plantilla: `app.bxagents.Wiring`, `app.bxagents.Application` y `app.bxagents.Scheduler`. El build reescribe el `extends` de tu Application.bx y de tus schedulers, así que los archivos que extienden se copian con la app y nada depende de que el módulo esté instalado donde se ejecuta.

Las clases generadas existen después de un build. Antes del primer `bxAgents build`, un IDE no puede seguir `bxagents.Application`; la clase en sí no está en tu proyecto.

## Rutas

La raíz web `/` es ahora `.build/public`, así que `expandPath( "/" )` **no** es la app: usa `expandPath( "/app" )` (el mapeo de la plantilla) para un archivo de la app, por ejemplo `expandPath( "/app/config/agent-settings.json" )`.
