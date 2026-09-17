---
title: El manifest
icon: phosphor-duotone:clipboard-text
summary: Qué registra cada build sobre exactamente qué entró en la app generada.
description: Qué registra cada build sobre exactamente qué entró en la app generada.
tags: [reference, build]
---

# El manifest

Cada `build` escribe `.build/manifest.json` - el propio registro de BxAgents de exactamente qué entró en la app generada. `bxAgents inspect` lo imprime de forma legible sin reconstruir; `bxAgents package` copia una versión **redactada** de él junto al `.bxa` (ver [Despliegue y secretos](deployment-and-secrets.md)).

## Esquema

```json
{
	"manifestVersion": "1.0.0",
	"generator": { "name": "bx-agents", "version": "dev" },
	"agent": {
		"name": "my-agent",
		"description": "",
		"model": "openai/gpt-5",
		"environment": "development"
	},
	"files": [
		{ "category": "tools", "name": "Greeter", "path": "tools/Greeter.bx", "hash": "..." }
	]
}
```

| Campo | Significado |
|---|---|
| `manifestVersion` | Marca semver para el propio esquema del manifest (actualmente `1.0.0`) - `package` se niega a ejecutarse si esto no está definido o está malformado. |
| `generator.name` / `generator.version` | Siempre `"bx-agents"` / la versión del módulo BxAgents que produjo este build. |
| `agent` | Solo campos seguros y estructurales (`name`, `description`, `model`, `environment`) - **nunca** secretos. Los secretos nunca se leen en el manifest en absoluto; los resuelve el propio bx-ai, en vivo, en tiempo de ejecución. |
| `files` | Una entrada por cada elemento de carpeta de convención descubierto, ordenado por categoría y luego por ruta para un orden determinista - independiente del orden de listado del sistema de archivos. |

## Hashes de contenido

El `hash` de cada entrada de `files[]` es un SHA-256 de su contenido:

- **Un archivo**: el hash de su contenido, con los finales de línea normalizados primero (los checkouts CRLF y LF del mismo contenido dan el mismo hash).
- **Un directorio** (una carpeta de skill, una carpeta de subagente, una carpeta de módulo): el hash de cada `relativePath:contentHash` propio de los archivos contenidos, recursivamente, ordenado para determinismo - así que renombrar o editar cualquier archivo individual dentro cambia el hash de toda la carpeta.

Esto es lo que hace que reconstruir un proyecto sin cambios produzca un manifest **idéntico**: las mismas categorías, el mismo orden, los mismos hashes, cada vez - y es exactamente por qué cambiar el contenido de un archivo de tool solo cambia jamás el hash de esa entrada, nada más.

## Política de compatibilidad

`manifestVersion` existe para que un futuro cambio disruptivo en este esquema pueda ser detectado por cualquier cosa que lea `manifest.json` (un destino de despliegue, una futura versión de `inspect`, herramientas externas) - una herramienta que encuentre una versión mayor no reconocida debería negarse a adivinar la forma y fallar claramente, en lugar de leer mal los campos silenciosamente.
