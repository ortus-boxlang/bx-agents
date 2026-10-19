---
title: box.json
icon: phosphor-duotone:package
summary: "Lista los paquetes extra que necesita tu agente, como bx-playwright. Tú los instalas; el build los lleva a la app."
description: "Lista los paquetes extra que necesita tu agente, como bx-playwright. Tú los instalas; el build los lleva a la app."
tags: [conventions, dependencies]
---

# box.json

BxAgents ya incluye BX AI, ColdBox y los demás módulos que usan los agentes, así que la mayoría de los agentes no necesita nada más. Cuando un agente necesita un paquete que no viene incluido, por ejemplo `bx-playwright` para las tools de navegador, lístalo en un `box.json` en la raíz del proyecto e instálalo tú mismo:

```json
{
  "name": "support-bot",
  "dependencies": {
    "bx-playwright": "*"
  },
  "devDependencies": {
    "testbox": "*"
  }
}
```

BxAgents nunca instala nada. Instala los paquetes como lo haces normalmente, con CommandBox (`box install`) o el binario de BoxLang (`install-bx-module bx-playwright --local`), desde la raíz del proyecto. `bxAgents new` genera un `box.json` por ti, con TestBox como dependencia de desarrollo instalada en `lib/testbox`, y un `.gitignore` que ya ignora `lib/` y `boxlang_modules/`. Haz commit de `box.json`; mantén las carpetas instaladas fuera del control de versiones.

## Dónde van los paquetes instalados

| Qué | Carpeta en el proyecto | Qué hace `build` con ello |
|---|---|---|
| Módulos BoxLang (`bx-playwright`, ...) | `boxlang_modules/` | BoxLang carga esta carpeta desde la raíz del proyecto, así que `chat`, `invoke` y `test` los encuentran. `build` la copia a `.build/app/boxlang_modules`, para que `serve` y un `.bxa` empaquetado también la lleven. |
| Librerías y módulos ColdBox | `lib/coldbox`, `lib/modules/<nombre>` | Se copian a la app sobre los incluidos, así un proyecto puede añadir o reemplazar una librería. |
| Herramientas de pruebas (TestBox, ...) | `lib/<nombre>` o `tests/` | No se copian: la app no las necesita. |

## Dependencias de desarrollo

Un módulo BoxLang que solo está en `devDependencies` se deja fuera de `.build/app`, y el build indica cuál. Un módulo se asocia con `box.json` por el `slug` de su propio `box.json`, o por el nombre de su carpeta (`bxplaywright` para `bx-playwright`). Uno listado en ambas secciones se conserva.

## Usar un módulo instalado

Un módulo que registra tools, como `bx-playwright`, se usa nombrando sus tools en [`tools`](agent-yaml.md#tools) del agente. Si el módulo no está instalado, el error indica cómo instalarlo:

```yaml
tools:
  - "*@bxplaywright"
```

!!! note
    `box.json` es distinto de [`modules/`](modules.md), que contiene módulos ColdBox que forman parte del código fuente de tu propio proyecto.
