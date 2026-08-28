---
title: Instalación
icon: phosphor-duotone:package
summary: Las tres cosas que BxAgents necesita en la máquina que lo ejecuta.
description: Las tres cosas que BxAgents necesita en la máquina que lo ejecuta.
tags: [getting-started, setup]
---

# Instalación

BxAgents es un módulo de BoxLang. Necesita tres cosas en la máquina que lo ejecuta:

1. Un runtime de [BoxLang](https://boxlang.io).
2. El módulo de BoxLang `bx-ai` (BxAgents genera código que lo llama - no lo empaqueta él mismo).
3. BxAgents mismo.

!!! info
    `serve` adicionalmente necesita el binario independiente [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) en `PATH`. `build`, `chat`, `package`, `inspect`, `clean`, y `new` no lo necesitan.

!!! info
    Los destinos `ftp`/`sftp` de `deploy` necesitan el módulo de BoxLang [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp) instalado junto a `bx-ai`/BxAgents (`install-bx-module bx-ftp`) - una dependencia de runtime genuina, no empaquetada, la misma relación que este módulo tiene con `bx-ai`. Ningún otro verbo o destino de deploy lo necesita.

::: stepper
::: step "Instalar BoxLang"
Sigue la [guía de instalación oficial de BoxLang](https://boxlang.ortusbooks.com/getting-started/installation). El instalador rápido también configura `~/.boxlang/bin` en tu `PATH`, que es donde aterrizan los ejecutables provistos por módulos (como el propio comando `bxAgents` de BxAgents, abajo).
:::
::: step "Instalar bx-ai y BxAgents"
```bash
install-bx-module bx-ai
install-bx-module bx-agents
```

Esto obtiene ambos módulos en tu directorio de módulos de BoxLang (`~/.boxlang/modules` por defecto, o `boxlang_modules/` con `--local`).
:::
::: step "Verificar que funcionó"
```bash
bxAgents --version
bxAgents --help
```

`--help` lista los 10 verbos (`new`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`, `inspect`, `clean`) con un resumen de una línea de cada uno.
:::
:::

## El comando `bxAgents`

BxAgents declara un ejecutable nativo en su `box.json`:

```json
"boxlang": { "moduleName": "bxagents", "executable": "bxAgents" }
```

El instalador lo convierte en un script envoltorio `bxAgents` en tu `PATH`, así que puedes ejecutar:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

en lugar de la forma más larga:

```bash
boxlang module:bxagents new my-agent --model=openai/gpt-5
```

Ambas son equivalentes - cada verbo despacha a través del mismo punto de entrada `ModuleConfig.bx main(args)` de cualquier manera. Este documento usa la forma corta `bxAgents <verb>` en todo momento.

Ver [Inicio rápido](quick-start.md) para generar el andamiaje de tu primer agente.
