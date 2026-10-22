---
title: Referencia de CLI
icon: phosphor-duotone:terminal-window
summary: Cada verbo de bxAgents y sus flags.
description: Cada verbo de bxAgents y sus flags.
tags: [reference, cli]
---

# Referencia de CLI

```
Usage: boxlang module:bxAgents <verb> [options]
```

(o la forma más corta `bxAgents <verb> [options]` - ver [Instalación](getting-started/installation.md).)

## Flags globales

Estos se manejan antes del despacho de verbos y nunca llegan a un verbo.

| Flag | Efecto |
|---|---|
| `-h`, `--help`, `help` | Imprime el uso (cada verbo + descripción) y sale con 0. Se acepta en **cualquier** posición, así que `bxAgents clean --help` imprime el uso en lugar de ejecutar `clean`. También se imprime (sale con 1) si no se da ningún verbo en absoluto. |
| `-v`, `--version` | Imprime `bxAgents v{version}` y sale con 0. Solo es significativo como primer token, así que nunca colisiona con `package --version=1.0.0`. |

## Todo verbo acepta

`--projectRoot=<path>` (o una ruta posicional simple como el primer argumento sin flag) para apuntar a un proyecto distinto del directorio actual. Precedencia: flag `--projectRoot` > primer argumento posicional > directorio de trabajo actual.

## Sintaxis de argumentos

Sigue las propias convenciones documentadas de CLI de BoxLang:

| Forma | Resultado |
|---|---|
| `--option` | `true` |
| `--option=value` / `--option="quoted value"` | `value` (se eliminan las comillas envolventes) |
| `-o=value` | forma corta con un valor |
| `-o` | forma corta, `true` |
| `-abc` | abreviatura combinada: `a`, `b`, `c` todos `true` |
| `--!option` / `--no-option` | negación, `false` |
| cualquier otra cosa | un posicional (el primero se convierte en el respaldo de raíz de proyecto) |

Opciones repetidas: gana la última.

Fíjate en la primera fila: un `--option` suelto es un **booleano**, no una forma de pasar el siguiente token como su valor. Por eso un flag que requiere un valor (`--model`, `--message`, `--password`, `--environment`, `--port`, ...) se rechaza con un error cuando se escribe sin valor, en lugar de convertirse en silencio en `true`:

```
$ bxAgents new my-agent --model openai/gpt-5
Error: --model requires a value - write it as `--model=<value>`.
```

Usa siempre la forma `--flag=valor`. La forma con espacio no está soportada.

## Autocompletado con Tab

`completions/` contiene scripts de autocompletado listos para bash, fish y PowerShell. Consulta [Instalación](getting-started/installation.md#autocompletado-con-tab) para la configuración de cada uno en una línea.

## Verbos

::: cards
::: card title="new" icon="phosphor-duotone:sparkle" href="#new"
Genera el andamiaje de un nuevo proyecto de agente.
:::
::: card title="add" icon="phosphor-duotone:plus-circle" href="#add"
Añade una herramienta, un interceptor, una programación, un servidor MCP, un gateway, un subagente o una skill a un proyecto existente.
:::
::: card title="skills" icon="phosphor-duotone:graduation-cap" href="#skills"
Busca, instala, actualiza y elimina skills de skills.boxlang.io.
:::
::: card title="build" icon="phosphor-duotone:hammer" href="#build"
Ejecuta el pipeline de build completo.
:::
::: card title="test" icon="phosphor-duotone:test-tube" href="#test"
Ejecuta los propios tests/specs de tu proyecto vía TestBox.
:::
::: card title="serve" icon="phosphor-duotone:broadcast" href="#serve"
Lanza un proceso real de boxlang-miniserver.
:::
::: card title="chat" icon="phosphor-duotone:terminal-window" href="#chat"
REPL interactivo contra el agente construido.
:::
::: card title="invoke" icon="phosphor-duotone:paper-plane-tilt" href="#invoke"
Un turno no interactivo - para scripting/CI.
:::
::: card title="package" icon="phosphor-duotone:package" href="#package"
Empaqueta un proyecto construido en un .bxa.
:::
::: card title="deploy" icon="phosphor-duotone:cloud-arrow-up" href="#deploy"
Envía a un destino de despliegue real.
:::
::: card title="hash-password" icon="phosphor-duotone:key" href="#hash-password"
Genera el hash de una contraseña en texto plano para una entrada de usuarios de webui.
:::
::: card title="token" icon="phosphor-duotone:identification-card" href="#token"
Emite, lista y revoca tokens de acceso para un agente desplegado.
:::
::: card title="notes" icon="phosphor-duotone:note-pencil" href="#notes"
Lee y gestiona las notas que guarda un agente.
:::
::: card title="inspect" icon="phosphor-duotone:magnifying-glass" href="#inspect"
Informa de cómo está compuesto el agente, a partir de su código fuente.
:::
::: card title="clean" icon="phosphor-duotone:broom" href="#clean"
Elimina la salida .build/ y dist/ de un proyecto.
:::
::: card title="doctor" icon="phosphor-duotone:stethoscope" href="#doctor"
Diagnostica el runtime y el proyecto antes de que build o serve te sorprendan.
:::
:::

### `new`

Crea un nuevo proyecto de agente de una de tres formas mutuamente excluyentes: generar el andamiaje (respondiendo preguntas en una terminal, o con opciones), clonar un repositorio de GitHub, o instalar un paquete de ForgeBox.

```bash
# En una terminal: responde preguntas (ver la guía del asistente de new)
bxAgents new my-agent

# Generar el andamiaje con opciones (plantilla por defecto: minimal)
bxAgents new my-agent --model=openai/gpt-5 [--template=minimal|webui-chat|slack-bot|telegram-bot|github-bot|mcp-server|scheduled|multi-agent] [--name=...] [--description=...] [--class] [--skipInstall]

# Lo mismo, añadiendo lo que ofrecería el asistente
bxAgents new my-agent --model=claude --with=time,search --search=brave --mcp=github --channels=web,telegram --guard=flag

# Clonar un repositorio de GitHub existente
bxAgents new my-agent --repo=owner/repo-name

# Instalar un paquete de ForgeBox
bxAgents new my-agent --forgebox=some-package-slug
```

- Sin `--model`, sin `--repo` y sin `--forgebox`, en una terminal, `new` ejecuta el [asistente](guides/new-wizard.md). `--no-wizard` o `--yes` lo desactiva, `--wizard` lo activa incluso con un `--model`, y `--no-tui` hace las mismas preguntas como líneas numeradas. Un `--model` por sí solo nunca lo inicia, porque los scripts siempre han tenido que pasar uno. Las opciones del asistente (`--with`, `--search`, `--files`, `--files-dir`, `--memory`, `--mcp`, `--channels`, `--web-auth`, `--guard`, `--deploy` y los detalles de despliegue) están en la [guía del asistente](guides/new-wizard.md#sin-el-asistente); un valor incorrecto nombra la opción y qué acepta. Necesitan `Agent.yaml`, así que no se pueden combinar con `--class`.
- `--template`, `--repo` y `--forgebox` nombran tres FUENTES de proyecto distintas - se aplica exactamente una. Combinar dos de ellas es un error.
- **Modo `--template`** (el predeterminado cuando no se pasa ninguna opción de fuente - `minimal`):
  - `--model` es **requerido** cuando no se hacen preguntas - un slug `provider/model` (ver [el slug de modelo](conventions/agent-bx.md#the-model-slug)).
  - `--name` por defecto toma el propio nombre base del directorio destino.
  - Se niega a ejecutarse si el destino ya contiene un `Agent.yaml` o un `Agent.bx`.
  - Crea [`Agent.yaml`](conventions/agent-yaml.md), `instructions.md`, cada carpeta de convención (vacía), un [`box.json`](conventions/box-json.md) en la raíz (`testbox` como dependencia de desarrollo, instalada en `lib/testbox`), una carpeta [`tests/`](conventions/testing.md) lista para ejecutar (`tests/specs/AgentSpec.bx`), un `.env` que declara `BOXLANG_HOME=.build/runtime` (coincidiendo con el propio home de runtime delimitado que usa `serve`), un `.gitignore` (`.env`, `.build/`, `dist/`, `lib/`, `boxlang_modules/`, archivos de editor) y los dotfiles estándar `.editorconfig`, `.gitattributes`, `.bxlint.json`, `.markdownlint.json` y un `.boxlang.json` con todos los ajustes de bx-ai en sus valores por defecto (el runtime de BoxLang lo lee al ejecutarse desde la raíz del proyecto; edita ahí los valores). Nunca sobrescribe un archivo que ya existe. BoxLang y `boxlang-miniserver` cargan por sí mismos un `.env` desde la raíz del proyecto, así que el archivo también sirve para tus claves de API; BxAgents nunca lo lee, lo copia ni lo empaqueta.
  - `--template` elige una de 8 plantillas incorporadas, cada una añadiendo un poco de contenido preconfigurado sobre el esqueleto base anterior (consulta [Plantillas de agente](agent-templates.md) para ver cada archivo generado, cómo funcionan las fuentes `--repo`/`--forgebox` y cómo publicar la tuya):
    - `minimal` - el esqueleto desnudo, nada más.
    - `webui-chat` - añade un `gateways/webui.bx` que expone la [UI de chat web](conventions/gateways/index.md) en `/chat`.
    - `slack-bot` - añade un adaptador de canal `gateways/slack.bx`, más las líneas de marcador de posición `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` correspondientes en `.env`.
    - `telegram-bot` - añade un adaptador de canal `gateways/telegram.bx`, más una línea de marcador de posición `TELEGRAM_BOT_TOKEN` correspondiente en `.env`.
    - `github-bot` - añade un adaptador de canal `gateways/github.bx`, más las líneas de marcador de posición `GITHUB_TOKEN`/`GITHUB_WEBHOOK_SECRET`/`GITHUB_BOT_NAME` correspondientes en `.env`.
    - `mcp-server` - añade un servidor de herramientas de ejemplo `mcp/exampleServer.bx` y una entrada `gateways/mcpExpose.bx` que lo expone como servidor MCP en `/mcp`.
    - `scheduled` - añade un [`schedules/Scheduler.bx`](conventions/schedules.md) real que llama al agente con un temporizador diario.
    - `multi-agent` - añade una lista `subAgents` al `Agent.yaml` raíz que declara dos [subagentes](conventions/subagents.md) (`researcher`, `writer`), cada uno generado como su propio `subagents/<name>/Agent.yaml` + `instructions.md` reales.
  - `--class` (una opción booleana sin valor, como las demás descritas arriba) escribe el [`Agent.bx`](conventions/agent-bx.md) basado en clase en lugar del `Agent.yaml` predeterminado, para agentes cuya definición necesita código (hooks, instrucciones dinámicas). Aplica a la raíz y a los subagentes que genere una plantilla, y solo al modo `--template` - no a `--repo`/`--forgebox`.
  - También ejecuta `box install` en la raíz del nuevo proyecto, así que `bxAgents test` funciona de inmediato sin un paso de instalación separado. Esto es de mejor esfuerzo: si `box` no está en `PATH` o la instalación falla, `new` igual tiene éxito - el mensaje simplemente te indica ejecutarlo tú mismo. Pasa `--skipInstall` para omitir este paso por completo.
- **Modo `--repo`** (`--repo=owner/repo-name` o una URL completa): clona el repositorio mediante una dependencia [JGit](https://www.eclipse.org/jgit/) incluida - no es necesario tener instalado el binario `git`. Siempre clona de forma superficial (profundidad 1) y siempre elimina la carpeta `.git` resultante después, de modo que el nuevo proyecto empieza con un historial limpio en lugar de quedar atado al propio remoto del repositorio plantilla. Se niega a ejecutarse en un directorio que ya existe y no está vacío, y falla claramente si no se encuentra ningún `Agent.yaml` ni `Agent.bx` en el repositorio clonado.
- **Modo `--forgebox`** (`--forgebox=<slug>`): instala un paquete de [ForgeBox](https://www.forgebox.io) hablando directamente con la propia API REST de ForgeBox (no requiere el CLI `box`). Falla claramente si el slug no existe, la descarga falla, o el paquete instalado no tiene un `Agent.yaml` ni un `Agent.bx` en su raíz (desenvolviendo primero un nivel de anidamiento, ya que muchos archivos de ForgeBox envuelven su contenido en una única carpeta de nivel superior).
- Solo el modo `--template` necesita `--model`; `--repo`/`--forgebox` nunca lo requieren, ya que el proyecto fuente ya define el suyo propio.
- `--name`/`--description` se ignoran (con una advertencia en la salida) cuando se usa `--repo`/`--forgebox` - el proyecto clonado/instalado define el suyo propio.
- El paso de conveniencia `box install` (y `--skipInstall`) solo aplican al modo `--template` - el propio `box.json` de un proyecto clonado/instalado (si es que tiene uno) se deja intacto.

### `add`

Añade una cosa a un proyecto que ya existe, haciendo las mismas preguntas que `new`. Hoy eso es una `tool`, un `interceptor`, una `schedule`, un servidor `mcp`, un `model`, un `gateway`, un `subagent` o una `skill`.

```bash
bxAgents add                        # elige qué añadir
bxAgents add tool                   # pregunta nombre, función, descripción y argumentos
bxAgents add tool WeatherTools --function=getWeather --description="Get the weather for a city" --args="city, days:numeric"
bxAgents add tool Pinger --agent=researcher     # en subagents/researcher/tools/
bxAgents add tool Pinger --dry-run              # muestra el archivo, no escribe nada
```

- Los argumentos posicionales son el tipo y el nombre, así que el proyecto se encuentra solo con `--projectRoot=<ruta>` o la carpeta actual.
- En una terminal se pregunta lo que no se haya dado como flag, en la interfaz de pantalla completa (o con líneas numeradas con `--no-tui`). Con `--yes`, en un pipe o en CI no se pregunta nada: se usan los flags y los valores por defecto, y si falta una respuesta obligatoria se indica el flag que hay que pasar.
- Las preguntas terminan en una revisión de los archivos que se escribirán. Cancelar, con Esc o Ctrl+C, no cambia nada.
- **No se sobrescribe nada.** Si un archivo ya existe no se escribe ninguno y el error lo nombra; `--force` lo reemplaza.
- `--dry-run` imprime cada archivo con su texto y no escribe nada.

#### `add tool`

Crea `tools/<Name>.bx` con una función `@AITool` con la forma que [documenta bx-ai](conventions/tools.md): un docblock que describe cada argumento, la anotación con la descripción que lee el modelo, y argumentos `required` tipados a partir de los cuales bx-ai construye el esquema de la herramienta.

| Flag | Significado |
|---|---|
| `--name=<Name>` | El nombre del archivo, o el segundo posicional. Letras, dígitos y guiones bajos, empezando por una letra. |
| `--agent=<subagent>` | De quién es la herramienta. Solo se pregunta si el proyecto tiene subagentes; `.` (el valor por defecto) es el agente raíz. |
| `--function=<name>` | La función que llama el modelo. Por defecto, el nombre del archivo con la primera letra en minúscula. |
| `--description=<text>` | Qué hace la herramienta. El modelo la lee para decidir cuándo llamarla. Sin ella, y sin nada que preguntar, el archivo recibe una descripción `TODO` y la salida te recuerda reemplazarla. |
| `--args=<list>` | Separados por comas, cada uno `name` o `name:type` (`string` por defecto; también `numeric`, `boolean`, `array`, `struct`, `date` y `any`). |

Una herramienta pertenece al agente en cuya carpeta está y se le asocia automáticamente. Dos archivos de herramienta de un mismo agente no pueden compartir nombre, ni siquiera en subcarpetas distintas, así que un choque se rechaza aquí en lugar de en el siguiente `build`. Comprueba el resultado con `bxAgents inspect --section=tools`.

#### `add interceptor`

Crea `interceptors/<Name>.bx` con un método por cada punto de interceptación que elijas, y el `@scope` por el que [el build separa los interceptores](conventions/interceptors.md).

```bash
bxAgents add interceptor AuditLogger --points=preProcess,onException --description="Log every request"
bxAgents add interceptor AiWatch --scope=runtime --points=beforeAIModelInvoke,onAIError
```

| Flag | Significado |
|---|---|
| `--name=<Name>` | El nombre del archivo, o el segundo posicional. Se rechaza un nombre que otro interceptor ya usa. |
| `--scope=agent\|runtime` | `agent` (el valor por defecto) es un interceptor de ColdBox registrado en la app generada al arrancar; sus métodos reciben `( event, interceptData, rc, prc )`. `runtime` escucha los eventos que bx-ai anuncia en el runtime de BoxLang y recibe los datos del evento como único argumento; BxAgents lo copia a `.build/runtime-interceptors` pero no lo registra por ti. |
| `--points=<list>` | Puntos de interceptación separados por comas. El selector ofrece los habituales; aquí se puede nombrar cualquier punto del núcleo de ColdBox (`agent`) o evento de bx-ai (`runtime`), y se rechaza un nombre que no sea un punto de ese ámbito. Por defecto `preProcess` (`agent`) o `beforeAIModelInvoke` (`runtime`). |
| `--description=<text>` | Una línea para el docblock de la clase. Opcional. |

#### `add schedule`

Añade una tarea a `schedules/Scheduler.bx` que envía un mensaje al agente según una programación. Solo se pregunta cuándo se ejecuta y qué le dice al agente. Las ejecuciones solapadas siempre se evitan (`.withNoOverlaps()`).

```bash
bxAgents add schedule --when="weekdays 08:30" --prompt="Summarize yesterday's findings"
bxAgents add schedule digest --when="every 15 minutes" --prompt="Check for new tickets" --agent=researcher
bxAgents add schedule                          # pregunta cada cuánto, los detalles, un nombre y qué decir
```

| Flag | Significado |
|---|---|
| `--when=<phrase>` | Cuándo se ejecuta, con una de las frases de abajo. En una terminal, omítelo y se te pregunta cada cuánto y luego los detalles. |
| `--prompt=<text>` | El mensaje que se envía al agente cada vez. |
| `--name=<name>` | El nombre de la tarea, o el segundo posicional. Por defecto, un nombre hecho a partir de la frase. Se rechaza un nombre que ya esté en el scheduler. |
| `--agent=<subagent>` | Qué agente la ejecuta. Solo se pregunta si el proyecto tiene subagentes; `.` (el valor por defecto) es el agente raíz. La tarea busca al agente por su `name` declarado, así que renombrar el agente obliga a editar la tarea. |

| Frase | Se ejecuta |
|---|---|
| `every 15 minutes`, `every 2 hours`, `every 1 days` | En ese intervalo |
| `hourly`, `hourly :15` | Cada hora, en punto o en ese minuto |
| `daily 09:00` | Cada día a esa hora |
| `weekdays 08:30`, `weekends 10:00` | De lunes a viernes, o sábado y domingo |
| `weekly mon 09:00` | Una vez por semana (`mon` `tue` `wed` `thu` `fri` `sat` `sun`) |
| `monthly 1 09:00` | Una vez al mes ese día, de 1 a 28 para que ningún mes se la salte |
| `first-business-day 09:00`, `last-business-day 17:00` | Ese día laborable de cada mes |

Las horas son `HH:mm` en formato de 24 horas, en la zona horaria del scheduler. No hay frase cron: el `ScheduledTask` de ColdBox no tiene método cron, así que para cualquier otra cosa escribe la tarea a mano con todo su DSL.

- Si `schedules/Scheduler.bx` no existe, se crea. Si existe, la tarea se añade al final de `configure()` y el resto del archivo se deja como estaba.
- Si no se encuentra `configure()`, no se cambia nada y el error incluye la tarea para pegarla.
- Las tareas programadas se ejecutan mientras la app se sirve (`bxAgents serve`). Comprueba el resultado con `bxAgents inspect --section=schedule`.

#### `add mcp`

Añade un servidor MCP en cualquiera de las dos direcciones: uno al que el agente **llama** (se escribe en `Agent.yaml`), o uno que el proyecto **aloja** (`mcp/<name>.bx`).

```bash
bxAgents add mcp client github                 # un servidor del catálogo que usa el asistente de new
bxAgents add mcp client --url=https://mcp.acme.dev/mcp --name=acme --auth=bearer --env=ACME_TOKEN
bxAgents add mcp server tools --description="My tools"
bxAgents add mcp                                # pregunta en qué dirección
```

**`add mcp client`** añade una entrada a la lista `mcpServers:` del agente. Un nombre del catálogo (`github`, `stripe`, `notion`, `atlassian`, `cloudflare`, `supabase`, `git`) rellena la dirección y el inicio de sesión, o, para un servidor que se ejecuta como programa en esta máquina (`git`), el `command` para iniciarlo y lo que necesita en el PATH; si no, indica `--url`.

| Flag | Significado |
|---|---|
| `--url=<address>` | Un servidor que no está en el catálogo. Se rechaza una dirección con usuario, contraseña o clave: el secreto va en una variable de entorno. |
| `--name=<label>` | Una etiqueta para `Agent.yaml`; no se envía al servidor. |
| `--auth=none\|bearer\|header\|basic` | Cómo inicia sesión. `bearer` escribe `token`, `header` escribe `headers` (nómbralo con `--header=`), `basic` escribe `user` (con `--user=`) y `password`. |
| `--env=<NAME>` | La variable de entorno que guarda la clave o contraseña. En `Agent.yaml` solo va el nombre, como `${env.NAME}`; se añade un `NAME=` vacío a `.env` para que lo rellenes. |
| `--timeout=<ms>` | Opcional. |
| `--agent=<subagent>` | Qué agente lo usa; `.` (el valor por defecto) es el agente raíz. |

**`add mcp server`** escribe `mcp/<name>.bx` ofreciendo las herramientas del proyecto mediante el servidor MCP de bx-ai y, salvo que lo rechaces, una entrada `gateways/<name>Mcp.bx` que lo sirve por HTTP.

| Flag | Significado |
|---|---|
| `--name=<name>` | El nombre del archivo y del servidor. Por defecto `tools`. |
| `--description=<text>`, `--version=<x.y.z>` | Lo que ven otros agentes. |
| `--tools=<list>` | Qué herramientas ofrecer. Por defecto todas las del agente raíz; se rechaza un nombre que no sea una de ellas. |
| `--cors=<origin>` | Orígenes web que pueden llamarlo desde un navegador; `*` para cualquiera. Vacío para ninguno. |
| `--expose` / `--no-expose`, `--path=<path>` | Si se sirve por HTTP y dónde (por defecto `/mcp/<name>`). Se rechaza una ruta que ya use otra entrada de `gateways/`. |

La lista de herramientas se escribe al ejecutar el comando, así que una herramienta añadida después hay que añadirla a `mcp/<name>.bx`. La ruta servida no tiene autenticación propia: mantenla fuera de redes públicas o ponla detrás de un proxy que compruebe una credencial.

- `Agent.yaml` se edita solo insertando líneas, así que sus comentarios y su formato se quedan como están. Si la lista no se puede ampliar así (escrita en una línea, por ejemplo), o la definición es un `Agent.bx` basado en clase, no se cambia nada y el error incluye la entrada para pegarla.
- Se rechaza un servidor que el agente ya usa, por nombre o dirección.

#### `add gateway`

Añade una forma de llegar al agente: una plataforma de chat, la interfaz web de chat o la API HTTP. (Una ruta MCP alojada se añade con `add mcp server`.)

```bash
bxAgents add gateway telegram                   # consulta Telegram, no necesita dirección pública
bxAgents add gateway slack --env=botTokenEnvVar=ACME_BOT,appTokenEnvVar=ACME_APP --policy=steer
bxAgents add gateway web --auth=key             # la página de chat en el navegador, con una clave compartida aleatoria
bxAgents add gateway api --path=/api/chat
bxAgents add gateway                            # pregunta cuál
```

Las plataformas son las que ofrece el asistente de new: `telegram`, `slack`, `discord`, `whatsapp-cloud`, `teams`, `twilio`, `github`, `email` y `signal`.

| Flag | Significado |
|---|---|
| `--name=<name>` | El archivo, `gateways/<name>.bx`, o el segundo posicional. Por defecto, el tipo. Se rechaza un nombre en uso. |
| `--env=<config=NAME,...>` | Plataformas de chat: qué variable guarda cada credencial, por ejemplo `botTokenEnvVar=ACME_BOT`. Sin él se usan los nombres habituales (`SLACK_BOT_TOKEN`, ...). En el archivo del gateway solo van los nombres; en `.env` se añade un marcador vacío para cada uno. |
| `--policy=queue\|reject\|steer\|interrupt` | Plataformas de chat: qué hacer con un mensaje que llega mientras el agente sigue respondiendo. Se escribe en el `gatewaySession` de Agent.yaml salvo que sea el valor por defecto, `queue`. |
| `--path=<path>` | `web` y `api`: dónde se sirve (`/chat` y `/api/chat` por defecto). Se rechaza una ruta que otro gateway use. |
| `--auth=open\|key\|users` | `web`: cualquiera que pueda alcanzarlo, una clave compartida aleatoria guardada en `.env` como `CHAT_UI_API_KEY`, o usuarios con nombre. |
| `--users=<name:hash,...>` | `web` con `users`: cada hash sale de `bxAgents hash-password`. Una contraseña nunca se acepta como flag; en una terminal la escribes, oculta, y solo se guarda su hash. |

Tras añadir una plataforma de chat, la salida lista los pasos que ocurren fuera del proyecto (crear el bot, una dirección pública, un daemon) y qué variables de `.env` rellenar; `bxAgents doctor` informa de las que sigan sin definir. La ruta de la API HTTP no tiene autenticación salvo que se defina `agentApi.tokenEnvVar` en `Agent.yaml`.

#### `add subagent`

Añade un subagente: un agente completo en `subagents/<name>/` con su propio modelo, herramientas, servidores MCP, memoria y guard, conectado a la lista `subAgents` de un padre. En una terminal hace las mismas preguntas que `new` (propósito, modelo, herramientas, búsqueda, archivos, memoria, MCP, guard); se omiten las que solo importan a un proyecto entero (forma, canales, despliegue).

```bash
bxAgents add subagent researcher                # pregunta
bxAgents add subagent writer --model=openai/gpt-5 --description="Escribe la respuesta"
bxAgents add subagent checker --model=claude --parent=writer --with=search --search=brave --guard=flag
```

| Flag | Significado |
|---|---|
| `--name=<name>` | La carpeta, o el primer posicional. Se rechaza un nombre que ya tenga cualquier agente del proyecto. |
| `--parent=<carpeta>` | El agente que delega en él: `.` para la raíz (por defecto) o la carpeta de otro subagente, que es como se anidan. |
| `--model=<provider/model>` | Obligatorio sin terminal. |
| `--description`, `--with`, `--search`, `--files`, `--files-dir`, `--memory`, `--mcp`, `--guard` | Los mismos que en [`new`](#new). |

Escribe `subagents/<name>/Agent.yaml` (con el modelo simulado de `environments.test`, para que `bxAgents test` no necesite clave) e `instructions.md`, y añade un marcador vacío en `.env` por cada clave que necesiten las opciones. El nombre se inserta en el `subAgents` del padre sin reescribir el archivo, así que los comentarios y el orden se conservan. Si el padre es una clase, o su lista está escrita de una forma que no se puede ampliar insertando, no se cambia nada en él y se imprime la línea que hay que añadir. Los paquetes que necesite una opción (`bx-playwright` para navegar) se nombran para que los añadas a `box.json`.

#### `add skill`

Añade una skill propia: `skills/<name>/SKILL.md`, con la forma de las Claude Agent Skills. Va al control de código con el proyecto y a cada build.

```bash
bxAgents add skill release-notes --description="Use this skill when writing release notes"
bxAgents add skill                              # pregunta
```

| Flag | Significado |
|---|---|
| `--name=<name>` | La carpeta, o el primer posicional. Minúsculas, dígitos y guiones. Se rechaza una skill que ya exista. |
| `--description=<text>` | Una frase que empiece por "Use this skill when". El modelo la lee para decidir si carga la skill, así que es lo que importa. Sin ella se escribe un TODO para que lo reemplaces. |

Las skills no se conectan a un agente: todas las skills del build están disponibles para el modelo. Las skills de skills.boxlang.io no se añaden aquí; se instalan, no se escriben.

### `skills`

Skills del registro (skills.boxlang.io), como las instala `coldbox ai skills`. Una skill propia va en `skills/`: consulta [`add skill`](#add-skill).

```bash
bxAgents skills find release                    # busca en el registro
bxAgents skills install ortus-boxlang/skills/boxlang-developer~configuration
bxAgents skills install                         # restaura lo que el lock lista y el disco no tiene
bxAgents skills list                            # qué está instalado y si está intacto
bxAgents skills update [name...] [--dry-run]    # obtiene versiones más nuevas
bxAgents skills remove <name>
```

| Comando | Qué hace |
|---|---|
| `find <words>` | Busca en nombres y descripciones. Muestra la referencia para instalar, el resultado de la auditoría del registro y el número de instalaciones. No necesita proyecto. `--limit=<n>` (10 por defecto), `--json`. |
| `install <owner/repo/skill>...` | Instala en `.agents/skills/<name>/SKILL.md` y lo anota en `.agents/skills.lock.json`. La última parte puede ser el slug (`boxlang-developer~configuration`), la ruta en el repositorio (`boxlang-developer/configuration`) o el nombre de la skill. Una skill que no pasó la auditoría de seguridad del registro se rechaza; una que no es `trusted` se marca. |
| `install` | Sin referencia, restaura lo que el lock lista y el disco no tiene. |
| `list` | Una línea por skill instalada. Avisa de una que falta o que se editó tras instalarla. `--json`. |
| `update [name...]` | Obtiene versiones más nuevas. Una skill que editaste se omite, con lo que hacer; `--dry-run` solo informa. |
| `remove <name>` | Borra la skill y su entrada del lock. |

`--registry=<url>` (o la variable de entorno `BXAGENTS_SKILLS_URL`) apunta a otro registro.

#### Dónde vive cada cosa

| Ruta | Qué | En el control de código |
|---|---|---|
| `skills/<name>/` | Skills que escribiste | Sí |
| `.agents/skills/<name>/` | Skills instaladas del registro | No. `install` añade la carpeta a `.gitignore`. |
| `.agents/skills.lock.json` | Qué está instalado, su origen y su sha | Sí |

`build` restaura cualquier skill que el lock liste y el disco no tenga, así que un checkout nuevo construye el mismo agente, y falla nombrando la skill si no se alcanza el registro. No se descarga nada cuando están todas, así que un build sin conexión de un proyecto restaurado funciona. Ambas carpetas van al build; una skill propia con el mismo nombre gana a una instalada.

El sha es el sha de blob de git de `SKILL.md`, el que informa el registro. Una instalación se comprueba contra él antes de escribir nada, y así sabe `update` que una skill cambió y `list` que editaste una.

!!! warning
    Una skill son instrucciones que tu agente sigue. El registro audita lo que lista, pero lee lo que instalas antes de publicarlo.

### `build`

Ejecuta el [pipeline de build](build-pipeline.md) completo.

```bash
bxAgents build [--environment=production] [--verbose] [--generatorVersion=1.0.0]
```

Escribe `.build/app/` y `.build/manifest.json`. Falla con todos los errores de validación recopilados si el proyecto no es válido.

- `--verbose` imprime una línea por fase de build en vivo mientras se ejecuta - qué se resolvió/descubrió/validó, conteos por fase (modelos, tools, gateways, advertencias, etc.), qué agentes terminaron registrados en `config/WireBox.bx` y bajo qué nombres, si se encontró un `schedules/Scheduler.bx`, y una línea final de tiempo `Build completed in Xms`. Útil para depurar un build lento o con comportamiento inesperado. Silencioso en cualquier otro caso - `--verbose` no cuesta nada cuando no se pasa.
- `--generatorVersion` sobrescribe la cadena grabada en `generator.version` de `manifest.json` (ver [El manifest](manifest.md)) - por defecto `"dev"` cuando se omite. Existe para herramientas que construyen contra una versión publicada específica de este módulo y quieren que eso quede registrado en el manifest, en lugar del valor por defecto de desarrollo local.

### `test`

Ejecuta los propios [`tests/specs`](conventions/testing.md) de tu proyecto vía TestBox.

```bash
bxAgents test
```

- Requiere TestBox instalado en `lib/testbox` (`box install` en la raíz del proyecto; también se encuentra `tests/testbox`).
- Construye tu agente contra el proveedor `mock` por defecto (el override de entorno `test` de `Agent.yaml`, o `test()` en un `Agent.bx` basado en clase) - no se necesita clave de API ni acceso a red.
- Imprime conteos de aprobados/fallidos/con error/omitidos más una línea por fallo, y sale con código distinto de cero si algo falló.

### `serve`

Lanza un proceso real de [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) apuntado a `.build/app`.

```bash
bxAgents serve [--port=8080] [--host=127.0.0.1]
```

- Requiere un `build` previo - falla claramente si `.build/app` no existe.
- Falla claramente si `boxlang-miniserver` no se encuentra en `PATH`.
- Sirve siempre el agente en `/__bxagents` (`POST /invoke`, `POST /stream`, `POST /batch`, `GET /info`), declare lo que declare el proyecto en [`gateways/`](conventions/gateways/index.md) - consulta [La ruta de agente siempre activa](conventions/agent-bx.md#la-ruta-de-agente-siempre-activa) para exigir un token en ella, o desactivarla.
- **Escucha en `127.0.0.1` por defecto.** Una app generada no tiene autenticación salvo que la configures (la clave de API y el inicio de sesión de la interfaz web son ambos opcionales), así que el valor por defecto mantiene un servidor de desarrollo fuera de la red. Pasa `--host=0.0.0.0` para escuchar en todas las interfaces de forma deliberada - la línea de arranque te dice cuál de las dos obtuviste.
- `--port` debe ser un entero entre 1 y 65535; cualquier otra cosa falla de inmediato en lugar de dentro del proceso del servidor.
- Escribe `.build/miniserver.json` (reescrituras habilitadas, `rewriteFileName: "index.bxm"`, health check activado) antes de lanzar, y `.build/runtime/config/boxlang.json`, que desactiva la compresión de espacios en blanco (colapsaría las líneas en blanco que cierran cada frame SSE) y apunta la app al módulo BxAgents instalado y a los módulos incluidos dentro de él.
- Delimita el propio home de runtime de BoxLang del servidor a `.build/runtime` (vía `serverHome`) en lugar del `~/.boxlang` compartido por defecto, así que la caché de clases compiladas y los overrides de configuración de cada proyecto están aislados - y `clean` lo elimina gratis, ya que de todos modos borra `.build` por completo. `invoke --server` también obtiene esto, ya que reutiliza `serve` internamente. Esto **no** se extiende a `chat`/`build`/`test`/`invoke` por defecto.

### `chat`

Un chat con el agente construido, en una pantalla de terminal que conserva tu historial: los turnos terminados se imprimen como texto normal de la terminal (selecciónalos, búscalos y desplázate como siempre) y solo se redibujan el cuadro de mensaje y la respuesta que se está escribiendo. `--no-tui` (y cualquier terminal no interactiva) usa un REPL simple línea por línea, basado en el `MiniConsole` de BoxLang.

```bash
bxAgents chat                                  # rápido, en el mismo proceso
bxAgents chat --no-tui                         # REPL simple línea por línea
bxAgents chat --server [--port=<puerto>]       # aplicación completa, servidor propio desechable
bxAgents chat --connect=http://127.0.0.1:8080  # aplicación completa, servidor que ya tienes en marcha
bxAgents chat --connect=https://agent.example.com --token=<token>   # un servidor que pide uno
bxAgents chat --user=alice                     # de quién son las notas y conversaciones (por defecto: tu usuario del SO)
bxAgents chat --continue                       # abre la conversación más reciente, con su historial
bxAgents chat --session=2                      # abre una por su número en /sessions, o por id
```

En la pantalla:

| Tecla | Hace |
|---|---|
| Enter | Envía el mensaje |
| Alt+Enter, Ctrl+J, o `\` y luego Enter | Nueva línea en el mensaje |
| Arriba / Abajo | Mensajes anteriores (desde la primera o última línea del cuadro) |
| Esc | Detiene al agente. Se detiene en su siguiente paso, no a mitad de palabra |
| Enter mientras el agente trabaja | Lo dirige: tu mensaje se añade a la ejecución |
| Ctrl+C | Limpia el cuadro; con el cuadro vacío, sale. Ctrl+D también sale |

Escribe `/` para ver los comandos: `/help`, `/new` (una conversación nueva), `/tools`, `/copy` (la última respuesta al portapapeles, con la secuencia OSC 52 que honran la mayoría de terminales), `/save [archivo]` (la conversación en Markdown), `/sessions`, `/resume`, `/clear`, `/compact` e `/info` (ver abajo), `/remember <texto>` y `/notes` (ver abajo), `/record [archivo]` y `/record stop` (ver abajo) y `/exit`.

#### Conversaciones en el chat

Cada chat es una conversación, listada en la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (`data/chat.db`) bajo tu usuario, la misma lista que muestra el chat web. Los mensajes se guardan en la [memoria](conventions/agent-yaml.md#ajustes) del agente, así que una conversación solo se puede retomar mientras dure esa memoria: la memoria `cache` por defecto se pierde al terminar el proceso, una memoria `file` o `jdbc` no.

| Comando | Hace |
|---|---|
| `/sessions` | Lista tus conversaciones recientes, numeradas |
| `/resume [número o id]` | Vuelve a una y muestra lo que se dijo; sin argumento, la más reciente |
| `/new` | Empieza una conversación nueva (la anterior sigue en la lista) |
| `/clear` | Olvida los mensajes de esta conversación y conserva la conversación |
| `/compact` | Sustituye los mensajes más antiguos por un resumen (requiere un modelo de resumen en la memoria del agente) |
| `/info` | Agente, modelo, conversación, número de mensajes, notas y base de datos |

`--continue` abre la conversación más reciente al iniciar el chat, y `--session=<número o id>` abre una concreta. Ambos muestran primero los mensajes anteriores. Con `--connect` el servidor guarda la lista y los mensajes, con el nombre de tu [token](conventions/agent-bx.md#tokens-de-acceso-para-un-agente-desplegado); un servidor sin base de datos de chat dice que no guarda lista.

#### Notas en el chat

Cuando el agente guarda [notas](conventions/agent-yaml.md#notas), el chat puede mostrarlas y cambiarlas:

| Comando | Hace |
|---|---|
| `/remember <texto>` | Guarda una nota sobre ti |
| `/notes` | Abre la pantalla de notas (abajo) |
| `/notes list` | Imprime tus notas y las del agente, con cuánto llena cada una |
| `/notes add [agent] <texto>` | Añade una nota (sobre ti, o con `agent` sobre el trabajo del agente) |
| `/notes edit <id> <texto>` | Cambia una nota; el id es el código corto de la lista |
| `/notes remove <id>` | Quita una nota |
| `/notes stats` | Caracteres usados frente al límite, y los tokens aproximados que añaden a cada conversación |

`/notes` abre una pantalla con tus notas (pulsa `t` o Tab para las del agente). Las teclas actúan sobre la nota bajo el cursor:

| Tecla | Hace |
|---|---|
| `a` | Añade una nota al alcance en pantalla |
| `e` o Enter | Edita la nota, partiendo de su texto |
| `d` | Quita la nota, tras un sí |
| `t` o Tab | Cambia entre tus notas y las del agente |
| `s` | Muestra las estadísticas |
| Esc | Vuelve al chat |

El encabezado muestra cuántos caracteres del límite se usan y cuántos tokens aproximados añade a cada conversación. Funciona en los tres modos. Con `--connect` los comandos usan las rutas de notas del servidor, así que ves las notas de ese servidor, y quitar una nota del agente requiere un token `admin`. Un agente sin bloque `notes` explica cómo activarlas.

#### Grabar un chat

`--record` guarda lo que muestra la pantalla como un archivo `.cast` de [asciicast](https://docs.asciinema.org/manual/asciicast/v2/), útil para demos e informes de errores. `--record` solo escribe `chat-AAAAMMDD-HHMMSS.cast` en la carpeta actual, y `--record=demo.cast` le da nombre. Dentro del chat, `/record` empieza una grabación (`/record demo.cast` le da nombre) y `/record stop` la termina. Mientras está activa se ve un `● rec` rojo en la línea de ayuda, y el archivo se cierra al salir.

```bash
bxAgents chat --record=demo.cast
asciinema play demo.cast             # reprodúcelo en una terminal
agg demo.cast demo.gif               # conviértelo en GIF (agg es otra herramienta)
```

El archivo guarda la salida de la pantalla, así que muestra lo que escribiste en el cuadro de mensaje y todo lo que imprimió el agente, incluidos los argumentos de las herramientas. Las pulsaciones de teclas en sí no se graban. Una grabación iniciada con `/record` empieza en ese momento, así que no incluye las líneas anteriores. Necesita la pantalla de terminal: `--no-tui` y las ejecuciones no interactivas no graban nada.


La respuesta se muestra mientras llega y se imprime como Markdown formateado (títulos, listas, bloques de código) cuando está completa. En el modo por defecto cada llamada a una tool se muestra con sus argumentos y lo que tardó, y el razonamiento del modelo se muestra mientras trabaja pero no se conserva. Una ejecución que se detiene por [aprobación humana](conventions/gateways/index.md) te pregunta ahí mismo: aprobar una vez, aprobar para la conversación o rechazar. Por HTTP la pantalla es la misma: líneas de tools, razonamiento, Esc, dirección y aprobaciones funcionan, a través de las [rutas de control de ejecución](conventions/agent-bx.md#control-de-ejecución) del servidor. Un servidor construido con un bxAgents antiguo no tiene control de ejecución; entonces obtienes solo la respuesta, con un aviso.

Tres modos, un solo chat:

| Modo | Con qué habla | Cuándo usarlo |
|---|---|---|
| por defecto | La factory de agentes generada, cargada directamente en este proceso | Solo quieres hablar con el agente. Lo más rápido, sin servidor. |
| `--server` | Un `boxlang-miniserver` desechable que arranca y detiene | Necesitas la semántica real de la aplicación - interceptores, el scheduler, los gateways. |
| `--connect=<url>` | Un servidor que ya está en marcha | Tienes un `serve` abierto en otra terminal, o quieres hablar con un despliegue. |

- Requiere un `build` previo - salvo con `--connect`, que habla con un servidor que mantiene otra persona y por tanto no necesita nada construido localmente.
- **Por defecto**: carga `GeneratedAgentFactory.bx` directamente (sin ningún contenedor ColdBox/WireBox involucrado) y llama a `buildAgent()` una vez por sesión - exactamente la misma factory que usan las rutas HTTP de `serve`, así que el agente en sí nunca diverge. Lo que **sí** cambia es todo lo que aporta ColdBox: sin `models/`, sin scheduler, sin interceptores, sin registro de gateways. Cuando eso importa, usa `--server`.
- **`--server`**: arranca un miniserver real (necesita `boxlang-miniserver` en `PATH`, igual que `serve`) en un puerto efímero de loopback y conduce el REPL sobre HTTP contra la [ruta de agente `/__bxagents` siempre activa](conventions/agent-bx.md#la-ruta-de-agente-siempre-activa) del proyecto, y lo apaga al salir. `--port` fija el puerto en lugar de tomar uno libre.
- **`--connect`**: conduce el mismo REPL contra un servidor en marcha, sin arrancar ni detener nada. La URL es la raíz del servidor (`http://host:puerto`), no la ruta del agente - `chat` la añade por su cuenta.
- `--server` y `--connect` son mutuamente excluyentes: uno dice "arráncame un servidor", el otro "no lo hagas". Pasar ambos falla de inmediato en lugar de honrar uno en silencio.
- Ambos modos HTTP hacen **streaming** de la respuesta: la contestación aparece token a token a medida que el agente la produce, por la subruta `/events` (SSE) de la ruta, que también lleva las llamadas a tools y la pausa para aprobación. Esc llama a `/cancel`, un mensaje escrito mientras el agente trabaja llama a `/steer`, y una aprobación se responde con `/resume`. El REPL simple (`--no-tui`) usa `/stream`, y recurre a `/invoke` y a la respuesta completa al final si el stream no se puede abrir (un servidor antiguo sin subruta `/stream`, o un proxy que no deja pasar `text/event-stream`).
- Ambos modos HTTP arrastran el `threadId` del servidor entre turnos, así que una sesión es una sola conversación y no una serie de primeros mensajes inconexos.
- En la pantalla, un turno que se detiene a esperar una decisión [humana en el bucle](conventions/gateways/index.md) te pregunta ahí mismo. En el REPL simple lo indica en lugar de aparentar que responde con silencio, y señala el endpoint `/gateways/interactions/` donde se envía la decisión.
- Si la ruta está protegida tras [`agentApi.tokenEnvVar`](conventions/agent-bx.md#agentapi) o [tokens emitidos](conventions/agent-bx.md#tokens-de-acceso-para-un-agente-desplegado), pasa `--token=<token>` (o define `BXAGENTS_TOKEN`). Sin uno válido estos modos reciben un `401` claro en lugar de un timeout confuso.
- Escribe `/exit` para salir (`exit` y `quit` funcionan en el REPL simple).
- Necesita una terminal interactiva real. Sin ella, vuelve al REPL simple, que también necesita una (`MiniConsole` usa `stty` para el modo raw). Usa [`invoke`](#invoke) para scripts.

### `invoke`

Un solo turno no interactivo contra el agente construido: envía un mensaje, imprime la respuesta, sale. Existe para scripting/CI, donde el requisito de TTY de `chat` es un bloqueo absoluto.

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
bxAgents invoke --message="..." --server [--port=<port>]
```

- Requiere un `build` previo.
- **Por defecto (sin `--server`)**: carga `GeneratedAgentFactory.bx` directamente (sin contenedor ColdBox, sin HTTP) y llama al agente una vez - el mismo camino en proceso que usa `chat` internamente, solo sin el bucle del REPL. No hay ningún prerequisito de `serve`/gateway en absoluto.
- **`--server`**: lanza un proceso real y desechable de `boxlang-miniserver` (igual que `serve`, así que necesita el binario en `PATH`), envía el mensaje como un request HTTP real a la [ruta de agente `/__bxagents` siempre activa](conventions/agent-bx.md#la-ruta-de-agente-siempre-activa) del proyecto, luego apaga el servidor de nuevo. Ejerce el camino realmente servido (enrutamiento ColdBox, interceptores, gateways) en lugar del atajo en proceso. No necesita ninguna entrada `gateways/*` de ningún tipo - la ruta reservada se emite en cada build, así que un proyecto recién generado que no expone nada públicamente funciona igual. `--port` por defecto usa un puerto efímero libre para que nunca colisione con un `serve` ya en ejecución.
- `--json` imprime `{"response": "..."}` en lugar de la respuesta en texto plano.

### `package`

Empaqueta un proyecto construido en un `.bxa`.

```bash
bxAgents package [--version=1.0.0]
```

- Requiere un `build` previo - lee `.build/manifest.json`; falla claramente si falta.
- `--version` por defecto es `1.0.0`.
- Escribe `dist/{agentName}-{version}.bxa`, un `.sha256` hermano, y una copia redactada de `manifest.json`. Ver [Despliegue y secretos](deployment-and-secrets.md).

### `deploy`

Envía un proyecto construido/empaquetado a un destino de despliegue real vía la convención pluggable [`deploy/`](conventions/deploy.md).

```bash
bxAgents deploy --name=production
# o, la forma abreviada solo con flags (solo local):
bxAgents deploy --destination=/path/to/somewhere [--target=local]
```

- `--name=<entry>` despacha a cualquier destino que declare la entrada `deploy/<entry>.bx`/`.json` nombrada (`local`, `ssh`, `ftp`, `sftp`, `docker`, o `digitalocean`).
- La forma solo con flags (`--target=local --destination=...`, o sin `--target` en absoluto) funciona sin ninguna carpeta `deploy/` presente - solo `local` la soporta; cada otro destino requiere una entrada nombrada, ya que necesita más configuración de la que un par de flags puede transportar.
- `local`/`ssh`/`ftp`/`sftp` requieren un `package` previo; `docker`/`digitalocean` requieren un `build` previo (construyen directamente desde `.build/app`).
- `ftp`/`sftp` usan el módulo [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp), que BxAgents incluye.

### `hash-password`

Convierte una contraseña en texto plano en el valor `passwordHash` que acepta el bloque [`users`](conventions/web-ui.md) de una entrada `webui`.

```bash
bxAgents hash-password --password="<tu-contraseña>"
```

- `--password` es **requerido**.
- Imprime el hash a stdout - `pbkdf2$<iterations>$<salt>$<derivedKey>`, PBKDF2-HMAC-SHA256, con salt por llamada. Seguro de commitear: es unidireccional, y hacer el hash de la misma contraseña dos veces produce dos hashes distintos (ambos válidos).
- Se mantiene deliberadamente idéntico al hasher que la propia interfaz web generada usa para verificar un inicio de sesión - un hash producido aquí siempre se verifica allí.

### `token`

Los tokens de acceso de un agente desplegado, guardados en la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (`data/chat.db`, o el archivo que indique `BXAGENTS_DB`). El agente los acepta cuando su [`agentApi`](conventions/agent-bx.md#tokens-de-acceso-para-un-agente-desplegado) tiene `tokens: true`.

```bash
bxAgents token create --name=laptop [--scope=chat|admin] [--expires=90d]
bxAgents token list [--json]
bxAgents token revoke --name=laptop
```

- `create` imprime el token **una sola vez**, con cómo usarlo; solo se guarda un hash. `--name` es obligatorio (letras, dígitos, `.`, `-`, `_`). `--scope` es `chat` (hablar con el agente, por defecto) o `admin`. `--expires` es una duración (`90d`, `12h`, `30m`, `2w`) o una fecha; sin él, el token no caduca.
- `list` muestra el nombre, alcance, estado (`active`, `expired` o `revoked`), cuándo se creó, se usó por última vez y caduca de cada token. Nunca el token.
- `revoke` detiene un token al instante. El nombre sigue ocupado, así que no se reutiliza por accidente.
- Ejecútalo donde está la base de datos: en el servidor, o en el proyecto antes de empaquetarlo. En un servidor desplegado, apunta `BXAGENTS_DB` al archivo que usa la app.

### `notes`

Las notas que guarda un agente, leídas de la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (`data/chat.db`, o el archivo que indique `BXAGENTS_DB`). Los límites vienen del bloque [`notes`](conventions/agent-yaml.md#notas) de `Agent.yaml`.

```bash
bxAgents notes list [--scope=user|agent] [--user=NOMBRE] [--json]
bxAgents notes add --text="Prefiere respuestas cortas" [--scope=user|agent] [--user=NOMBRE]
bxAgents notes edit --id=<id> --text="Texto nuevo" [--scope=user|agent]
bxAgents notes remove --id=<id> [--scope=user|agent]
bxAgents notes stats [--user=NOMBRE] [--json]
bxAgents notes export [--file=notes.json]
bxAgents notes import --file=notes.json
```

- `--scope` es `user` (por defecto) o `agent`; `list` sin él muestra ambos. `--user` indica de quién son las notas de usuario: por defecto, el usuario del sistema operativo. Las notas del agente pertenecen al `name` del agente.
- `stats` muestra cuánto llena cada alcance y el tamaño aproximado que añaden al prompt (unos cuatro caracteres por token; una estimación, no un recuento).
- `export` escribe las notas como JSON, en `--file` o en pantalla. `import` añade las notas de un archivo así; una nota que ya existe se omite y una que no cabe en el límite se informa.
- Ejecútalo donde está la base de datos: en el proyecto, o en un servidor con `BXAGENTS_DB` definido.

### `inspect`

Un informe de cómo está compuesto el agente: los agentes y subagentes con sus modelos, herramientas, skills y servidores MCP, a través de qué se expone el proyecto, su programación y las variables de entorno que necesita. Lee el **código fuente** de tu proyecto, las mismas fases de descubrimiento, resolución y validación que ejecutan `build` y `doctor`, así que funciona antes de haber ejecutado `build` y no genera nada.

```bash
bxAgents inspect                        # el informe
bxAgents inspect --section=tools,env    # solo algunas secciones
bxAgents inspect --json                 # el informe completo como JSON, para scripts
bxAgents inspect --md                   # Markdown, para pegar en un pull request
bxAgents inspect --md=AGENT.md          # escribe el Markdown en un archivo del proyecto
bxAgents inspect --environment=production
```

```
● advanced-agent   Agent.bx · development
  /home/me/advanced-agent

  3 agents · 3 tools · 1 skill · 2 gateways

── Agents ──────────────────────────────────────────────────────────────────────
● advanced-agent  fast → mock/mock-model
  instructions: instructions.md · 2 tools · 1 skill · 2 subagents
├─● ResearchBot  mock/mock-model
│   instructions: instructions.md · 1 tool
└─● WriterBot  mock/mock-model
    instructions: instructions.md

── Tools ───────────────────────────────────────────────────────────────────────
  advanced-agent
    getStockQuote    Get the latest stock quote for a ticker …  tools/Finance.bx
    convertCurrency  Convert an amount from one currency to a…  tools/Finance.bx
```

El informe tiene estas secciones, en este orden. `--section` acepta cualquiera de los nombres de la primera columna, separados por comas.

| Sección | Muestra |
|---|---|
| `agents` | El agente raíz y sus subagentes como un árbol: modelo (el valor por defecto, o el perfil que usa y a qué resuelve), de dónde vienen las instrucciones, y un recuento de herramientas, skills y servidores MCP, además de la memoria y la protección contra inyección de prompts cuando están definidas. |
| `tools` | Por agente: cada función `@AITool` de `tools/` con su descripción y archivo, luego las herramientas de módulo que lista (`now@bxai`) y qué módulos tienen `toolOptions`. |
| `skills` | Las skills de cada agente. |
| `mcp` | Los servidores MCP que usa cada agente (las URLs se muestran sin usuario ni query string, y con las variables de entorno que necesitan) y los servidores MCP que aloja el proyecto. |
| `gateways` | Cada entrada de `gateways/`: su tipo (`agent`, `mcp`, `webui` con su modo de autenticación, o una plataforma de chat) y su ruta. |
| `schedule` | `schedules/Scheduler.bx` y los nombres de sus llamadas `task()`. |
| `ai` | El modelo por defecto, los otros proveedores, los [perfiles](conventions/models.md) con nombre con el origen de cada clave, y los valores por defecto de las capacidades. |
| `interceptors`, `modules`, `deploy` | Interceptores con su ámbito, módulos declarados y entradas de `deploy/` con su destino. |
| `env` | Cada variable de entorno que lee el proyecto: credenciales de gateways, tokens MCP, la API key de cada proveedor de modelos, `agentApi.tokenEnvVar`. |
| `checks` | Lo que `build` rechazaría. Los errores y avisos se listan aquí; `inspect` sigue saliendo con `0`, usa [`doctor`](#doctor) para un resultado de éxito o fallo. |
| `build` | Si existe `.build/manifest.json`, y su versión de manifest, generador y número de archivos. |

- Una sección sin contenido se omite. Nómbrala con `--section` y dice `none`.
- **Las variables de entorno se muestran por nombre, nunca por valor.** `▲` significa que la variable no está definida ahora mismo, `✔` que sí lo está; el texto siguiente dice dónde se usa. Es la misma comprobación que hace `doctor` con las variables de los gateways, ampliada a todo el proyecto.
- Un `Agent.bx` basado en clase cuyo modelo o instrucciones se definen en código aparece como `model set in code` o `instructions in code`; `inspect` lee lo declarado, no ejecuta el agente.
- El color solo se usa en una terminal interactiva. `NO_COLOR`, `TERM=dumb` y `--no-color` lo desactivan, un pipe o un archivo recibe texto plano, y `TERM=dumb` o `--ascii` también cambian los caracteres de dibujo de cajas por otros simples. Las líneas se ajustan a `COLUMNS` (80 si no está exportada).
- `--json` es el propio informe, no el manifest. El manifest es un archivo plano en `.build/manifest.json`, descrito en [El manifest](manifest.md).
- `--md=FILE` es lo único que `inspect` escribe. Un archivo relativo se crea dentro del proyecto.
- Una carpeta sin `Agent.yaml` ni `Agent.bx` es un error.

### `clean`

Elimina la salida `.build/` y `dist/` de un proyecto.

```bash
bxAgents clean [--force]
```

- Solo elimina `.build` y `dist` - las convenciones fuente (`Agent.yaml`, `tools/`, etc.) nunca se tocan.
- **Se niega a ejecutarse si el directorio no parece un proyecto BxAgents** (un `Agent.yaml`, un `Agent.bx` o un `.build/manifest.json`). `dist/` es un nombre de salida de build muy común en todo el ecosistema, así que esto evita que un `clean` en el directorio equivocado borre algo que no tiene relación. `--force` se salta la comprobación cuando de verdad lo quieres.
- Imprime la ruta absoluta de cada directorio antes de eliminarlo.
- Reporta "Nothing to clean" si ninguno de los directorios existe.

### `doctor`

![Salida de bxAgents doctor: versiones de BoxLang y bx-ai correctas, definición del agente encontrada, la estructura del proyecto valida limpiamente, y termina con 0 problemas y 0 avisos](assets/cli-doctor.svg)

Diagnostica el runtime y tu proyecto - solo lectura, nunca construye ni escribe nada.

```bash
bxAgents doctor [--json]
```

- Informa de la versión de BoxLang en ejecución, y avisa si es anterior al mínimo declarado por este módulo.
- Confirma que `bx-ai` está cargado (siempre es obligatorio).
- Ejecuta exactamente las mismas fases de descubrimiento/resolución/validación que `build`, sin generar nada - cada error o aviso de validación que encontraría `build` aparece aquí primero.
- Comprueba, contra el entorno real en este momento, cada valor de configuración con sufijo `*EnvVar` en `gateways/*` (tokens de bots, secretos de webhook, credenciales IMAP, contraseñas de cuentas de la interfaz web, claves de API) y avisa de los que no estén definidos. Nada más lo comprueba: `build` solo verifica que se *declaró* el nombre de una variable de entorno, nunca que esté realmente rellena, así que una variable ausente falla en silencio en tiempo de ejecución (un gateway que nunca envía, una cuenta de la interfaz web que no puede iniciar sesión).
- No comprueba `qb`, `cbsecurity`, `cbauth` ni `cbmailservices`: vienen dentro de BxAgents y se copian en cada app construida.
- `--json` imprime los hallazgos crudos como un array JSON (`[{ status, message }, ...]`) en lugar del informe legible - útil para scripting.
- Sale con `1` si falló alguna comprobación y con `0` en caso contrario - los avisos por sí solos no lo hacen fallar.
