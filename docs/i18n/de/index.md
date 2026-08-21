---
title: BX Agents
order: 1
icon: phosphor-duotone:robot
summary: Einen Agenten in Ordnern und Dateien beschreiben; daraus eine echte ColdBox-Anwendung bauen.
description: Einen Agenten in Ordnern und Dateien beschreiben; daraus eine echte ColdBox-Anwendung bauen.
tags: [overview]
toc: false
---

<div class="bxdocs-hero">
	<img class="bxdocs-hero__banner" src="assets/home-banner.jpg" alt="BX Agents - Build. Constrain. Orchestrate. A conventions-based agent framework for BoxLang. Conventions first: convention over configuration for faster development. Pluggable and extensible: swap models, tools, memory and more with ease. Powerful agents: create agents that reason, act, and collaborate effectively. Production ready: built for performance, reliability, and real-world applications. The agent framework native to BoxLang.">
	<div class="bxdocs-hero__actions">
		<a class="bxdocs-hero__btn bxdocs-hero__btn--primary" href="getting-started/installation.md">Loslegen</a>
		<a class="bxdocs-hero__btn bxdocs-hero__btn--secondary" href="https://github.com/ortus-boxlang/bx-agents">Auf GitHub ansehen</a>
	</div>
</div>

**BX Agents** ist ein konventionsbasiertes KI-Agenten-Framework für [BoxLang](https://boxlang.io),
aufgebaut auf [ColdBox](https://coldbox.ortusbooks.com) und
[BX AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai). Ein Agent wird
mit Dateien und Ordnern beschrieben - nicht über die API-Oberfläche eines Frameworks - und `bxAgents build` setzt daraus
eine echte, lauffähige ColdBox-Anwendung zusammen.

::: cards
::: card title="Zur Build-Zeit zusammengesetzt" icon="phosphor-duotone:gear-six" href="build-pipeline.md"
Discovery, Validierung und Codegenerierung laufen **einmal**, nicht bei jedem Start. Was danach läuft,
ist eine ganz normale ColdBox-App.
:::
::: card title="Ordner sind die API" icon="phosphor-duotone:tree-structure" href="conventions/agent-bx.md"
`Agent.bx` und `instructions.md` sind die einzigen erforderlichen Dateien. Jeder andere Konventionsordner
ist optional und beeinflusst die Ausgabe nur, wenn er existiert.
:::
::: card title="Tools und Skills" icon="phosphor-duotone:wrench" href="conventions/tools.md"
Eine mit `@AITool` annotierte Funktion in `tools/` ablegen, oder einen `SKILL.md`-Ordner in `skills/` -
beides wird automatisch erkannt und eingebunden.
:::
::: card title="Agenten, so weit das Auge reicht" icon="phosphor-duotone:users-three" href="conventions/subagents.md"
`subagents/` verschachtelt genau denselben Konventionsbaum, sodass ein Team von Spezialisten nur aus weiteren
Ordnern besteht - von den Blättern aus gebaut.
:::
::: card title="Zwölf Gateway-Typen" icon="phosphor-duotone:chats-circle" href="conventions/gateways.md"
Telegram, Slack, Discord, E-Mail, WhatsApp, Teams, Twilio, GitHub und Signal, plus `http`,
`cli` und `mock`.
:::
::: card title="Eine generierte Web-Chat-Oberfläche" icon="phosphor-duotone:globe-hemisphere-west" href="conventions/web-ui.md"
In `Agent.bx` anfordern, und der Build erzeugt ein themenfähiges, streamendes Chat-Frontend mit
Sitzungsverlauf.
:::
:::

## In vier Schritten einen Agenten bauen

::: stepper
::: step "Installieren"
=== "BoxLang"
    ```bash
    install-bx-module bx-ai bx-agents
    ```

=== "CommandBox"
    ```bash
    box install bx-ai,bx-agents
    ```
:::
::: step "Gerüst erstellen"
```bash
bxAgents new my-agent --model=openai/gpt-5
```
Anschließend `instructions.md` bearbeiten und die benötigten Konventionsordner ergänzen.
:::
::: step "Bauen"
```bash
bxAgents build
```
Discovery, Validierung, Manifest, Codegenerierung - nach `.build/app/`.
:::
::: step "Damit sprechen"
```bash
bxAgents chat
# oder über HTTP bereitstellen:
bxAgents serve --port=8080
```
:::
:::

## Was `build` tatsächlich erzeugt

Der eigene Konventionsbaum, und die einfache ColdBox-Anwendung, in die `build` ihn verwandelt.

::: columns
::: column
```
your-agent/
├── Agent.bx           # name, model, description
├── instructions.md    # the system prompt
├── tools/             # @AITool functions
├── skills/            # SKILL.md capabilities
├── subagents/         # nested agent trees
├── models/            # named model configs
├── gateways/          # HTTP/MCP/chat exposure
├── schedules/         # a real ColdBox scheduler
├── mcp/               # MCP servers you host
├── interceptors/      # lifecycle hooks
└── modules/           # module dependencies
```
:::
::: column
```
.build/app/
├── Application.bx
├── config/
│   ├── ColdBox.bx
│   ├── WireBox.bx
│   ├── Router.bx
│   └── Scheduler.bx
├── agent/
│   └── GeneratedAgentFactory.bx
├── tools/  skills/  mcp/
├── handlers/  interceptors/
└── index.bxm
```
:::
:::

::: expandable "Warum zur Build-Zeit zusammensetzen statt zur Request-Zeit?"
Die meisten Agenten-Frameworks verdrahten Tools, Skills, Routen und Zeitpläne **zur Request-Zeit**
miteinander, bei jedem Start. BX Agents macht das Gegenteil: `bxAgents build` führt Discovery, Validierung und
Codegenerierung genau einmal aus und erzeugt dabei eine einfache ColdBox-Anwendung unter `.build/app/`.

Diese zu starten - über `bxAgents serve`, einen echten
[`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)-
Prozess, oder eine portable `.bxa`, überall dort eingesetzt, wo BoxLang läuft - ist danach nur noch das Starten
einer gewöhnlichen App. Kein Scannen von Konventionen, kein dynamisches Durchsuchen von Dateien, keine
Build-Zeit-Arbeit, die in den Request-Pfad verschoben wird.
:::

::: columns
::: column
!!! tip "Mit einer Datei anfangen"
    Nur `Agent.bx` ist erforderlich. `instructions.md` ist optional - Instruktionen direkt
    in der Klasse setzen, oder die Datei ablegen und sie vom Build einbinden lassen. Jeder andere Ordner
    beeinflusst die generierte Ausgabe nur, wenn er existiert **und** Inhalt hat - Konventionen werden
    also genau dann hinzugefügt, wenn sie tatsächlich gebraucht werden.
:::
::: column
!!! faq "Agent.bx IST der Agent"
    `Agent.bx` erweitert direkt bx-ais eigenes `AiAgent` - der Build instanziiert die eigene Klasse,
    statt eine aus einer Konfigurationsstruktur neu aufzubauen, sodass das, was geschrieben wird, auch läuft, und eine
    IDE sie wie jede andere Klasse introspizieren kann. Siehe [Agent.bx](conventions/agent-bx.md).
:::
:::

## Von überall erreichbar

::: cards
::: card title="Chat-Plattformen" icon="phosphor-duotone:plugs-connected" href="conventions/gateways.md"
Neun Push-Style-Gateways - Telegram, Slack, Discord, E-Mail, WhatsApp Cloud, Teams, Twilio,
GitHub und Signal - koordiniert von einer Session mit `queue`-/`steer`-/`interrupt`-Richtlinien.
:::
::: card title="HTTP und MCP" icon="phosphor-duotone:stack" href="conventions/mcp.md"
Den Agenten über HTTP-Routen bereitstellen, oder lokale MCP-Server aus `mcp/` hosten, damit andere
Clients die eigenen Tools aufrufen können.
:::
::: card title="Ausliefern" icon="phosphor-duotone:package" href="deployment-and-secrets.md"
Eine portable `.bxa` paketieren und mit `local`, `ssh`, `docker`, `digitalocean`,
`ftp` oder `sftp` ausliefern - Secrets bleiben Umgebungsvariablen, nie Build-Artefakte.
:::
:::

## Wie es weitergeht

::: cards
::: card title="Installation" icon="phosphor-duotone:rocket-launch" href="getting-started/installation.md"
BoxLang, BX AI und BX Agents installieren.
:::
::: card title="Schnelleinstieg" icon="phosphor-duotone:lightning" href="getting-started/quick-start.md"
Den ersten Agenten anlegen, bauen und mit ihm chatten.
:::
::: card title="Konventionen" icon="phosphor-duotone:cube" href="conventions/agent-bx.md"
Eine Seite pro Konventionsordner, von Anfang bis Ende.
:::
::: card title="Die Build-Pipeline" icon="phosphor-duotone:graph" href="build-pipeline.md"
Genau das, was `build` tut, in der richtigen Reihenfolge.
:::
::: card title="CLI-Referenz" icon="phosphor-duotone:terminal-window" href="cli-reference.md"
Jedes Verb und seine Flags.
:::
::: card title="Deployment & Secrets" icon="phosphor-duotone:cloud-arrow-up" href="deployment-and-secrets.md"
Eine `.bxa` paketieren und sicher ausliefern.
:::
:::

Jeder Konventionsordner hat außerdem ein funktionierendes, baubares Beispielprojekt unter
[`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples).

!!! warning
    BX Agents befindet sich in aktiver Entwicklung. [Bekannte Einschränkungen](known-limitations.md) hält
    die ehrlichen Lücken fest - was gegen eine echte laufende App getestet ist, was noch nur gegen
    BX AIs `"mock"`-Provider läuft, und eine echte Eigenheit im vorgelagerten ColdBox, auf die dieses Projekt gestoßen ist und
    die es umschifft hat.
