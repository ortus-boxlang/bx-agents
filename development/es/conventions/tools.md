---
title: tools/
icon: phosphor-duotone:wrench
summary: Cualquier función anotada con @AITool bajo tools/ se convierte en una tool invocable.
description: Cualquier función anotada con @AITool bajo tools/ se convierte en una tool invocable.
tags: [conventions, tools]
---

# tools/

Cualquier archivo `.bx` bajo `tools/` (buscado **recursivamente**, así que subcarpetas como `tools/nested/Search.bx` también funcionan) que declare una función anotada con `@AITool` se convierte en una tool invocable para el agente.

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

BX Agents no escanea ni interpreta las anotaciones `@AITool` él mismo - descubre una entrada por archivo `.bx` (para comprobación de colisión de nombres) y luego copia toda la carpeta `tools/` **textualmente** a la app generada. En el arranque, la app generada llama al propio scanner de bx-ai:

```javascript
aiToolRegistry().scan( "tools" )
```

que hace el trabajo real de reflexión (recorriendo los archivos copiados, instanciando cada clase, encontrando funciones `@AITool`). Esta sentencia solo se emite en absoluto si el proyecto realmente tiene una carpeta `tools/` con archivos en ella.

## Nombramiento

El nombre de entrada descubierto es el propio nombre base del archivo (`Greeter.bx` → `Greeter`). Dos archivos de tool con el mismo nombre base (incluso en subcarpetas diferentes, ya que el descubrimiento es plano por nombre base) fallan la validación con un error de nombre duplicado.

## Qué se excluye

- Los dotfiles (cualquier cosa que empiece con `.`) se ignoran en el descubrimiento.
- Los `.env`/dotfiles dentro de `tools/` nunca se copian a la salida del build, incluso si están presentes - el paso de copia los excluye explícitamente.

## Reconstrucciones

`tools/` se copia con una estrategia de borrar-y-escribir: el propio directorio `tools/` de la app generada se elimina y se reescribe en cada `build`, así que un archivo eliminado de la carpeta `tools/` de tu proyecto no persiste como salida obsoleta de un build anterior.
