---
title: box.json
icon: phosphor-duotone:package
summary: "Añade tus propios paquetes: módulos BoxLang como bx-playwright, módulos ColdBox, TestBox."
description: "Añade tus propios paquetes: módulos BoxLang como bx-playwright, módulos ColdBox, TestBox."
tags: [conventions, dependencies]
---

# box.json

BxAgents ya incluye BX AI, ColdBox y los demás módulos que usan los agentes, así que la mayoría de los agentes no necesita un `box.json`. Añade uno en la raíz del proyecto cuando un agente necesite un paquete que no viene incluido, por ejemplo `bx-playwright` para las tools de navegador:

```json
{
  "name": "support-bot",
  "dependencies": {
    "bx-playwright": "*",
    "cbvalidation": "^4"
  },
  "devDependencies": {
    "testbox": "*"
  }
}
```

```bash
bxAgents install
```

`install` descarga cada paquete de [ForgeBox](https://www.forgebox.io) (no hace falta el CLI `box`), junto con lo que esos paquetes necesitan. `build` lo ejecuta por ti cuando `box.json` cambió, así que en un checkout nuevo basta con `bxAgents build`.

## Dónde van los paquetes

| Tipo de paquete en ForgeBox | Se instala en | Notas |
|---|---|---|
| Módulo BoxLang (`boxlang-modules`) | `boxlang_modules/<nombre del módulo>` | BoxLang carga esta carpeta desde la raíz del proyecto, así que `chat`, `invoke` y `test` encuentran el módulo. `build` la copia a `.build/app` para que `serve` y un `.bxa` también la lleven. |
| Módulo ColdBox (`modules`) | `lib/modules/<nombre>` | `build` copia `lib/modules` a la app. |
| Cualquier otro (TestBox, ...) | `lib/<nombre>` | Se usa en local; no se copia a la app. |

Tanto `boxlang_modules/` como `lib/` son salida instalada: no los pongas en el control de versiones.

Cambia una ubicación con `installPaths` (un paquete) o `installPathConventions` (todos los paquetes de un tipo de ForgeBox). Ambos son carpetas dentro del proyecto:

```json
{
  "installPathConventions": { "modules": "lib/modules" },
  "installPaths": { "testbox": "lib/testbox/" }
}
```

## Rangos de versión

El valor de una dependencia es un rango de versión, o `forgebox:slug@rango`.

| Rango | Significa |
|---|---|
| `*` | La versión más reciente. Una pre-release como `1.0.0-snapshot` solo cuando no existe otra. |
| `1.2.3` | Exactamente esa versión. Nombra una pre-release para obtenerla: `1.0.0-snapshot`. |
| `^1.2.3` | De `1.2.3` hasta `2.0.0` sin incluirla (`^0.2.3` se detiene en `0.3.0`). |
| `~1.2.3` | De `1.2.3` hasta `1.3.0` sin incluirla. |
| `1`, `1.x`, `1.2` | Cualquier versión de ese major, o major.minor. |
| `>=1.0.0 <2.0.0` | Comparadores, todos deben cumplirse. `^1 \|\| ^3` acepta cualquiera. |

Solo se admiten paquetes de ForgeBox. Una URL o un origen Git es un error que lo dice.

## Qué hace install

- Elige la versión más reciente del rango, la descarga y reemplaza la carpeta. Un paquete ya instalado en esa versión se deja como está.
- Instala lo que el propio `box.json` de cada paquete necesita. Los paquetes que BxAgents incluye (BX AI, bx-sqlite, bx-ftp, bx-mail, bx-yaml, ColdBox, qb, cbsecurity, cbauth, cbmailservices) no se vuelven a instalar por una dependencia. Lista uno tú mismo para usar tu propia versión.
- `bxAgents install --production` omite `devDependencies`. `build` siempre lo hace.
- Recuerda lo instalado en `.build/install.json`, así `build` no hace nada cuando `box.json` no cambió y las carpetas instaladas siguen ahí.

## Usar un módulo instalado

Un módulo que registra tools, como `bx-playwright`, se usa nombrando sus tools en [`tools`](agent-yaml.md#tools) del agente. Si el módulo no está instalado, el error indica añadirlo a `box.json` y ejecutar `bxAgents install`:

```yaml
tools:
  - "*@bxplaywright"
```

!!! note
    `box.json` es distinto de [`modules/`](modules.md), que contiene módulos ColdBox que forman parte del código fuente de tu propio proyecto.
