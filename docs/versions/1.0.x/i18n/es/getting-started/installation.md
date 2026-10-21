---
title: Instalación
icon: phosphor-duotone:package
summary: Lo que BxAgents necesita en la máquina que lo ejecuta - un runtime de BoxLang y el propio módulo.
description: Lo que BxAgents necesita en la máquina que lo ejecuta - un runtime de BoxLang y el propio módulo.
tags: [getting-started, setup]
---

# Instalación

BxAgents es un módulo de BoxLang. Necesita dos cosas en la máquina que lo ejecuta:

1. Un runtime de [BoxLang](https://www.boxlang.io).
2. BxAgents mismo. Incluye todo lo demás que necesita: `bx-ai`, `bx-sqlite`, `bx-ftp`, `bx-mail` y `bx-yaml` como módulos de BoxLang anidados, además de ColdBox, `qb`, `cbsecurity`, `cbauth` y `cbmailservices` para las apps que genera. No hay nada más que instalar.

!!! info
    BxAgents necesita BoxLang **1.18.0 o posterior**, que admite los módulos anidados que incluye.

!!! info
    `serve`, `chat --server` e `invoke --server` necesitan además el binario independiente [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) en `PATH`. Los demás verbos (`build`, `chat` e `invoke` sin `--server`, `package`, `inspect`, `clean`, `new`, ...) no lo necesitan.

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

`--help` lista los 13 verbos (`new`, `add`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`, `inspect`, `clean`, `hash-password`, `doctor`) con un resumen de una línea de cada uno.
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

## Qué viene incluido

El zip del módulo lleva sus propias dependencias, fijadas a las versiones estables con las que se construyó. Una corrección en una de ellas sale como una versión de parche de BxAgents, así que nadie las instala ni las actualiza a mano.

| Dónde | Qué | Para qué |
|---|---|---|
| `modules/` (módulos de BoxLang anidados) | `bx-ai` 3.6.0, `bx-sqlite` 1.3.0, `bx-ftp` 1.9.0, `bx-mail` 1.4.15, `bx-yaml` 1.1.0 | El runtime del agente, el almacén SQLite de la interfaz web, los destinos de deploy `ftp`/`sftp`, el gateway de email, `Agent.yaml` |
| `lib/` (runtime de ColdBox) | ColdBox, `qb`, `cbsecurity`, `cbauth`, `cbmailservices` | Se copian en cada app que genera `build` |

`serve` apunta la app servida a esos mismos módulos incluidos. Las versiones de arriba son las fijadas en el `gradle.properties` del repositorio para esta versión.

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

## Autocompletado con Tab

El módulo incluye autocompletado con Tab para `bxAgents` (y `bxagents`) en tres shells. Completa verbos, flags, los valores de `--template` y `--target`, y carpetas de proyecto.

| Shell | Configuración |
|---|---|
| bash, zsh | Automática. `install-bx-module` copia `completions/bxAgents.bash` a `~/.boxlang/completions/` y BVM lo carga en las sesiones nuevas. Sin el instalador: `source <carpeta del módulo>/completions/bxAgents.bash`. |
| fish | `cp <carpeta del módulo>/completions/bxAgents.fish ~/.config/fish/completions/` |
| PowerShell | Añade `. "<carpeta del módulo>\completions\bxAgents.ps1"` a tu `$PROFILE`. |

Los scripts de `completions/` se generan a partir de las propias tablas de verbos de la CLI, así que no pueden desincronizarse de los verbos. Tras cambiar un verbo o un flag en `ModuleConfig.bx`, regéneralos con `tools/generate-completions.bxs` (añade `--check` para solo verificar); la suite de specs falla si están desactualizados.

Ver [Inicio rápido](quick-start.md) para generar el andamiaje de tu primer agente.
