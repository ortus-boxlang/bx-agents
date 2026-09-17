---
title: "Lección 9: Dar tools a tu agente"
icon: phosphor-duotone:wrench
summary: Cualquier función anotada con @AITool bajo tools/ se convierte en una tool invocable.
description: Cualquier función anotada con @AITool bajo tools/ se convierte en una tool invocable.
tags: [course, conventions, tools]
---

# Dar tools a tu agente

Cualquier archivo `.bx` bajo `tools/` (buscado recursivamente, así que `tools/nested/Search.bx`
también funciona) que declare una función anotada con `@AITool` se convierte en una tool
invocable para tu agente.

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

BxAgents no escanea ni interpreta por sí mismo las anotaciones `@AITool` en tiempo de build -
solo descubre una entrada por archivo `.bx` (para comprobar colisiones de nombres) y copia
toda la carpeta `tools/` **literalmente** a la aplicación generada. Al arrancar, la aplicación
generada llama al propio escáner de bx-ai (`aiToolRegistry().scan( "tools" )`), que hace el
trabajo real de reflexión. Esta sentencia solo se emite si tu proyecto tiene realmente una
carpeta `tools/` con archivos dentro.

## Nombres

El nombre de la entrada descubierta es el nombre base del propio archivo - `Greeter.bx` pasa a
ser `Greeter`. Dos archivos de tool con el mismo nombre base, aunque estén en subcarpetas
distintas (ya que el descubrimiento es plano por nombre base), fallan la validación con un
error de nombre duplicado.

## Qué queda excluido

El descubrimiento ignora los archivos ocultos, y los `.env` y demás archivos ocultos dentro de
`tools/` nunca se copian a la salida del build, aunque estén presentes.

## Las reconstrucciones quedan limpias

`tools/` se copia con una estrategia de borrar-y-escribir en cada `build` - un archivo que
elimines de la carpeta `tools/` de tu proyecto nunca queda como resto obsoleto de un build
anterior.

## Pruébalo

Añade una tool real al agente que has ido construyendo:

```javascript
// tools/GetTime.bx
class {

	@AITool( "Get the current server time." )
	function now() {
		return dateTimeFormat( now(), "yyyy-mm-dd HH:nn:ss" );
	}

}
```

Reconstruye y chatea con él:

```bash
bxAgents build
bxAgents chat
> What time is it?
```

Referencia completa: [tools/](../conventions/tools.md).

Siguiente: [Lección 10 - Empaquetar skills](10-packaging-skills.md)
