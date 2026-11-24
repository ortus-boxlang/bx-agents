---
title: BxAgents
order: 1
icon: phosphor-duotone:robot
summary: Construye agentes de IA por convención - un framework basado en convenciones para agentes de IA con BoxLang AI.
description: Construye agentes de IA por convención - un framework basado en convenciones para agentes de IA con BoxLang AI.
tags: [overview]
toc: false
ogImage: assets/og-home.png
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
ensambla con ello una aplicación ColdBox real y ejecutable: una web app de doce páginas, una API con documento
OpenAPI, doce tipos de gateway, rutinas, una vault, copias de seguridad y tests que no necesitan clave de API.

![Una sesión de terminal: bxAgents new crea el andamiaje de un proyecto, bxAgents build ensambla una aplicación ColdBox, bxAgents inspect imprime el agente, el modelo y el entorno, y bxAgents serve lo arranca en http://127.0.0.1:8080](assets/cli-quickstart.svg)

## Mira la web app

<video controls preload="metadata" poster="/assets/video/web-trailer-poster.png" style="max-width:100%">
  <source src="/assets/video/web-trailer.mp4" type="video/mp4">
  <source src="/assets/video/web-trailer.webm" type="video/webm">
  <track kind="captions" src="/assets/video/web-trailer.vtt" srclang="en" label="English" default>
</video>

*Poco más de tres minutos por toda la web app, con narración (en inglés): el menú de la izquierda y cada página. Las respuestas vienen de un modelo de demostración con guion. Los subtítulos están activados.*

## Todo lo que te da el build

| | |
|---|---|
| **Build** | [Las carpetas son la API](conventions/agent-yaml.md). Un [asistente](guides/new-wizard.md) y ocho plantillas. [Sub-agentes](conventions/subagents.md) con los que también puedes hablar directamente. [Skills](conventions/skills.md) del registro, o guardadas por el propio agente con tu aprobación. Tests sin tokens. |
| **Run** | Una [web app](conventions/web-ui.md) con menú a la izquierda y doce páginas. Un [chat de terminal](guides/terminal-ui.md) con 33 comandos de barra. [Rutinas](conventions/routines.md) que las personas crean pidiéndolas. [Schedules](conventions/schedules.md), aprobaciones, un `.bxa` empaquetado y seis destinos de despliegue. |
| **Remember** | Memoria en la base de datos del chat para cada agente, por persona, igual en la terminal, la web app y la API. Notas por persona y notas compartidas sobre el trabajo del agente. Un [directorio de datos](conventions/data.md) con volúmenes, y copias de seguridad con restauración. |
| **Connect** | [Doce tipos de gateway](conventions/gateways/index.md), y rutinas que entregan en ellos. Una [API](guides/agent-api.md) con 76 rutas, OpenAPI y un cliente de BoxLang. [MCP](conventions/mcp.md) en ambos sentidos, con [inicio de sesión por persona](conventions/connect.md). Una [vault](conventions/vault.md) con registro de actividad. |
| **Operate** | Roles de admin y miembro, tokens y personas, `allowedIPs` y límite de frecuencia. Cinco [logs](conventions/logs.md). El árbol del agente, sus archivos y el uso de tokens. Estado de cada gateway con botón de reconexión. `bxAgents doctor`. |
| **Extend** | Las [extensiones](conventions/extensions.md) añaden comandos, teclas, elementos de estado, listeners, schedulers, slots de página, verbos de CLI, tools, skills y tipos de gateway. [Interceptors](conventions/interceptors.md), módulos y un `Agent.bx` basado en clase. |

::: cards
::: card title="Ensamblado en tiempo de build" icon="phosphor-duotone:gear-six" href="build-pipeline.md"
El descubrimiento, la validación y la generación de código se ejecutan **una sola vez**, no
en cada arranque. Lo que ejecutas después es una aplicación ColdBox normal.
:::
::: card title="Las carpetas son la API" icon="phosphor-duotone:tree-structure" href="conventions/agent-yaml.md"
`Agent.yml` e `instructions.md` son los únicos archivos obligatorios. Cualquier otra carpeta
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
::: card title="Una web app, generada" icon="phosphor-duotone:globe-hemisphere-west" href="conventions/web-ui.md"
Pídela en una entrada de `gateways/` y el build produce una app tematizable con menú a la izquierda y
doce páginas: chat, conversaciones, rutinas, registro, memoria, vault, ajustes y, para admins, agente,
gateways, logs, acceso y datos.
:::
::: card title="Un chat de terminal a pantalla completa" icon="phosphor-duotone:terminal-window" href="guides/terminal-ui.md"
`bxAgents chat` conserva tu scrollback y tiene sesiones, rutinas, notas, adjuntos de `@archivo` e imágenes,
33 comandos de barra, un medidor de contexto y grabación. Puede arrancar su propio servidor o conectarse a uno desplegado.
:::
:::

## Construye uno en cuatro pasos

::: stepper
::: step "Instalar"
=== "BoxLang"
    ```bash
    install-bx-module bx-agents
    ```

=== "CommandBox"
    ```bash
    box install bx-agents
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
Descubrimiento, validación, manifiesto y generación de código - dentro de `.build/` (el código en `app/`, la raíz web en `public/`).
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

En una terminal, `new` pregunta qué debe hacer el agente y escribe el proyecto a la medida
([el asistente](guides/new-wizard.md)); `add <kind>` añade después una tool, skill, gateway u otra pieza. Una
plantilla es un preajuste sobre el que construyes, no un límite: elige una de las 8 plantillas
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

## Una web app que no tuviste que construir

Pon `exposes: "webui"` en un gateway y el build emite la app completa: un menú a la izquierda con doce páginas,
chat con streaming y un menú Talk to para los sub-agentes, conversaciones filtrables, rutinas con sus informes,
un registro de tools, skills y volúmenes, memoria y notas, una vault, temas claro y oscuro y una disposición móvil.
Los admins tienen además Agent, Gateways, Logs, Access y Data and backups. Está conectada a tu agente a través de la misma
API HTTP que puede llamar tu propio código.

![La web app generada: el menú de la izquierda, una conversación con una llamada a una tool y una respuesta con formato, y el selector de modelo en el encabezado](assets/webui-chat-light.png)

::: columns
::: column
![La misma conversación con el interruptor de tema cambiado a oscuro](assets/webui-chat-dark.png)
:::
::: column
![La misma página en un viewport estrecho, donde el menú pasa a ser un cajón](assets/webui-chat-mobile.png)
:::
:::

Es CSS generado y marcado generado - [tematizable desde una entrada de `gateways/`](conventions/web-ui.md),
sin ningún paso de build de front end por tu parte. La [guía página por página](conventions/web-ui.md#las-páginas) las muestra todas.

## Qué produce realmente `build`

Tu árbol de convenciones, y la aplicación ColdBox normal en la que `build` lo convierte.

::: columns
::: column
```text
your-agent/
├── Agent.yml         # nombre, modelo, descripción
├── instructions.md    # el system prompt
├── tools/             # funciones @AITool
├── skills/            # capacidades SKILL.md
├── subagents/         # árboles de agentes anidados
├── gateways/          # exposición HTTP/MCP/chat
├── schedules/         # un scheduler ColdBox real
├── mcp/               # servidores MCP que alojas
├── interceptors/      # hooks de ciclo de vida
└── modules/           # dependencias de módulos
```
:::
::: column
```text
.build/
├── miniserver.json
├── app/                  el código (no se sirve)
│   ├── bxagents/         Application.bx  Scheduler.bx
│   ├── config/           Coldbox.bx  WireBox.bx  Router.bx
│   ├── schedules/  agent/  tools/  skills/  mcp/
│   └── handlers/  interceptors/
├── public/               la raíz web: la única carpeta servida
│   ├── Application.bx
│   └── index.bxm
├── lib/                  coldbox/  modules/
└── runtime/              boxlang.json  modules/bxagents
```
:::
:::

::: expandable "¿Por qué ensamblar en tiempo de build y no en tiempo de petición?"
La mayoría de los frameworks de agentes cablean tools, skills, rutas y tareas programadas
**en tiempo de petición**, en cada arranque. BxAgents hace lo contrario: `bxAgents build`
ejecuta el descubrimiento, la validación y la generación de código exactamente una vez, y
produce una aplicación ColdBox normal en `.build/`: el código en `app/`, la raíz web en `public/`.

Arrancarla - mediante `bxAgents serve`, un proceso
[`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
real, o un `.bxa` portable desplegado en cualquier sitio donde corra BoxLang - es entonces
simplemente arrancar una aplicación corriente. Sin escaneo de convenciones, sin recorrido
dinámico de archivos, sin trabajo de build diferido al camino de la petición.
:::

::: columns
::: column
!!! tip "Empieza con un solo archivo"
    Solo `Agent.yml` es obligatorio. `instructions.md` es opcional - define `instructions`
    directamente en el YAML, o coloca el archivo y deja que el build lo conecte. Cualquier
    otra carpeta solo afecta a la salida generada si existe **y** tiene contenido - así que
    añades convenciones a medida que realmente las necesitas.
:::
::: column
!!! faq "YAML por defecto, una clase cuando necesitas código"
    `Agent.yml` contiene la configuración del agente - la mayoría de los agentes son unas
    pocas líneas de él. Cuando la definición necesita código (hooks, instrucciones dinámicas,
    tools registradas en código), `Agent.bx` extiende directamente el propio `AiAgent` de
    BX AI - el build instancia tu clase, así que lo que escribes es lo que se ejecuta.
    Consulta [Agent.yml](conventions/agent-yaml.md) y [Agent.bx](conventions/agent-bx.md).
:::
:::

## Alcánzalo desde cualquier sitio

::: cards
::: card title="Gateways" icon="phosphor-duotone:plugs-connected" href="conventions/gateways/index.md"
Nueve gateways de tipo push - Telegram, Slack, Discord, Email, WhatsApp Cloud, Teams, Twilio,
GitHub y Signal - coordinados por una sola sesión con políticas `queue` / `steer` / `interrupt`.
Cada persona y cada hilo tienen su propia conversación, y los comandos de barra también funcionan allí.
:::
::: card title="HTTP y MCP" icon="phosphor-duotone:stack" href="guides/agent-api.md"
Todo agente sirve una API HTTP (76 rutas) con un documento OpenAPI, abierta en tu máquina o tras tokens,
`allowedIPs` y un límite de frecuencia. Aloja servidores MCP locales desde `mcp/` para que
otros clientes puedan llamar a tus tools.
:::
::: card title="Publícalo" icon="phosphor-duotone:package" href="deployment-and-secrets.md"
Empaqueta un `.bxa` portable y despliégalo con `local`, `ssh`, `docker`, `digitalocean`,
`ftp` o `sftp` - los secretos siguen siendo variables de entorno, nunca artefactos de build.
:::
:::

## Comprueba tu instalación en cualquier momento

![Salida de bxAgents doctor: versiones de BoxLang y bx-ai correctas, definición del agente encontrada, la estructura del proyecto valida limpiamente, y termina con 0 problemas y 0 avisos](assets/cli-doctor.svg)

## Dónde ir a continuación

::: cards
::: card title="Instalación" icon="phosphor-duotone:rocket-launch" href="getting-started/installation.md"
Instala BoxLang, BX AI y BxAgents.
:::
::: card title="Inicio rápido" icon="phosphor-duotone:lightning" href="getting-started/quick-start.md"
Crea el andamiaje, construye y chatea con tu primer agente.
:::
::: card title="Convenciones" icon="phosphor-duotone:cube" href="conventions/agent-yaml.md"
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

