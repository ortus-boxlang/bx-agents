---
title: Installation
icon: phosphor-duotone:package
summary: Die drei Dinge, die BX Agents auf der ausführenden Maschine benötigt.
description: Die drei Dinge, die BX Agents auf der ausführenden Maschine benötigt.
tags: [getting-started, setup]
---

# Installation

BX Agents ist ein BoxLang-Modul. Es braucht drei Dinge auf der Maschine, die es ausführt:

1. Eine [BoxLang](https://boxlang.io)-Runtime.
2. Das BoxLang-Modul `bx-ai` (BX Agents generiert Code, der es aufruft - es vendort es nicht).
3. BX Agents selbst.

!!! info
    `serve` braucht zusätzlich die eigenständige Binärdatei [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) im `PATH`. `build`, `chat`, `package`, `inspect`, `clean` und `new` brauchen sie nicht.

!!! info
    Die Ziele `ftp`/`sftp` von `deploy` benötigen das BoxLang-Modul [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp), installiert neben `bx-ai`/BX Agents (`install-bx-module bx-ftp`) - eine echte Laufzeitabhängigkeit, nicht vendort, dieselbe Beziehung, die dieses Modul zu `bx-ai` hat. Kein anderes Verb oder Deploy-Ziel braucht es.

::: stepper
::: step "BoxLang installieren"
Der [offiziellen BoxLang-Installationsanleitung](https://boxlang.ortusbooks.com/getting-started/installation) folgen. Der Schnellinstaller richtet auch `~/.boxlang/bin` im `PATH` ein, wo modulseitig bereitgestellte Executables (wie BX Agents' eigener `bxAgents`-Befehl, unten) landen.
:::
::: step "bx-ai und BX Agents installieren"
```bash
install-bx-module bx-ai
install-bx-module bx-agents
```

Das holt beide Module in das eigene BoxLang-Modulverzeichnis (standardmäßig `~/.boxlang/modules`, oder `boxlang_modules/` mit `--local`).
:::
::: step "Prüfen, ob es funktioniert hat"
```bash
bxAgents --version
bxAgents --help
```

`--help` listet alle 10 Verben (`new`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`, `inspect`, `clean`) mit einer Einzeiler-Zusammenfassung jedes einzelnen.
:::
:::

## Der `bxAgents`-Befehl

BX Agents deklariert ein natives Executable in seiner `box.json`:

```json
"boxlang": { "moduleName": "bxagents", "executable": "bxAgents" }
```

Der Installer macht daraus ein `bxAgents`-Wrapper-Skript im `PATH`, sodass Folgendes ausgeführt werden kann:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

statt der längeren Form:

```bash
boxlang module:bxagents new my-agent --model=openai/gpt-5
```

Beide sind gleichwertig - jedes Verb dispatcht so oder so über denselben Einstiegspunkt `ModuleConfig.bx main(args)`. Diese Dokumentation verwendet durchgehend die kurze Form `bxAgents <verb>`.

Siehe [Schnelleinstieg](quick-start.md), um den ersten Agenten anzulegen.
