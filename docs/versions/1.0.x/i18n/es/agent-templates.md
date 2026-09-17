---
title: Plantillas de agentes
icon: phosphor-duotone:squares-four
summary: Cada `--template` integrado, cómo tomar un proyecto desde GitHub o ForgeBox, y cómo publicar el tuyo.
description: Cada `--template` integrado, cómo tomar un proyecto desde GitHub o ForgeBox, y cómo publicar el tuyo.
tags: [reference, cli, templates]
---

# Plantillas de agentes

`bxAgents new` crea un proyecto de una de tres formas mutuamente excluyentes - consulta la [Referencia de la CLI](cli-reference.md#new) para la sintaxis exacta de los flags y las reglas de validación. Esta página entra a fondo en las tres: qué genera exactamente cada `--template` integrado, qué aspecto debe tener un origen `--repo`/`--forgebox` para funcionar como fuente de proyecto, y cómo construir y publicar el tuyo.

```bash
bxAgents new my-agent --model=openai/gpt-5 --template=<nombre>   # una plantilla integrada
bxAgents new my-agent --repo=owner/repo-name                     # clonar un repositorio de GitHub
bxAgents new my-agent --forgebox=some-package-slug               # instalar un paquete de ForgeBox
```

Los tres caminos acaban en lo mismo: un directorio que contiene un `Agent.bx` en su raíz, listo para `bxAgents build`. Lo que cambia es de dónde viene ese `Agent.bx` (y todo lo que lo rodea).

## Las 8 plantillas `--template` integradas

Todas las plantillas parten exactamente del mismo esqueleto base - `Agent.bx`, `instructions.md`, todas las [carpetas de convención](conventions/agent-bx.md) vacías, una carpeta [`tests/`](conventions/testing.md) lista para ejecutar, un `.env` y un `.gitignore` - y encima añaden una cantidad pequeña y concreta de contenido ya cableado. Ninguna necesita cambios en el validador: el contenido extra de cada una reutiliza una forma de configuración que [`ProjectValidator`](conventions/agent-bx.md) ya acepta, así que un proyecto creado con cualquier plantilla valida limpiamente por construcción.

::: cards
::: card title="minimal" icon="phosphor-duotone:seedling" href="#minimal"
El esqueleto pelado. Nada extra.
:::
::: card title="webui-chat" icon="phosphor-duotone:chat-circle-dots" href="#webui-chat"
Una UI de chat en el navegador en /chat.
:::
::: card title="slack-bot" icon="phosphor-duotone:slack-logo" href="#slack-bot"
Un adaptador de canal Slack en Socket Mode.
:::
::: card title="telegram-bot" icon="phosphor-duotone:telegram-logo" href="#telegram-bot"
Un adaptador de canal Telegram por long-poll.
:::
::: card title="github-bot" icon="phosphor-duotone:github-logo" href="#github-bot"
Un adaptador de webhooks de issues/PR de GitHub.
:::
::: card title="mcp-server" icon="phosphor-duotone:plugs-connected" href="#mcp-server"
Una tool de ejemplo expuesta como servidor MCP.
:::
::: card title="scheduled" icon="phosphor-duotone:clock-countdown" href="#scheduled"
Un Scheduler ColdBox real que llama al agente.
:::
::: card title="multi-agent" icon="phosphor-duotone:users-three" href="#multi-agent"
Dos subagentes, cableados mediante configure().
:::
:::

### `minimal`

La opción por defecto cuando se omite `--template` por completo. ES el esqueleto base descrito arriba - sin archivos extra. Úsala cuando partes de un agente en blanco y vas añadiendo convenciones tú mismo a medida que las necesitas.

### `webui-chat`

Añade `gateways/webui.bx`, que expone la [UI web de chat](conventions/web-ui.md) integrada en `/chat`:

```javascript
// gateways/webui.bx
class {

	function configure() {
		return {
			exposes : "webui",
			path    : "/chat"
		};
	}

}
```

Después de `bxAgents build && bxAgents serve`, el agente está accesible en `http://localhost:8080/chat` - una página de chat estática real respaldada por un almacén de conversaciones generado sobre SQLite. De fábrica no se configura ningún `apiKeyEnvVar`/`users`, así que la página está abierta por defecto; consulta [La UI web de chat](conventions/web-ui.md) para protegerla.

### `slack-bot`

Añade `gateways/slack.bx`, un adaptador de canal [Slack](conventions/gateways/slack.md) de tipo push (Socket Mode - un websocket persistente, sin necesidad de un webhook público):

```javascript
// gateways/slack.bx
class {

	function configure() {
		return {
			type           : "slack",
			botTokenEnvVar : "SLACK_BOT_TOKEN",
			appTokenEnvVar : "SLACK_APP_TOKEN"
		};
	}

}
```

También añade al `.env` las líneas de ejemplo correspondientes:

```bash
## Slack gateway (gateways/slack.bx) - see https://api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

Rellena ambos valores reales desde una app de Slack con Socket Mode activado antes de `bxAgents serve` - consulta [Slack](conventions/gateways/slack.md) para los pasos de configuración de la app.

### `telegram-bot`

Añade `gateways/telegram.bx`, un adaptador de canal [Telegram](conventions/gateways/telegram.md) de tipo push (long-poll mediante `getUpdates`):

```javascript
// gateways/telegram.bx
class {

	function configure() {
		return {
			type           : "telegram",
			botTokenEnvVar : "TELEGRAM_BOT_TOKEN"
		};
	}

}
```

También añade al `.env` la línea de ejemplo correspondiente:

```bash
## Telegram gateway (gateways/telegram.bx) - from @BotFather
TELEGRAM_BOT_TOKEN=...
```

Consigue un token de [@BotFather](https://core.telegram.org/bots#botfather) y colócalo antes de servir.

### `github-bot`

Añade `gateways/github.bx`, un adaptador de canal [GitHub](conventions/gateways/github.md) de tipo push (dirigido por webhooks, con hilos de comentarios en issues/PR filtrados por `@mention`):

```javascript
// gateways/github.bx
class {

	function configure() {
		return {
			type                : "github",
			tokenEnvVar         : "GITHUB_TOKEN",
			webhookSecretEnvVar : "GITHUB_WEBHOOK_SECRET",
			botNameEnvVar       : "GITHUB_BOT_NAME"
		};
	}

}
```

También añade al `.env` las líneas de ejemplo correspondientes:

```bash
## GitHub gateway (gateways/github.bx) - a PAT with repo/issues+PR read+write scope
GITHUB_TOKEN=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_BOT_NAME=...
```

`GITHUB_TOKEN` necesita un PAT con permisos de lectura/escritura sobre repo + issues/PR; `GITHUB_WEBHOOK_SECRET` es el secreto de firma que hayas configurado en el webhook del repositorio; `GITHUB_BOT_NAME` es el nombre de la cuenta con la que responde el bot, usado para filtrar por `@mention`. Consulta [GitHub](conventions/gateways/github.md) para la configuración del webhook.

### `mcp-server`

Añade un servidor de tools [MCP](conventions/mcp.md) de ejemplo, más una entrada de gateway que lo expone:

```javascript
// mcp/exampleServer.bx
class {

	function configure() {
		return {
			description : "Example MCP tool server",
			version     : "1.0.0"
		};
	}

}
```

```javascript
// gateways/mcpExpose.bx
class {

	function configure() {
		return {
			exposes : "mcp",
			path    : "/mcp",
			target  : "exampleServer"
		};
	}

}
```

`target` nombra la entrada `mcp/*` que se expone - aquí, el servidor de ejemplo de arriba. Después de `build`/`serve`, cualquier cliente que hable MCP puede conectarse en `/mcp`. Añade funciones reales anotadas con `@AITool` (o cualquier otro miembro exponible por MCP) a `mcp/exampleServer.bx`, o añade directamente más archivos `mcp/*.bx`, según [mcp/](conventions/mcp.md).

### `scheduled`

Añade un scheduler ColdBox real, escrito a mano, que llama al agente de forma periódica:

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "example" )
			.call( () => getInstance( "my-agent" ).run( "Give me a status update" ) )
			.everyDayAt( "00:00" )
	}

}
```

(El argumento de `getInstance(...)` es siempre el propio `name` del agente creado, de modo que resuelve la clave de binding correcta de WireBox.) Esto es contenido real de [`schedules/`](conventions/schedules.md), no un marcador de posición - edita `configure()` directamente para añadir o cambiar tareas usando el propio DSL de scheduler de ColdBox (`everyMinute()`, `everyHourAt()`, `cron(...)`, etc.).

### `multi-agent`

La única plantilla que cambia el propio `Agent.bx` raíz, en lugar de limitarse a añadir archivos a su lado. Declara dos [subagentes](conventions/subagents.md) mediante una sobrescritura de `configure()`:

```javascript
// Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			subAgents : [ "researcher", "writer" ]
		};
	}

}
```

...y crea ambos como carpetas de subagente reales y funcionales:

```
subagents/
├── researcher/
│   ├── Agent.bx
│   └── instructions.md
└── writer/
    ├── Agent.bx
    └── instructions.md
```

El `Agent.bx` de cada subagente es una clase de agente completa y construible (siempre contra el proveedor `mock` - un subagente aquí es una demostración de la forma de la delegación, no un agente funcional de fábrica):

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "researcher",
			description : "Gathers facts on a topic. Does not write final prose - that's the writer's job.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

`researcher` reúne hechos; `writer` convierte los hallazgos en prosa final - un ejemplo mínimo de delegación entre dos roles. Consulta [subagents/](conventions/subagents.md) para ver en qué se diferencia el array `subAgents` de `configure()` (nombres de carpeta a cablear) del argumento `subAgents` de `super.init()` (instancias de `AiAgent` ya construidas), y el [ejemplo de equipo multiagente](guides/example-multi-agent-team.md) para un recorrido más completo.

## Tomar un proyecto desde GitHub (`--repo`)

```bash
bxAgents new my-agent --repo=owner/repo-name
# o una URL completa:
bxAgents new my-agent --repo=https://github.com/owner/repo-name.git
```

En lugar de crear el andamiaje desde una plantilla integrada, `--repo` clona un repositorio existente y lo usa directamente como el nuevo proyecto. El clonado se hace con una dependencia [JGit](https://www.eclipse.org/jgit/) incluida (`org.eclipse.jgit:org.eclipse.jgit`, desde Maven Central) - **no hace falta instalar ningún binario `git` ni tenerlo en el `PATH`**; el cliente git viaja dentro del propio jar del módulo.

**Qué hace que un repositorio sea una plantilla válida:** un `Agent.bx` en la raíz del repositorio, igual que en cualquier proyecto creado con el andamiaje. Más allá de eso, no hay ningún manifiesto ni archivo marcador especial que añadir - cualquier proyecto BxAgents (tuyo, de un compañero, un ejemplo de `examples/`) ya es un origen `--repo` válido tal cual.

**Qué ocurre al clonar, en orden:**

1. La forma abreviada `owner/repo-name` se resuelve a `https://github.com/owner/repo-name.git`; un valor que ya contenga `://` o empiece por `git@` se usa tal cual (así que también funciona una URL HTTPS de un GitLab/Bitbucket/etc. autoalojado, no solo GitHub).
2. Se niega a ejecutarse si el directorio de destino ya existe y **no está vacío** - nunca se clona por encima de archivos existentes.
3. Clona en modo **shallow** (`--depth=1` - solo el estado actual, sin historial) mediante el `cloneRepository()` de JGit.
4. **Siempre elimina después la carpeta `.git` resultante, incondicionalmente - no hay ningún flag para conservarla.** Es deliberado: el historial git y el remoto `origin` de un repositorio-plantilla no tienen ninguna razón legítima para sobrevivir dentro de un proyecto nuevo, y dejarlos ahí es una trampa real (el primer `git init`/commit/push de tu proyecto podría interactuar con el repositorio upstream de la *plantilla* en vez de con el tuyo). Si de verdad quieres el historial git del repositorio origen, clónalo a mano con `git clone` en lugar de usar `bxAgents new --repo`.
5. Verifica que existe `Agent.bx` en la raíz clonada - si no, toda la operación falla con un error claro que nombra lo que falta, en lugar de dejar atrás un directorio a medias que no es un proyecto BxAgents.

!!! warning
    El clonado es **solo HTTPS anónimo** - hoy no se pasan credenciales a JGit, así que un repositorio privado fallará al clonarse. Usa un repositorio público, o clona uno privado a mano: `bxAgents new --repo` todavía no es la herramienta adecuada para ese caso.

`--model`, `--name` y `--description` **no** son obligatorios ni se usan con `--repo` - el proyecto clonado ya define su propio `Agent.bx` (y por tanto su propio nombre/modelo). Pasar `--name`/`--description` de todos modos produce un aviso en la salida en vez de un error, y por lo demás se ignora. El paso automático de `box install` del `tests/` creado (y `--skipInstall`) tampoco aplican aquí - la carpeta `tests/` del proyecto clonado, si la tiene, se deja exactamente como se clonó.

## Tomar un proyecto desde ForgeBox (`--forgebox`)

```bash
bxAgents new my-agent --forgebox=some-package-slug
```

Instala un paquete de [ForgeBox](https://www.forgebox.io) - el registro de paquetes de CommandBox, que puede alojar la plantilla de una aplicación o proyecto completos, no solo una librería - y lo usa como el nuevo proyecto. Esto habla directamente con la propia API REST pública de ForgeBox (`https://www.forgebox.io/api/v1`), usando el soporte nativo `bx:http`/`http()` de BoxLang - **no hace falta la CLI `box`**.

**Qué hace que una entrada de ForgeBox sea una plantilla válida:** un `Agent.bx` en la raíz de su archivo publicado (o anidado exactamente una carpeta más adentro - ver la nota sobre desanidado más abajo). ForgeBox tiene un tipo de entrada `bxagents` dedicado exactamente a esto ("BxAgents" en la interfaz de ForgeBox) - navegarlo es la forma más rápida de encontrar un punto de partida - pero `bxAgents new --forgebox` en sí no filtra ni se fija en el `type` declarado de una entrada al instalar; solo le importa si el archivo descargado, una vez extraído, contiene un `Agent.bx`.

**Qué ocurre al instalar, en orden:**

1. Se niega a ejecutarse si el directorio de destino ya existe y **no está vacío**.
2. `GET /entry/<slug>` busca el paquete. Un slug que no existe falla de forma clara e inmediata - no se intenta ninguna descarga.
3. Resuelve la URL de descarga de la versión actual desde el propio `latestVersion.downloadURL` de la entrada (recurriendo a la entrada más reciente de su array `versions` si por algún motivo falta).
4. Descarga el archivo y lo extrae con la propia BIF `extract()` integrada de BoxLang (soporte zip - sin ningún código de descompresión hecho a medida).
5. **Desanida un nivel automáticamente**, si lo hay: muchos archivos de ForgeBox (siguiendo lo típico de una exportación zip de GitHub) envuelven todo su contenido en una única carpeta de primer nivel. Si la extracción produce exactamente una entrada de primer nivel y es un directorio, su contenido se sube un nivel para que el propio directorio de destino acabe siendo la raíz del proyecto.
6. Verifica que existe `Agent.bx` en la raíz (posiblemente ya desanidada) - si no, toda la operación falla, ya que un slug de ForgeBox podría ser perfectamente una librería sin relación en vez de una plantilla de proyecto.

Igual que con `--repo`: `--model`/`--name`/`--description` no son obligatorios (se avisa y se ignoran si se pasan de todos modos - el proyecto instalado define los suyos), y el paso automático de `box install` de `tests/` y `--skipInstall` no aplican.

## Publicar tu propia plantilla

Una plantilla BxAgents - tanto si la compartes vía GitHub, ForgeBox, o ambos - es simplemente un proyecto BxAgents corriente (un `Agent.bx` en su raíz, más las convenciones que use) con los detalles concretos rellenados para que otra persona los copie y adapte, en vez de dejados como marcadores de posición para ti.

### 1. Construye el proyecto

Parte de cualquiera de las 8 plantillas integradas de arriba (o de cero) y moldéalo hasta convertirlo en aquello de lo que quieres que la gente parta:

```bash
bxAgents new my-template --model=openai/gpt-5 --template=<el punto de partida más cercano>
```

Merece la pena hacer un par de cosas de forma deliberada, ya que otra persona hará `bxAgents new --repo=...`/`--forgebox=...` sobre esto y esperará que funcione sin más:

- **Mantén `Agent.bx` genérico y construible de fábrica.** No fijes una clave de API real ni apuntes por defecto a un modelo solo de pago - la sobrescritura `mock/mock-model` de `test()` (ya incluida en el andamiaje) hace que `bxAgents test` siga funcionando sin ninguna configuración aunque el modelo real de `init()` necesite una clave que solo tienes tú.
- **Incluye un `instructions.md` real** que describa el propósito verdadero del agente, no el marcador genérico "You are a helpful AI agent" que `new` crea por defecto.
- **Documenta las variables de entorno necesarias en `.env`** como líneas de ejemplo comentadas (`SLACK_BOT_TOKEN=xoxb-...`, etc.), exactamente como hacen arriba las plantillas `slack-bot`/`telegram-bot`/`github-bot` - es lo primero que alguien lee después de clonar.
- **Verifícalo en frío**, igual que lo recibiría un desconocido: `rm -rf .build dist`, y después `bxAgents build && bxAgents test` (y `bxAgents doctor` para detectar cualquier cosa relacionada con el entorno o las dependencias) desde un checkout completamente nuevo.
- **Nunca hagas commit de `.build/`, `dist/`, ni de un `.env` real** - el `.gitignore` incluido ya cubre los tres; consérvalo.

### 2a. Publícalo en GitHub

No hace falta nada específico de BxAgents - sube el proyecto a un repositorio público de GitHub con `Agent.bx` en la raíz (o sube un subárbol; `--repo` solo desanida la convención de anidado único propia de ForgeBox, no disposiciones arbitrarias de repositorio, así que mantén `Agent.bx` en la raíz real del repositorio). Cualquiera puede entonces ejecutar:

```bash
bxAgents new my-agent --repo=your-org/your-template-repo
```

Una sección breve de "Getting Started" en el propio `README.md` del repositorio (qué variables de entorno definir, a qué modelo apuntar) ayuda muchísimo, ya que `--repo` no lee ni muestra nada del README - es puramente para la persona que lo clona.

### 2b. Publícalo en ForgeBox

Los paquetes de ForgeBox se describen con un `box.json` en la raíz del proyecto - el mismo archivo que usa el sistema de paquetes de CommandBox en todo lo demás. Como mínimo:

```json
{
	"name": "My BxAgents Template",
	"slug": "my-bxagents-template",
	"version": "1.0.0",
	"type": "bxagents",
	"shortDescription": "A short description of what this agent template does",
	"private": false
}
```

- **`slug`** es el nombre único con el que la gente instala (`--forgebox=my-bxagents-template`) - es también lo que busca `getEntry()`, así que elige uno con el que estés a gusto de por vida.
- **`type`** debería ser `bxagents` - el tipo de entrada dedicado de ForgeBox para proyectos/plantillas BxAgents (ejecuta `box forgebox types` para verlo junto al resto de tipos). `bxAgents new --forgebox` nunca inspecciona `type` al instalar, pero declararlo correctamente es lo que hace que tu plantilla aparezca en la categoría "BxAgents" de ForgeBox en lugar de en una genérica, de modo que la gente pueda encontrarla navegando. Añade también `keywords` descriptivas (por ejemplo `"boxlang"`, `"ai-agent"`), ya que es lo que usa la búsqueda de texto completo.
- **`version`** debería incrementarse (`box bump --patch`/`--minor`/`--major`, desde dentro de la carpeta de la plantilla) cada vez que publiques un cambio - `bxAgents new --forgebox` instala siempre lo que resuelva `latestVersion` en ese momento.

Después, desde dentro del proyecto:

```bash
box forgebox register   # una vez, si aún no tienes cuenta en ForgeBox
box publish
```

`publish` lee por convención los archivos `readme`/`instructions`/`changelog` de la carpeta y los publica como la descripción, las notas de instalación y el changelog de la entrada - merece la pena tener un `README.md` real por la misma razón que en el camino de GitHub. Una vez publicado, cualquiera puede ejecutar:

```bash
bxAgents new my-agent --forgebox=my-bxagents-template
```

!!! info
    `bxAgents new --forgebox` ya desanida un nivel automáticamente (ver arriba), así que no necesitas el ajuste `createPackageDirectory: false` de `box.json` para que este camino concreto funcione - ese flag solo importa para las convenciones de instalación propias de `box install`, no para el instalador de este módulo.
