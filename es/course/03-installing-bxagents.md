---
title: "Lección 3: Instalar BxAgents"
icon: phosphor-duotone:package
summary: Instala BoxLang, bx-ai y BxAgents, y comprueba que el comando bxAgents funciona.
description: Instala BoxLang, bx-ai y BxAgents, y comprueba que el comando bxAgents funciona.
tags: [course, getting-started]
---

# Instalar BxAgents

BxAgents es un módulo de BoxLang. Necesita tres cosas en la máquina que lo ejecuta:

1. Un runtime de [BoxLang](https://www.boxlang.io).
2. El módulo de BoxLang `bx-ai` (BxAgents genera código que lo llama - no lo incluye
   dentro de sí mismo).
3. BxAgents.

::: stepper
::: step "Instalar BoxLang"
Sigue la [guía oficial de instalación de BoxLang](https://boxlang.ortusbooks.com/getting-started/installation).
El instalador rápido también configura `~/.boxlang/bin` en tu `PATH`, que es donde acaban
los ejecutables que aportan los módulos (como el propio comando `bxAgents` de BxAgents).
:::
::: step "Instalar bx-ai y BxAgents"
```bash
install-bx-module bx-ai
install-bx-module bx-agents
```

Esto descarga ambos módulos en tu directorio de módulos de BoxLang (`~/.boxlang/modules`
por defecto, o `boxlang_modules/` con `--local`).
:::
::: step "Comprobar que funcionó"
```bash
bxAgents --version
bxAgents --help
```

`--help` lista los 12 verbos (`new`, `build`, `test`, `serve`, `chat`, `invoke`,
`package`, `deploy`, `inspect`, `clean`, `hash-password`, `doctor`) con un resumen de una
línea de cada uno. Usarás la mayoría en este curso.
:::
:::

## El comando `bxAgents`

BxAgents declara un ejecutable nativo en su `box.json`:

```json
"boxlang": { "moduleName": "bxagents", "executable": "bxAgents" }
```

El instalador convierte eso en un script envoltorio `bxAgents` en tu `PATH`. `bxAgents new
my-agent --model=openai/gpt-5` es la forma abreviada de la forma larga, siempre equivalente:

```bash
boxlang module:bxagents new my-agent --model=openai/gpt-5
```

Este curso usa la forma corta `bxAgents <verbo>` en todo momento.

## Opcional, para lecciones posteriores

- **`serve`** ([Lección 8](08-talking-to-your-agent.md)) necesita además el binario
  independiente [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
  en el `PATH`.
- Los destinos `ftp`/`sftp` de **`deploy`** ([Lección 20](20-packaging-deploying-and-wrapping-up.md))
  necesitan el módulo [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp)
  (`install-bx-module bx-ftp`) - una dependencia de runtime genuina, no incluida dentro
  del módulo, igual que `bx-ai`.

Ninguno de los dos hace falta para seguir con `build`, `chat`, `test`, `package`,
`inspect`, `clean` o `new`.

Consulta [Instalación](../getting-started/installation.md) para la página de referencia completa.

Siguiente: [Lección 4 - Crear el andamiaje de tu primer agente](04-scaffolding-your-first-agent.md)
