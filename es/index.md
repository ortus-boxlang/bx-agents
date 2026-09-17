---
title: BxAgents
order: 1
icon: phosphor-duotone:robot
summary: Construye agentes de IA por convención — un framework basado en convenciones para agentes de IA con BoxLang AI.
description: Construye agentes de IA por convención — un framework basado en convenciones para agentes de IA con BoxLang AI.
tags: [overview]
toc: false
ogImage: assets/og-home.jpg
---

<div class="bxsites-hero">
	<img class="bxsites-hero__banner" src="assets/home-banner.jpg" alt="BxAgents - Build. Constrain. Orchestrate. A conventions-based agent framework for BoxLang. Conventions first: convention over configuration for faster development. Pluggable and extensible: swap models, tools, memory and more with ease. Powerful agents: create agents that reason, act, and collaborate effectively. Production ready: built for performance, reliability, and real-world applications. The agent framework native to BoxLang.">
	<div class="bxsites-hero__actions">
		<a class="bxsites-hero__btn bxsites-hero__btn--primary" href="getting-started/installation.md">Comenzar</a>
		<a class="bxsites-hero__btn bxsites-hero__btn--secondary" href="https://github.com/ortus-boxlang/bx-agents">Ver en GitHub</a>
	</div>
</div>

**BxAgents** es un framework de agentes de IA basado en convenciones para [BoxLang](https://www.boxlang.io),
construido sobre [ColdBox](https://www.coldbox.org) y
[BX AI](https://ai.boxlang.io). Describes un agente
con archivos y carpetas - no con la superficie de API de un framework - y `bxAgents build`
ensambla con ello una aplicación ColdBox real y ejecutable.

![Una sesión de terminal: bxAgents new crea el andamiaje de un proyecto, bxAgents build ensambla una aplicación ColdBox, bxAgents inspect imprime el agente, el modelo y el entorno, y bxAgents serve lo arranca en http://127.0.0.1:8080](assets/cli-quickstart.svg)

::: cards
::: card title="Ensamblado en tiempo de build" icon="phosphor-duotone:gear-six" href="build-pipeline.md"
El descubrimiento, la validación y la generación de código se ejecutan **una sola vez**, no
en cada arranque. Lo que ejecutas después es una aplicación ColdBox normal.
:::
::: card title="Las carpetas son la API" icon="phosphor-duotone:tree-structure" href="conventions/agent-bx.md"
`Agent.bx` e `instructions.md` son los únicos archivos obligatorios. Cualquier otra carpeta
de convención es opcional y solo da forma a la salida si existe.
:::
::: card title="Tools y skills" icon="phosphor-duotone:wrench" href="conventions/tools.md"
Coloca una función anotada con `@AITool` en `tools/`, o una carpeta con `SKILL.md` en
`skills/` - ambas se descubren y se cablean por ti.
:::
::: card title="Agentes hasta el fondo" icon="phosphor-duotone:users-three" href="conventions/subagents.md"
`subagents/` anida exactamente el mismo árbol de convenciones, así que un equipo de
especialistas son simplemente más carpetas - construidas de la hoja hacia la raíz.
:::
::: card title="Doce tipos de gateway" icon="phosphor-duotone:chats-circle" href="conventions/gateways/index.md"
Telegram, Slack, Discord, Email, WhatsApp, Teams, Twilio, GitHub y Signal, además de `http`,
`cli` y `mock`.
:::
::: card title="Una UI web de chat, generada" icon="phosphor-duotone:globe-hemisphere-west" href="conventions/web-ui.md"
Pídela en `Agent.bx` y el build produce un front end de chat con streaming, tematizable y
con historial de sesión.
:::
:::

## Construye uno en cuatro pasos

::: stepper
::: step "Instalar"
=== "BoxLang"
    ```bash
    install-bx-module bx-ai bx-agents
    ```

=== "CommandBox"
    ```bash
    box install bx-ai,bx-agents
    ```
:::
::: step "Crear el andamiaje"
```bash
bxAgents new my-agent --model=openai/gpt-5
```
Después edita `instructions.md` y añade las carpetas de convención que necesites.
:::
::: step "Construir"
```bash
bxAgents build
```
Descubrimiento, validación, manifiesto y generación de código - dentro de `.build/app/`.
:::
::: step "Hablar con él"
```bash
bxAgents chat
# o sírvelo sobre HTTP:
bxAgents serve --port=8080
```
:::
:::

## Empieza desde algo, no desde cero

`new` no solo crea el andamiaje de un agente vacío - elige una de las 8 plantillas
integradas, clona un repositorio de GitHub existente, o instala un paquete de ForgeBox.

::: cards
::: card title="8 plantillas integradas" icon="phosphor-duotone:squares-four" href="agent-templates.md"
`--template=webui-chat|slack-bot|telegram-bot|github-bot|mcp-server|scheduled|multi-agent` -
contenido real y funcional sobre el mismo esqueleto base.
:::
::: card title="Clonar un repositorio de GitHub" icon="phosphor-duotone:github-logo" href="agent-templates.md"
`--repo=owner/repo` - un cliente JGit incluido lo clona; no hace falta el binario `git`.
:::
::: card title="Instalar desde ForgeBox" icon="phosphor-duotone:package" href="agent-templates.md"
`--forgebox=<slug>` - habla directamente con la API REST de ForgeBox; no hace falta la CLI `box`.
:::
:::

Consulta [Plantillas de agentes](agent-templates.md) para ver en detalle cada archivo
generado, y cómo publicar las tuyas.

## Una UI de chat que no tuviste que construir

Pon `exposes: "webui"` en un gateway y el build emite un front end completo - historial de
conversaciones, respuestas en streaming, temas claro/oscuro y una disposición móvil -
conectado a tu agente.

![La UI web de chat generada: una barra lateral de conversaciones a la izquierda, un transcript de varios turnos en el centro, y un encabezado y compositor de mensajes con marca](assets/webui-chat-light.png)

::: columns
::: column
![La misma conversación con el interruptor de tema cambiado a oscuro](assets/webui-chat-dark.png)
:::
::: column
![La misma página en un viewport estrecho, donde el transcript conserva todo el ancho y la barra lateral se superpone](assets/webui-chat-mobile.png)
:::
:::

Es CSS generado y marcado generado - [tematizable desde `Agent.bx`](conventions/web-ui.md),
sin ningún paso de build de front end por tu parte.

## Qué produce realmente `build`

Tu árbol de convenciones, y la aplicación ColdBox normal en la que `build` lo convierte.

::: columns
::: column
```
your-agent/
├── Agent.bx           # nombre, modelo, descripción
├── instructions.md    # el system prompt
├── tools/             # funciones @AITool
├── skills/            # capacidades SKILL.md
├── subagents/         # árboles de agentes anidados
├── models/            # configuraciones de modelo con nombre
├── gateways/          # exposición HTTP/MCP/chat
├── schedules/         # un scheduler ColdBox real
├── mcp/               # servidores MCP que alojas
├── interceptors/      # hooks de ciclo de vida
└── modules/           # dependencias de módulos
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

::: expandable "¿Por qué ensamblar en tiempo de build y no en tiempo de petición?"
La mayoría de los frameworks de agentes cablean tools, skills, rutas y tareas programadas
**en tiempo de petición**, en cada arranque. BxAgents hace lo contrario: `bxAgents build`
ejecuta el descubrimiento, la validación y la generación de código exactamente una vez, y
produce una aplicación ColdBox normal bajo `.build/app/`.

Arrancarla - mediante `bxAgents serve`, un proceso
[`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
real, o un `.bxa` portable desplegado en cualquier sitio donde corra BoxLang - es entonces
simplemente arrancar una aplicación corriente. Sin escaneo de convenciones, sin recorrido
dinámico de archivos, sin trabajo de build diferido al camino de la petición.
:::

::: columns
::: column
!!! tip "Empieza con un solo archivo"
    Solo `Agent.bx` es obligatorio. `instructions.md` es opcional - define las instrucciones
    directamente en la clase, o coloca el archivo y deja que el build lo conecte. Cualquier
    otra carpeta solo afecta a la salida generada si existe **y** tiene contenido - así que
    añades convenciones a medida que realmente las necesitas.
:::
::: column
!!! faq "Agent.bx ES el agente"
    `Agent.bx` extiende directamente el propio `AiAgent` de BX AI - el build instancia tu
    clase en lugar de reconstruir una a partir de un struct de configuración, así que lo que
    escribes es lo que se ejecuta, y un IDE puede introspeccionarla como cualquier otra
    clase. Consulta [Agent.bx](conventions/agent-bx.md).
:::
:::

## Alcánzalo desde cualquier sitio

::: cards
::: card title="Plataformas de chat" icon="phosphor-duotone:plugs-connected" href="conventions/gateways/index.md"
Nueve gateways de tipo push - Telegram, Slack, Discord, Email, WhatsApp Cloud, Teams, Twilio,
GitHub y Signal - coordinados por una sola sesión con políticas `queue` / `steer` / `interrupt`.
:::
::: card title="HTTP y MCP" icon="phosphor-duotone:stack" href="conventions/mcp.md"
Expón el agente mediante rutas HTTP, o aloja servidores MCP locales desde `mcp/` para que
otros clientes puedan llamar a tus tools.
:::
::: card title="Publícalo" icon="phosphor-duotone:package" href="deployment-and-secrets.md"
Empaqueta un `.bxa` portable y despliégalo con `local`, `ssh`, `docker`, `digitalocean`,
`ftp` o `sftp` - los secretos siguen siendo variables de entorno, nunca artefactos de build.
:::
:::

## Comprueba tu instalación en cualquier momento

![Salida de bxAgents doctor: versiones de BoxLang y bx-ai correctas, Agent.bx encontrado, la estructura del proyecto valida limpiamente, y un aviso de que falta el módulo qb](assets/cli-doctor.svg)

## Dónde ir a continuación

::: cards
::: card title="Instalación" icon="phosphor-duotone:rocket-launch" href="getting-started/installation.md"
Instala BoxLang, BX AI y BxAgents.
:::
::: card title="Inicio rápido" icon="phosphor-duotone:lightning" href="getting-started/quick-start.md"
Crea el andamiaje, construye y chatea con tu primer agente.
:::
::: card title="Convenciones" icon="phosphor-duotone:cube" href="conventions/agent-bx.md"
Una página por carpeta de convención, de principio a fin.
:::
::: card title="El pipeline de build" icon="phosphor-duotone:graph" href="build-pipeline.md"
Exactamente qué hace `build`, y en qué orden.
:::
::: card title="Referencia de la CLI" icon="phosphor-duotone:terminal-window" href="cli-reference.md"
Cada verbo y sus flags.
:::
::: card title="Plantillas de agentes" icon="phosphor-duotone:squares-four" href="agent-templates.md"
Cada plantilla integrada, el origen desde GitHub/ForgeBox, y cómo publicar la tuya.
:::
::: card title="Despliegue y secretos" icon="phosphor-duotone:cloud-arrow-up" href="deployment-and-secrets.md"
Empaqueta un `.bxa` y publícalo, de forma segura.
:::
:::

Cada carpeta de convención tiene además un ejemplo funcional y construible bajo
[`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples).

!!! warning
    BxAgents está en desarrollo activo. [Limitaciones conocidas](known-limitations.md) recoge
    las carencias con honestidad - qué está probado contra una aplicación real en ejecución,
    qué sigue ejecutándose solo contra el proveedor `"mock"` de BX AI, y una peculiaridad real
    de ColdBox con la que este proyecto se topó y que tuvo que sortear.
