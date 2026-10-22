---
title: "Lección 3: Instalar BxAgents"
icon: phosphor-duotone:package
summary: Instala BoxLang y BxAgents, y comprueba que el comando bxAgents funciona.
description: Instala BoxLang y BxAgents, y comprueba que el comando bxAgents funciona.
tags: [course, getting-started]
---

# Instalar BxAgents

BxAgents es un módulo de BoxLang. Necesita dos cosas en la máquina que lo ejecuta:

1. Un runtime de [BoxLang](https://www.boxlang.io).
2. BxAgents, que incluye todo lo demás que necesita (`bx-ai`, `bx-sqlite`, `bx-ftp`,
   `bx-mail`, `bx-yaml` y ColdBox con sus módulos para las apps que
   genera). Hace falta BoxLang **1.18.0 o posterior**.

::: stepper
::: step "Instalar BoxLang"
Sigue la [guía oficial de instalación de BoxLang](https://boxlang.ortusbooks.com/getting-started/installation).
El instalador rápido también configura `~/.boxlang/bin` en tu `PATH`, que es donde acaban
los ejecutables que aportan los módulos (como el propio comando `bxAgents` de BxAgents).
:::
::: step "Instalar BxAgents"
```bash
install-bx-module bx-agents
```

Esto descarga el módulo, con sus dependencias incluidas, en tu directorio de módulos de BoxLang (`~/.boxlang/modules`
por defecto, o `boxlang_modules/` con `--local`).
:::
::: step "Comprobar que funcionó"
```bash
bxAgents --version
bxAgents --help
```

`--help` lista los 16 verbos (`new`, `add`, `build`, `test`, `serve`, `chat`, `invoke`,
`package`, `deploy`, `inspect`, `clean`, `hash-password`, `token`, `notes`, `doctor`, `skills`) con un resumen de una
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

- **`serve`**, **`chat --server`** e **`invoke --server`** ([Lección 8](08-talking-to-your-agent.md))
  necesitan además el binario independiente [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
  en el `PATH`.

Ninguno hace falta para seguir con `build`, `chat` a secas, `test`, `package`,
`inspect`, `clean` o `new`.

Consulta [Instalación](../getting-started/installation.md) para la página de referencia completa.

Siguiente: [Lección 4 - Crear el andamiaje de tu primer agente](04-scaffolding-your-first-agent.md)
