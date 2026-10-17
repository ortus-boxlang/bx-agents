---
title: Instalación
icon: phosphor-duotone:package
summary: Las tres cosas que BxAgents necesita en la máquina que lo ejecuta.
description: Las tres cosas que BxAgents necesita en la máquina que lo ejecuta.
tags: [getting-started, setup]
---

# Instalación

BxAgents es un módulo de BoxLang. Necesita dos cosas en la máquina que lo ejecuta:

1. Un runtime de [BoxLang](https://www.boxlang.io).
2. BxAgents mismo. Incluye todo lo demás que necesita: `bx-ai`, `bx-sqlite`, `bx-ftp` y `bx-mail` como módulos de BoxLang anidados, además de ColdBox, `qb`, `cbsecurity`, `cbauth` y `cbmailservices` para las apps que genera. No hay nada más que instalar.

!!! info
    BxAgents necesita BoxLang **1.18.0 o posterior**, que admite los módulos anidados que incluye.

!!! info
    `serve` adicionalmente necesita el binario independiente [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) en `PATH`. `build`, `chat`, `package`, `inspect`, `clean`, y `new` no lo necesitan.

::: stepper
::: step "Instalar BoxLang"
Sigue la [guía de instalación oficial de BoxLang](https://boxlang.ortusbooks.com/getting-started/installation). El instalador rápido también configura `~/.boxlang/bin` en tu `PATH`, que es donde aterrizan los ejecutables provistos por módulos (como el propio comando `bxAgents` de BxAgents, abajo).
:::
::: step "Instalar BxAgents"
```bash
install-bx-module bx-agents
```

Esto obtiene el módulo, con sus dependencias incluidas, en tu directorio de módulos de BoxLang (`~/.boxlang/modules` por defecto, o `boxlang_modules/` con `--local`).
:::
::: step "Verificar que funcionó"
```bash
bxAgents --version
bxAgents --help
```

`--help` lista los 12 verbos (`new`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`, `inspect`, `clean`, `hash-password`, `doctor`) con un resumen de una línea de cada uno.
:::
:::

## Qué viene incluido

El zip del módulo lleva sus propias dependencias, fijadas a las versiones estables con las que se construyó. Una corrección en una de ellas sale como una versión de parche de BxAgents, así que nadie las instala ni las actualiza a mano.

| Dónde | Qué | Para qué |
|---|---|---|
| `modules/` (módulos de BoxLang anidados) | `bx-ai`, `bx-sqlite`, `bx-ftp`, `bx-mail` | El runtime del agente, el almacén SQLite de la interfaz web, los destinos de deploy `ftp`/`sftp`, el gateway de email |
| `lib/` (runtime de ColdBox) | ColdBox, `qb`, `cbsecurity`, `cbauth`, `cbmailservices` | Se copian en cada app que genera `build` |

`serve` apunta la app servida a esos mismos módulos incluidos.

### Añadir tus propias librerías

Pon librerías extra de ColdBox en una carpeta `lib/` de tu proyecto, con la misma estructura que la incluida:

```text
my-agent/
  lib/
    coldbox/          # reemplaza el ColdBox incluido
    modules/
      cbvalidation/   # se añade junto a los módulos incluidos
      qb/             # reemplaza el qb incluido
```

`build` copia primero el conjunto incluido y después tu `lib/`, así que la tuya gana.

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
