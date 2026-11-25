---
title: Referencia de CLI
icon: phosphor-duotone:terminal-window
summary: Cada verbo de bxAgents y sus flags.
description: Cada verbo de bxAgents y sus flags.
tags: [reference, cli]
---

# Referencia de CLI

```text
Usage: boxlang module:bxAgents <verb> [options]
```

(o la forma más corta `bxAgents <verb> [options]` - ver [Instalación](getting-started/installation.md).)

## Flags globales

Estos se manejan antes del despacho de verbos y nunca llegan a un verbo.

| Flag | Efecto |
|---|---|
| `-h`, `--help`, `help` | Imprime el uso (cada verbo + descripción) y sale con 0. Se acepta en **cualquier** posición, así que `bxAgents clean --help` imprime el uso en lugar de ejecutar `clean`. También se imprime (sale con 1) si no se da ningún verbo en absoluto. |
| `-v`, `--version` | Imprime `bxAgents v{version}` y sale con 0. Solo es significativo como primer token, así que nunca colisiona con `package --version=1.0.0`. |

## Comillas en los valores de los flags

El script launcher `boxlang` de BoxLang 1.19.0 parte cada argumento por los espacios, así que `--description="Daily standup"` llega como `--description=Daily` (`--description "a b c"` y `"--description=a b c"` también). Las comillas simples, las barras invertidas y `%20` tampoco ayudan: no hay forma de teclear un valor con un espacio a través del comando `bxAgents` hasta que se arregle en BoxLang. Un mensaje partido así no se rechaza, se lee mal: `bxAgents invoke --message="Where is order 48213, and can I still return it?"` falla con `No build found at [.../is/.build]`, porque `is` se tomó por la carpeta del proyecto.

Dos formas de evitarlo:

- **Arranca el módulo con Java, que conserva las comillas.** Define esto una vez en tu shell y cada ejemplo de estas páginas que cita un valor con espacios funciona tal como está escrito (cambia la ruta por el jar del runtime de BoxLang, `boxlang-<versión>.jar`, en la carpeta `lib` de tu instalación de BoxLang):

  ```bash
  bxAgents() { java -cp /path/to/boxlang-1.19.0.jar ortus.boxlang.runtime.BoxRunner module:bxagents "$@"; }
  ```

  O ejecútalo en una línea: `java -cp /path/to/boxlang-1.19.0.jar ortus.boxlang.runtime.BoxRunner module:bxagents new my-agent --description="a b c"`.
- **Escribe el valor sin espacios** (`--description=Daily-standup`) y rellena el texto en el archivo generado después.

## El banner

En una terminal interactiva, `bxAgents --help` y el final del asistente de `new` te saludan con el nombre BxAgents en letras de bloque, pintado con un degradado elegido al azar entre ocho temas (Ocean, Fire, Sunset, Purple, Mint, Gray, Forest, Gold), la misma idea que el banner de la CLI de ColdBox. Nunca se escribe a un pipe ni a un archivo.

| Ajuste | Efecto |
|---|---|
| `NO_COLOR`, `--no-color` | La misma forma, sin color |
| `TERM=dumb`, una salida que no es UTF-8, o una terminal más estrecha que el arte (76 columnas) | Una línea simple en su lugar |
| `--no-banner`, o `BXAGENTS_BANNER=off` | Sin banner |
| `BXAGENTS_BANNER_THEME=Ocean` | Fija un tema en lugar de uno aleatorio, para una grabación que salga igual siempre |

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

```text
$ bxAgents new my-agent --model openai/gpt-5
Error: --model requires a value - write it as `--model=<value>`.
```

Usa siempre la forma `--flag=valor`. La forma con espacio no está soportada.

## Autocompletado con Tab

`completions/` contiene scripts de autocompletado listos para bash, fish y PowerShell. Consulta [Instalación](getting-started/installation.md#autocompletado-con-tab) para la configuración de cada uno en una línea.

## Verbos

Un ejemplo de abajo que cita un valor con espacios (`--description="..."`, `--message="..."`, `--when="..."`) necesita la forma Java de [Comillas en los valores de los flags](#comillas-en-los-valores-de-los-flags) cuando se ejecuta con el launcher `bxAgents`.

::: cards
::: card title="new" icon="phosphor-duotone:sparkle" href="#new"
Genera el andamiaje de un nuevo proyecto de agente.
:::
::: card title="add" icon="phosphor-duotone:plus-circle" href="#add"
Añade una herramienta, un interceptor, una programación, un servidor MCP, un gateway, un subagente, una skill, una extensión y más a un proyecto existente.
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
::: card title="models" icon="phosphor-duotone:cpu" href="#models"
Lista los modelos con los que puede hablar un proyecto y prueba que responden.
:::
::: card title="sessions" icon="phosphor-duotone:chats" href="#sessions"
Lista, renombra, bifurca y borra las conversaciones de la base de datos del chat.
:::
::: card title="stats" icon="phosphor-duotone:chart-bar" href="#stats"
Lo que usaron las llamadas al modelo: tokens por modelo, proveedor, día o usuario, una vez que el proyecto activa el uso.
:::
::: card title="vault" icon="phosphor-duotone:vault" href="#vault"
Los secretos que usa el agente, sellados en la base de datos del chat: list, add, edit, remove, status, audit.
:::
::: card title="connect" icon="phosphor-duotone:plugs-connected" href="#connect"
Inicia sesión en los servidores MCP que piden iniciar sesión a cada persona.
:::
::: card title="routines" icon="phosphor-duotone:clock-countdown" href="#routines"
Las rutinas programadas: list, add, edit, pause, run, informes y limpieza.
:::
::: card title="data" icon="phosphor-duotone:database" href="#data-backup-y-restore"
Dónde guarda todo el agente, cuánto ocupa cada parte y los volúmenes que puede usar.
:::
::: card title="logs" icon="phosphor-duotone:list-magnifying-glass" href="#logs"
Lista los logs del agente y muestra las últimas líneas de uno.
:::
::: card title="backup" icon="phosphor-duotone:archive" href="#data-backup-y-restore"
Comprime la base de datos del chat, los archivos y las skills del directorio de datos.
:::
::: card title="restore" icon="phosphor-duotone:clock-counter-clockwise" href="#data-backup-y-restore"
Devuelve una copia de seguridad; lo que había se conserva como before-restore.
:::
::: card title="inspect" icon="phosphor-duotone:magnifying-glass" href="#inspect"
Informa de cómo está compuesto el agente, a partir de su código fuente.
:::
::: card title="extensions" icon="phosphor-duotone:puzzle-piece" href="#extensions"
Lista las extensiones que carga el chat, e instala, actualiza, quita o enlaza más.
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

- Sin `--model`, sin `--repo` y sin `--forgebox`, en una terminal, `new` ejecuta el [asistente](guides/new-wizard.md). `--no-wizard` o `--yes` lo desactiva, `--wizard` lo activa incluso con un `--model`, y `--no-tui` hace las mismas preguntas como líneas numeradas. Un `--model` por sí solo nunca lo inicia, porque los scripts siempre han tenido que pasar uno. Las opciones del asistente (`--with`, `--search`, `--files`, `--files-dir`, `--temperature`, `--max-tokens`, `--timeout`, `--memory`, `--mcp`, `--channels`, `--web-auth`, `--guard`, `--deploy` y los detalles de despliegue) están en la [guía del asistente](guides/new-wizard.md#sin-el-asistente); un valor incorrecto nombra la opción y qué acepta. Necesitan `Agent.yml`, así que no se pueden combinar con `--class`.
- `--template`, `--repo` y `--forgebox` nombran tres FUENTES de proyecto distintas - se aplica exactamente una. Combinar dos de ellas es un error.
- **Modo `--template`** (el predeterminado cuando no se pasa ninguna opción de fuente - `minimal`):
  - `--model` es **requerido** cuando no se hacen preguntas - un slug `provider/model` (ver [el slug de modelo](conventions/agent-bx.md#the-model-slug)).
  - `--name` por defecto toma el propio nombre base del directorio destino.
  - Se niega a ejecutarse si el destino ya contiene un `Agent.yml` o un `Agent.bx`.
  - Crea [`Agent.yml`](conventions/agent-yaml.md), `instructions.md`, cada carpeta de convención (vacía), un [`box.json`](conventions/box-json.md) en la raíz (`testbox` como dependencia de desarrollo, instalada en `lib/testbox`), una carpeta [`tests/`](conventions/testing.md) lista para ejecutar (`tests/specs/AgentSpec.bx`), un `.env` (solo con comentarios para tus claves de API; a propósito no define `BOXLANG_HOME`), un `.gitignore` (`.env`, `.build/`, `dist/`, `lib/`, `boxlang_modules/`, archivos de editor) y los dotfiles estándar `.editorconfig`, `.gitattributes`, `.bxlint.json`, `.markdownlint.json` y un `.boxlang.json` con todos los ajustes de bx-ai en sus valores por defecto (el runtime de BoxLang lo lee al ejecutarse desde la raíz del proyecto; edita ahí los valores). Nunca sobrescribe un archivo que ya existe. BoxLang y `boxlang-miniserver` cargan por sí mismos un `.env` desde la raíz del proyecto, así que el archivo también sirve para tus claves de API; BxAgents nunca lo lee, lo copia ni lo empaqueta.
  - `--template` elige una de 8 plantillas incorporadas, cada una añadiendo un poco de contenido preconfigurado sobre el esqueleto base anterior (consulta [Plantillas de agente](agent-templates.md) para ver cada archivo generado, cómo funcionan las fuentes `--repo`/`--forgebox` y cómo publicar la tuya):
    - `minimal` - el esqueleto desnudo, nada más.
    - `webui-chat` - añade un `gateways/webui.bx` que expone la [UI de chat web](conventions/gateways/index.md) en `/chat`.
    - `slack-bot` - añade un adaptador de canal `gateways/slack.bx`, más las líneas de marcador de posición `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` correspondientes en `.env`.
    - `telegram-bot` - añade un adaptador de canal `gateways/telegram.bx`, más una línea de marcador de posición `TELEGRAM_BOT_TOKEN` correspondiente en `.env`.
    - `github-bot` - añade un adaptador de canal `gateways/github.bx`, más las líneas de marcador de posición `GITHUB_TOKEN`/`GITHUB_WEBHOOK_SECRET`/`GITHUB_BOT_NAME` correspondientes en `.env`.
    - `mcp-server` - añade un servidor de herramientas de ejemplo `mcp/exampleServer.bx` y una entrada `gateways/mcpExpose.bx` que lo expone como servidor MCP en `/mcp`.
    - `scheduled` - añade un [scheduler de `schedules/`](conventions/schedules.md) que llama al agente cada día.
    - `multi-agent` - añade una lista `subAgents` al `Agent.yml` raíz que declara dos [subagentes](conventions/subagents.md) (`researcher`, `writer`), cada uno generado como su propio `subagents/<name>/Agent.yml` + `instructions.md` reales.
  - `--class` (una opción booleana sin valor, como las demás descritas arriba) escribe el [`Agent.bx`](conventions/agent-bx.md) basado en clase en lugar del `Agent.yml` predeterminado, para agentes cuya definición necesita código (hooks, instrucciones dinámicas). Aplica a la raíz y a los subagentes que genere una plantilla, y solo al modo `--template` - no a `--repo`/`--forgebox`.
  - También ejecuta `box install` en la raíz del nuevo proyecto, así que `bxAgents test` funciona de inmediato sin un paso de instalación separado. Esto es de mejor esfuerzo: si `box` no está en `PATH` o la instalación falla, `new` igual tiene éxito - el mensaje simplemente te indica ejecutarlo tú mismo. Pasa `--skipInstall` para omitir este paso por completo.
- **Modo `--repo`** (`--repo=owner/repo-name` o una URL completa): clona el repositorio mediante una dependencia [JGit](https://www.eclipse.org/jgit/) incluida - no es necesario tener instalado el binario `git`. Siempre clona de forma superficial (profundidad 1) y siempre elimina la carpeta `.git` resultante después, de modo que el nuevo proyecto empieza con un historial limpio en lugar de quedar atado al propio remoto del repositorio plantilla. Se niega a ejecutarse en un directorio que ya existe y no está vacío, y falla claramente si no se encuentra ningún `Agent.yml` ni `Agent.bx` en el repositorio clonado.
- **Modo `--forgebox`** (`--forgebox=<slug>`): instala un paquete de [ForgeBox](https://www.forgebox.io) hablando directamente con la propia API REST de ForgeBox (no requiere el CLI `box`). Falla claramente si el slug no existe, la descarga falla, o el paquete instalado no tiene un `Agent.yml` ni un `Agent.bx` en su raíz (desenvolviendo primero un nivel de anidamiento, ya que muchos archivos de ForgeBox envuelven su contenido en una única carpeta de nivel superior).
- Solo el modo `--template` necesita `--model`; `--repo`/`--forgebox` nunca lo requieren, ya que el proyecto fuente ya define el suyo propio.
- `--name`/`--description` se ignoran (con una advertencia en la salida) cuando se usa `--repo`/`--forgebox` - el proyecto clonado/instalado define el suyo propio.
- El paso de conveniencia `box install` (y `--skipInstall`) solo aplican al modo `--template` - el propio `box.json` de un proyecto clonado/instalado (si es que tiene uno) se deja intacto.

### `add`

Añade una cosa a un proyecto que ya existe, haciendo las mismas preguntas que `new`. Hoy eso es una `tool`, un `interceptor`, una `schedule`, un servidor `mcp`, un `gateway`, un `subagent`, una `skill`, un `profile`, un `provider`, una `capability` o una `extension`.

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

Añade un [scheduler](conventions/schedules.md) a `schedules/` que envía un mensaje al agente según una programación. Se preguntan tres cosas: cuándo se ejecuta, qué le dice al agente y qué agente. Las ejecuciones solapadas siempre se evitan (`.withNoOverlaps()`). Cada programación es su propio archivo, `schedules/<Name>.bx`, así que añadir una nunca edita otra.

```bash
bxAgents add schedule --when="weekdays 08:30" --prompt="Summarize yesterday's findings"
bxAgents add schedule digest --when="0 9 * * 1-5" --prompt="Check for new tickets" --agent=researcher
bxAgents add schedule                          # pregunta cada cuánto, los detalles, un nombre y qué decir
```

| Flag | Significado |
|---|---|
| `--when=<phrase or cron>` | Cuándo se ejecuta: una de las frases de abajo, o una expresión cron. En una terminal, omítelo y se te pregunta cada cuánto y luego los detalles. |
| `--prompt=<text>` | El mensaje que se envía al agente cada vez. |
| `--name=<name>` | El nombre de la tarea, o el segundo posicional. También nombra el archivo: `daily-digest` escribe `schedules/DailyDigest.bx`. Por defecto, un nombre hecho a partir de la frase. Se rechaza un nombre de tarea ya usado en `schedules/`. |
| `--agent=<subagent>` | Qué agente la ejecuta. Solo se pregunta si el proyecto tiene subagentes; `.` (el valor por defecto) es el agente raíz, al que el archivo llama con `run()`. Otro agente se llama con `agent( "name" ).run()` por su `name` declarado, así que renombrar el agente obliga a editar el archivo. |

| Frase | Se ejecuta | Se escribe como |
|---|---|---|
| `every 15 minutes`, `every 2 hours`, `every 1 days` | En ese intervalo | `.every( 15, "minutes" )`, `.every( 2, "hours" )`, `.every( 1, "days" )` |
| `hourly`, `hourly :15` | Cada hora, en punto o en ese minuto | `.everyHour()`, `.everyHourAt( 15 )` |
| `daily 09:00` | Cada día a esa hora | `.everyDayAt( "09:00" )` |
| `weekdays 08:30`, `weekends 10:00` | De lunes a viernes, o sábado y domingo | `.onWeekdays( "08:30" )`, `.onWeekends( "10:00" )` |
| `weekly mon 09:00` | Una vez por semana (`mon` `tue` `wed` `thu` `fri` `sat` `sun`) | `.everyWeekOn( 1, "09:00" )` |
| `monthly 1 09:00` | Una vez al mes ese día, de 1 a 28 para que ningún mes se la salte | `.everyMonthOn( 1, "09:00" )` |
| `first-business-day 09:00`, `last-business-day 17:00` | Ese día laborable de cada mes | `.onFirstBusinessDayOfTheMonth( "09:00" )` |
| `0 9 * * 1-5`, `0 30 8 * * MON-FRI` | Cualquier expresión cron: cinco campos, o seis con los segundos delante | `.cron( "..." )` con seis campos (a una de cinco se le añade un `0` delante), comprobada por el propio parser de BoxLang. Solo la forma de seis campos se dispara en BoxLang 1.19.0 |

Las horas son `HH:mm` en formato de 24 horas, en la zona horaria del scheduler.

Una frase nunca se escribe como un `.cron()` de cinco campos: en BoxLang 1.19.0 no se dispara (ver [Cron](conventions/schedules.md#cron)).

- Un archivo existente con el mismo nombre es un conflicto y no se escribe nada; `--force` lo reemplaza.
- Los schedulers se ejecutan mientras la app se sirve (`bxAgents serve`). Comprueba el resultado con `bxAgents inspect --section=schedule`.

#### `add mcp`

Añade un servidor MCP en cualquiera de las dos direcciones: uno al que el agente **llama** (se escribe en `Agent.yml`), o uno que el proyecto **aloja** (`mcp/<name>.bx`).

```bash
bxAgents add mcp client github                 # un servidor del catálogo que usa el asistente de new
bxAgents add mcp client --url=https://mcp.acme.dev/mcp --name=acme --auth=bearer --env=ACME_TOKEN
bxAgents add mcp server tools --description="My tools"
bxAgents add mcp                                # pregunta en qué dirección
```

**`add mcp client`** añade una entrada a la lista `mcpServers:` del agente. Un nombre del catálogo (`github`, `stripe`, `notion`, `atlassian`, `cloudflare`, `supabase`, `git`) rellena la dirección y el inicio de sesión, o, para un servidor que se ejecuta como programa en esta máquina (`git`), el `command` para iniciarlo y lo que necesita en el PATH; si no, indica `--url`.

| Flag | Significado |
|---|---|
| `--server=<name>` | Un servidor del catálogo por nombre, en lugar del posicional. |
| `--url=<address>` | Un servidor que no está en el catálogo. Se rechaza una dirección con usuario, contraseña o clave: el secreto va en una variable de entorno. |
| `--name=<label>` | Una etiqueta para `Agent.yml`; no se envía al servidor. |
| `--auth=none\|bearer\|header\|basic` | Cómo inicia sesión. `bearer` escribe `token`, `header` escribe `headers` (nómbralo con `--header=`), `basic` escribe `user` (con `--user=`) y `password`. |
| `--env=<NAME>` | La variable de entorno que guarda la clave o contraseña. En `Agent.yml` solo va el nombre, como `${env.NAME}`; se añade un `NAME=` vacío a `.env` para que lo rellenes. |
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

- `Agent.yml` se edita solo insertando líneas, así que sus comentarios y su formato se quedan como están. Si la lista no se puede ampliar así (escrita en una línea, por ejemplo), o la definición es un `Agent.bx` basado en clase, no se cambia nada y el error incluye la entrada para pegarla.
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
| `--name=<name>` | El archivo, `gateways/<name>.bx`, o el segundo posicional. Por defecto, el tipo, así que `add gateway web` escribe `gateways/web.bx`, mientras que el asistente y la plantilla `webui-chat` escriben `gateways/webui.bx`. El nombre del archivo da igual: lo que dice qué es es el valor `exposes` de dentro. Se rechaza un nombre en uso. |
| `--env=<config=NAME,...>` | Plataformas de chat: qué variable guarda cada credencial, por ejemplo `botTokenEnvVar=ACME_BOT`. Sin él se usan los nombres habituales (`SLACK_BOT_TOKEN`, ...). En el archivo del gateway solo van los nombres; en `.env` se añade un marcador vacío para cada uno. |
| `--policy=queue\|reject\|steer\|interrupt` | Plataformas de chat: qué hacer con un mensaje que llega mientras el agente sigue respondiendo. Se escribe en el `gatewaySession` de Agent.yml salvo que sea el valor por defecto, `queue`. |
| `--path=<path>` | `web` y `api`: dónde se sirve (`/chat` y `/api/chat` por defecto). Se rechaza una ruta que otro gateway use. |
| `--profiles=a,b` | `web`: los perfiles del proyecto que se pueden elegir en el chat (ver [Elegir el modelo](conventions/web-ui.md#elegir-el-modelo)). Solo se pregunta cuando el proyecto tiene perfiles; ninguno mantiene la página en el modelo propio del agente. |
| `--auth=open\|key\|users` | `web`: cualquiera que pueda alcanzarlo, una clave compartida aleatoria guardada en `.env` como `CHAT_UI_API_KEY`, o usuarios con nombre. |
| `--users=<name:hash,...>` | `web` con `users`: cada hash sale de `bxAgents hash-password`. Una contraseña nunca se acepta como flag; en una terminal la escribes, oculta, y solo se guarda su hash. |

Tras añadir una plataforma de chat, la salida lista los pasos que ocurren fuera del proyecto (crear el bot, una dirección pública, un daemon) y qué variables de `.env` rellenar; `bxAgents doctor` informa de las que sigan sin definir. La ruta de la API HTTP no tiene autenticación salvo que se defina `agentApi.tokenEnvVar` en `Agent.yml`.

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
| `--model=<provider/model>` | Obligatorio sin terminal, salvo que se dé `--profile`. |
| `--profile=<nombre>` | Usa uno de los [perfiles](conventions/models.md#perfiles) del proyecto en lugar de un modelo, como puede hacer el agente principal con `profile:`. En una terminal, a un proyecto que tiene perfiles se le pregunta cuál usar. |
| `--description`, `--with`, `--search`, `--files`, `--files-dir`, `--memory`, `--mcp`, `--guard` | Los mismos que en [`new`](#new). |

Escribe `subagents/<name>/Agent.yml` (con el modelo simulado de `environments.test`, para que `bxAgents test` no necesite clave) e `instructions.md`, y añade un marcador vacío en `.env` por cada clave que necesiten las opciones. El nombre se inserta en el `subAgents` del padre sin reescribir el archivo, así que los comentarios y el orden se conservan. Si el padre es una clase, o su lista está escrita de una forma que no se puede ampliar insertando, no se cambia nada en él y se imprime la línea que hay que añadir. Los paquetes que necesite una opción (`bx-playwright` para navegar) se nombran para que los añadas a `box.json`.

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

#### `add provider`

Añade los ajustes con los que empieza cada llamada a un proveedor, bajo `providers:` en el `Agent.yml` raíz (el ajuste `providers` de bx-ai): la temperatura, la respuesta más larga y el tiempo límite, sea cual sea el modelo o el perfil.

```bash
bxAgents add provider openai --temperature=0.2 --timeout=60
bxAgents add provider                           # pregunta
```

| Opción | Significado |
|---|---|
| `--provider=<id>`, o el primer posicional | Un proveedor que bx-ai conoce. Uno que ya tiene ajustes se rechaza. |
| `--temperature`, `--max-tokens`, `--timeout` | Hace falta al menos una. Se escriben como `params` (`temperature`, `max_tokens`) y `options` (`timeout`). |

Nunca se pide la clave del proveedor: su variable habitual (`OPENAI_API_KEY`) recibe un marcador vacío en `.env`. La entrada se inserta sin reescribir el archivo, así que los comentarios y el orden se mantienen. Necesita un `Agent.yml` en la raíz.

#### `add profile`

Añade una combinación con nombre de proveedor, modelo, ajustes y variable de la clave bajo `profiles:` en el `Agent.yml` raíz (el ajuste `profiles` de bx-ai). Un agente la elige con `profile: <nombre>`, y `defaultProfile` nombra la que usa la aplicación al arrancar.

```bash
bxAgents add profile fast --provider=openai --model=gpt-5-mini --temperature=0.2 --default
bxAgents add profile planner --provider=claude --model=claude-opus-4 --description="Thinks first"
bxAgents add profile                            # pregunta
```

| Opción | Significado |
|---|---|
| `--name=<nombre>`, o el primer posicional | Letras, dígitos, `-` y `_`, empezando por una letra. Se rechazan `default`, el nombre de un proveedor y un nombre ya usado. |
| `--description=<texto>` | Para qué sirve. |
| `--provider=<id>`, `--model=<modelo>` | El proveedor y un modelo suyo. Sin modelo se usa el predeterminado del proveedor. |
| `--api-key-env=<NOMBRE>` | Otra variable de entorno para su clave, cuando dos perfiles de un proveedor necesitan claves distintas. Solo se escribe el nombre. |
| `--temperature`, `--max-tokens`, `--timeout` | Igual que en [`add provider`](#add-provider). |
| `--default` | También define `defaultProfile`. Un `defaultProfile` existente nunca se cambia: se imprime la línea que hay que editar. |

Añade un marcador `.env` vacío para la variable de la clave. Comprueba el resultado con `bxAgents inspect --section=ai`.

#### `add capability`

Define el proveedor y el modelo por defecto para algo que no es chat, en el `Agent.yml` raíz con los nombres propios de bx-ai. Un solo comando para las cuatro; solo hace las preguntas que esa capacidad tiene.

```bash
bxAgents add capability embeddings --provider=openai --model=text-embedding-3-small
bxAgents add capability speech --provider=openai --voice=alloy --format=mp3
bxAgents add capability                         # pregunta cuál
```

| Capacidad | Claves que escribe |
|---|---|
| `embeddings` | `provider`, `model` |
| `speech` | `provider`, `model`, `voice`, `format` |
| `transcription` | `provider`, `model` |
| `image` | `provider`, `model`, `size`, `quality`, `style`, `instructions` |

Todas las claves salvo el proveedor son opcionales; si faltan, se aplica el valor del propio proveedor. bx-ai mantiene voz y transcripción en un solo proveedor de audio, así que la segunda de las dos toma por defecto el proveedor de la primera y uno distinto se rechaza. Una capacidad que ya está definida se rechaza: edítala en el archivo. La variable de la clave del proveedor recibe un marcador vacío en `.env`; la clave en sí nunca se pide.

#### `add extension`

Crea una extensión propia en `extensions/`: un archivo para unos pocos métodos, o una carpeta cuando lleva un scheduler, gateway, tool, skill o archivos web. Ver [Empezar una](conventions/extensions.md#empezar-una).

```bash
bxAgents add extension standup
bxAgents add extension standup --with=command,key --description="Standup diario"
bxAgents add extension standup --with=command,scheduler        # una carpeta, con schedulers/Standup.bx
```

| Flag | Significado |
|---|---|
| `--with` | Qué trae, separado por comas: `command`, `key`, `status`, `prefix`, `source`, `slot`, `verb`, `listener`, `scheduler`, `gateway`, `tool`, `skill`, `web`. Por defecto `command`. |
| `--layout` | `file` o `folder`. Una carpeta es la única opción si `--with` incluye `scheduler`, `gateway`, `tool`, `skill` o `web`. |
| `--description` | Una línea para el docblock de la clase. |

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

Escribe `.build/` (`app/`, `public/`, `lib/`, `runtime/`, `boxlang_modules/` y `miniserver.json`, ver [qué hay en `.build`](build-pipeline.md#qué-hay-en-build-y-qué-se-sirve)) y `.build/manifest.json`. Falla con todos los errores de validación recopilados si el proyecto no es válido.

- `--verbose` imprime una línea por fase de build en vivo mientras se ejecuta - qué se resolvió/descubrió/validó, conteos por fase (modelos, tools, gateways, advertencias, etc.), qué agentes terminaron registrados en `config/WireBox.bx` y bajo qué nombres, si se encontró un `schedules/Scheduler.bx`, y una línea final de tiempo `Build completed in Xms`. Útil para depurar un build lento o con comportamiento inesperado. Silencioso en cualquier otro caso - `--verbose` no cuesta nada cuando no se pasa.
- `--generatorVersion` sobrescribe la cadena grabada en `generator.version` de `manifest.json` (ver [El manifest](manifest.md)) - por defecto `"dev"` cuando se omite. Existe para herramientas que construyen contra una versión publicada específica de este módulo y quieren que eso quede registrado en el manifest, en lugar del valor por defecto de desarrollo local.

### `test`

Ejecuta los propios [`tests/specs`](conventions/testing.md) de tu proyecto vía TestBox.

```bash
bxAgents test
```

- Requiere TestBox instalado en `lib/testbox` (`box install` en la raíz del proyecto; también se encuentra `tests/testbox`).
- Construye tu agente contra el proveedor `mock` por defecto (el override de entorno `test` de `Agent.yml`, o `test()` en un `Agent.bx` basado en clase) - no se necesita clave de API ni acceso a red.
- Imprime conteos de aprobados/fallidos/con error/omitidos más una línea por fallo, y sale con código distinto de cero si algo falló.

### `serve`

Lanza un proceso real de [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) que sirve `.build/public`.

```bash
bxAgents serve [--port=8080] [--host=127.0.0.1]
```

- Requiere un `build` previo - falla claramente si `.build/app` no existe, o si el build no tiene `public/` (se hizo antes de la estructura app/public: construye de nuevo).
- Falla claramente si `boxlang-miniserver` no se encuentra en `PATH`.
- La dirección raíz también responde: `/` redirige (302) a la interfaz web cuando el proyecto tiene una, y si no devuelve un pequeño JSON que apunta a la ruta `health` de la API (en `agentApi.path`), o un 404 simple si la API está apagada. No nombra nada del agente.
- Sirve siempre el agente en `/__bxagents` (`POST /invoke`, `POST /stream`, `POST /batch`, `GET /info`), declare lo que declare el proyecto en [`gateways/`](conventions/gateways/index.md) - consulta [La ruta de agente siempre activa](conventions/agent-bx.md#la-ruta-de-agente-siempre-activa) para exigir un token en ella, o desactivarla.
- **Escucha en `127.0.0.1` por defecto.** Una app generada no tiene autenticación salvo que la configures (la clave de API y el inicio de sesión de la interfaz web son ambos opcionales), así que el valor por defecto mantiene un servidor de desarrollo fuera de la red. Pasa `--host=0.0.0.0` para escuchar en todas las interfaces de forma deliberada - la línea de arranque te dice cuál de las dos obtuviste.
- `--port` debe ser un entero entre 1 y 65535; cualquier otra cosa falla de inmediato en lugar de dentro del proceso del servidor.
- Escribe `.build/miniserver.json` antes de lanzar: `webRoot: public`, `configPath: runtime/boxlang.json` (la configuración de motor de la plantilla ColdBox BoxLang, con la compresión de espacios en blanco apagada), `serverHome: runtime`, reescrituras a `index.bxm`, health check y un predicado que solo deja ejecutar `index.bxm`. Todas las rutas son relativas a `.build`, y el servidor se arranca **en `.build`** con `BOXLANG_HOME=.build/runtime`.
- Sirve **solo `.build/public`**: el código de la app, su configuración (`agent-settings.json`, `Agent.yml`, instrucciones) y las librerías no están bajo la raíz web, así que no se pueden descargar; una dirección desconocida es un `404` JSON.
- Carga **solo el módulo `bxagents`** (con los módulos BoxLang empaquetados dentro, y los `boxlang_modules/` del propio proyecto): el módulo se copia a `.build/runtime/modules` con el nombre de su carpeta instalada (`bx-agents` con `bx-module install`) y `runtime/` es el home de BoxLang, así que los módulos instalados en tu máquina nunca se cargan en la app servida. `chat --server` e `invoke --server` lo reciben también. `test` ejecuta su proceso hijo con su propio home en `.build/test-runtime`, cargando también solo el módulo `bxagents`.
- Un proyecto (o una app desempaquetada) bajo una ruta con un **espacio** no arranca: el script de `boxlang-miniserver` no entrecomilla `BOXLANG_HOME`.
- **El `.env` generado no define `BOXLANG_HOME`.** Cada proyecto recibe su propio home de runtime cuando bxAgents lo sirve o lo ejecuta, así un proyecto sigue funcionando con `boxlang module:bxagents ...` desde su propia raíz: el launcher `boxlang` lee el `.env` del proyecto, y un `BOXLANG_HOME` relativo ahí lo apunta a una carpeta vacía. `build`, `doctor`, `inspect`, el `chat` en proceso y el `invoke` por defecto corren dentro del proceso de bxAgents que iniciaste, y un home de runtime no puede cambiar a mitad de proceso, así que usan tu propio home. Guardan el estado por proyecto solo en el `.build/` del proyecto y en el home de datos; la caché de clases compiladas de BoxLang en tu home se nombra con la ruta completa de cada archivo fuente, así que dos proyectos no se pisan. `bxAgents doctor` avisa cuando el `.env` de un proyecto antiguo aún tiene una línea `BOXLANG_HOME` relativa; bórrala.

### `chat`

Un chat con el agente construido, en una pantalla de terminal que conserva tu historial: los turnos terminados se imprimen como texto normal de la terminal (selecciónalos, búscalos y desplázate como siempre) y solo se redibujan el cuadro de mensaje y la respuesta que se está escribiendo. `--no-tui` (y cualquier terminal no interactiva) usa un REPL simple línea por línea, basado en el `MiniConsole` de BoxLang.

```bash
bxAgents chat                                  # rápido, en el mismo proceso
bxAgents chat --no-tui                         # REPL simple línea por línea
bxAgents chat --server [--port=<puerto>]       # aplicación completa, servidor propio desechable
bxAgents chat --connect=http://127.0.0.1:8080  # aplicación completa, servidor que ya tienes en marcha
bxAgents chat --connect=https://agent.example.com --token=<token>   # un servidor que pide uno
bxAgents chat --connect=https://agent.example.com --api-path=/agent-api   # un servidor que sirve su API en otra ruta (agentApi.path)
bxAgents chat --user=alice                     # de quién son las notas y conversaciones (por defecto: `local`, el único usuario de un servidor abierto)
bxAgents chat --continue                       # abre la conversación más reciente, con su historial
bxAgents chat --session=2                      # abre una por su número en /sessions, o por id
```

En la pantalla:

| Tecla | Hace |
|---|---|
| Enter | Envía el mensaje |
| Shift+Enter, Ctrl+J, o `\` y luego Enter | Nueva línea en el mensaje |
| Arriba / Abajo | Mensajes anteriores (desde la primera o última línea del cuadro) |
| Esc | Detiene al agente. Se detiene en su siguiente paso, no a mitad de palabra |
| Enter mientras el agente trabaja | Lo dirige: tu mensaje se añade a la ejecución |
| Ctrl+C | Limpia el cuadro; con el cuadro vacío, sale. Ctrl+D también sale |
| `?` solo, o `/keys` | Lista las teclas como están asignadas ahora, con el nombre de acción de cada una |

Escribe `/` para ver los comandos: `/help`, `/new` (una conversación nueva), `/tools`, `/copy` (la última respuesta al portapapeles, con la secuencia OSC 52 que honran la mayoría de terminales), `/export [archivo]` (la conversación en Markdown o HTML), `/name` y `/fork` (ver abajo), `/keys` (qué tecla hace qué), `/sessions`, `/resume`, `/clear`, `/compact` e `/info` (ver abajo), `/model`, `/profile` y `/default` (ver abajo), `/remember <texto>` y `/notes` (ver abajo), `/record [archivo]` y `/record stop` (ver abajo) y `/exit`.

#### Los mismos comandos en la página web y en las gateways

Cada comando con barra se escribe una sola vez, como una clase pequeña que responde con datos (texto, una tabla, una lista para elegir), y la terminal, la página web y las plataformas de chat dibujan esa respuesta a su manera. Así `/help`, `/new`, `/tools`, `/sessions`, `/resume`, `/clear`, `/compact`, `/model`, `/info`, `/remember` y `/notes` funcionan en las tres:

| Dónde | Cómo se usan |
|---|---|
| Chat en la terminal | Escribe `/`, como arriba |
| [Página web](conventions/web-ui.md#comandos-con-barra) | Escribe `/` (o pulsa el botón del rayo): aparece un menú con los comandos y `Tab` completa uno |
| [Plataformas de chat](conventions/gateways/index.md#comandos-en-un-gateway) (Telegram, Slack, ...) | Escribe el comando como un mensaje. Hay un conjunto seguro activado por defecto; un proyecto puede ampliarlo o apagarlo |
| Un servidor por HTTP | `GET /__bxagents/commands` y `POST /__bxagents/command`, ver [Control de ejecuciones](conventions/agent-bx.md#control-de-ejecucion) |

El tamaño del contexto también está siempre a la vista: la fila de ayuda bajo la caja de mensaje empieza con `ctx ~12.4k / 128k 9%` (solo `ctx ~12.4k` cuando el proyecto no indica la ventana), y se actualiza antes de cada prompt, es decir, tras cada mensaje, `/clear`, `/compact`, `/resume` y cualquier cambio en tus notas. La página web muestra lo mismo en la barra sobre la conversación; pulsa el anillo para ver el desglose. Las cifras son estimaciones, caracteres divididos entre cuatro (lo que hace `aiTokens()` de bx-ai), útiles para ver qué parte es grande y no para una factura exacta. Las herramientas de los servidores MCP se obtienen al empezar una ejecución y no se cuentan.

`/name`, `/fork` y `/export` funcionan en la terminal y en la página web (donde `/export` entrega el archivo al navegador para guardarlo, y la página tiene los botones **Fork** y **Export**). `/copy`, `/record`, `/profile`, `/default` y `/exit` actúan sobre tu propia máquina o sobre el modelo de tu propia sesión, así que se quedan en la terminal.

#### Conversaciones en el chat

Cada chat es una conversación, listada en la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (el `chat.db` de la carpeta de datos del agente) bajo tu usuario, la misma lista que muestra el chat web. Los mensajes se guardan en la [memoria](conventions/agent-yaml.md#ajustes) del agente, así que una conversación solo se puede retomar mientras dure esa memoria: la memoria `cache` por defecto se pierde al terminar el proceso, una memoria `file` o `jdbc` no.

| Comando | Hace |
|---|---|
| `/sessions` | Lista tus conversaciones recientes, numeradas |
| `/resume [número o id]` | Vuelve a una y muestra lo que se dijo; sin argumento, la más reciente |
| `/new` | Empieza una conversación nueva (la anterior sigue en la lista) |
| `/name <nuevo nombre>` | Pone nombre a esta conversación; una conversación en la que nadie ha hablado aún obtiene su entrada en la lista |
| `/fork [nuevo nombre]` | Copia esta conversación entera, mensajes incluidos, con un nombre nuevo y sigue en la copia; la original queda como estaba. Sin nombre, la copia se llama `Fork of <esta>` |
| `/export [archivo] [--format=md\|html]` | Guarda la conversación como Markdown o como una página HTML. El nombre del archivo decide el formato (`.html` o `.htm` es HTML, cualquier otro Markdown) salvo que `--format` diga otra cosa; sin nombre, el archivo lleva la fecha, en la carpeta donde empezaste. El HTML muestra el Markdown ya renderizado, tablas incluidas, y escapa todo lo que escribiste para que no se ejecute al abrir el archivo |
| `/clear` | Olvida los mensajes de esta conversación y conserva la conversación |
| `/compact` | Sustituye los mensajes más antiguos por un resumen (requiere un modelo de resumen en la memoria del agente) |
| `/info` | Agente, modelo, conversación, número de mensajes, notas y base de datos |
| `/context` | Cuánto ocupa el contexto ahora mismo y de qué se compone: el prompt del sistema, las definiciones de herramientas, las notas y los mensajes de esta conversación, cada uno con su tamaño, el total, y la parte de la ventana de contexto del modelo cuando el proyecto [la indica](conventions/models.md#lo-que-el-proyecto-sabe-de-un-modelo). Nombra las herramientas más grandes. Se calcula en local; no se llama a ningún modelo |
| `/stats` | Lo que usaron las llamadas al modelo: `/stats` para los últimos 30 días por modelo, `/stats 7 --by=day` para otro periodo o agrupación. Solo en la terminal. Cuando no se registra el uso, explica cómo activarlo, y `/stats enable` escribe `usage: true` en `Agent.yml` por ti (recompila para que surta efecto) |

`--continue` abre la conversación más reciente al iniciar el chat, y `--session=<número o id>` abre una concreta. Ambos muestran primero los mensajes anteriores. Con `--connect` el servidor guarda la lista y los mensajes, con el nombre de tu [token](conventions/agent-bx.md#tokens-de-acceso-para-un-agente-desplegado); un servidor sin base de datos de chat dice que no guarda lista.

#### Modelos en el chat

El chat puede cambiar el modelo con el que habla sin perder la conversación: la memoria, las herramientas, los subagentes y las instrucciones se mantienen, solo se sustituye el modelo. Lista los [perfiles](conventions/models.md#perfiles) del proyecto.

| Comando | Hace |
|---|---|
| `/model` | Muestra el modelo en uso (`proveedor/modelo`), su perfil y, cuando el proyecto lo dice, su ventana de contexto y si puede ver imágenes |
| `/ping [perfil]` | Prueba que el modelo responde, con una pregunta diminuta: dice cuánto tardó, o por qué no respondió (sin clave, un nombre de modelo equivocado, el servicio inaccesible). El resultado se conserva 30 segundos, así que repetirlo no es otra petición |
| `/profile` | Elige un perfil de una lista: su proveedor y modelo, su descripción, cuál es el predeterminado y cuál está en uso |
| `/profile <nombre>` | Cambia directamente a uno. Un perfil cuyo proveedor no tiene clave definida se activa con un aviso, porque el siguiente mensaje fallaría |
| `/default` | Vuelve al valor por defecto de la app: el `defaultProfile`, o si no el proveedor y modelo del principio de `Agent.yml` |

Un chat con `--connect` o `--server` solo puede cambiar entre los perfiles que el servidor lista en [`agentApi.profiles`](conventions/agent-bx.md#agentapi) (`GET /__bxagents/profiles`), enviados como `options.profile` con cada mensaje; un servidor que no lista ninguno lo dice y no cambia nada. No hay `/provider`: un perfil ya nombra su proveedor, y los ajustes propios de los proveedores están en `Agent.yml` (consulta [`add provider`](#add-provider)).

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

#### Ejecutar cosas en tu máquina desde el chat

Dos prefijos en la caja de mensaje ejecutan algo en **tu propia máquina**, nunca en un servidor, incluso cuando el chat habla con uno por `--connect`:

| Escribe | Hace |
|---|---|
| `!comando` | Ejecuta un comando de shell (`sh -c`, o `cmd /c` en Windows) en la carpeta donde empezaste. Su salida (salida estándar y error juntas, cortada a 20.000 caracteres, detenida a los 60 segundos) se muestra y **acompaña a tu siguiente mensaje**, para que el agente vea lo que viste tú |
| `!!comando` | Lo mismo, solo en pantalla |
| `#funcion( argumentos )` | Llama a una función integrada de BoxLang, como `#dateFormat( now(), 'yyyy-MM-dd' )` o `#listLen( 'a,b,c' )`. El resultado se muestra (un struct o array como JSON) y acompaña al siguiente mensaje |
| `##funcion( argumentos )` | Lo mismo, solo en pantalla |

Tras `!` debe venir el comando de inmediato (`! hola` es un mensaje) y tras `#` una llamada (`# Un título` y `#hashtag` son mensajes). Una llamada es **solo** una llamada: como argumento, una cadena (`'..'` o `".."`), un número, `true`, `false`, `null`, un array, un struct o una llamada anidada, posicional o con nombre, y nada más. No hay variables, operadores, acceso con `.` ni sentencias, y un nombre que no sea una función integrada registrada se rechaza antes de ejecutar nada. Lo que espera al siguiente mensaje aparece en `/context` (como *Attached*) y en la barra de estado, y desaparece al enviar el mensaje.

Puedes apagar o acotar ambos en un archivo que es tuyo y no de ningún proyecto, `~/.bxagents/Agent.yml` (`BXAGENTS_USER_CONFIG` indica otro archivo):

```yaml
chat:
  shell: true        # false apaga !; o el shell a usar: "bash -c", "pwsh -Command"
  bifs: true         # false apaga #; o las funciones permitidas: [ dateFormat, listLen ]
  keys:              # cambia las teclas de una acción; una tecla o una lista. /keys muestra los nombres de acción
    newline: [ ctrl+n, shift+enter ]
    stop: ctrl+x
  prefixes: { desk:explain: "?%" }   # el prefijo de un prefix de una extensión, por id (extensión:método)
  sources: { desk:ticket: issue }    # el nombre del source @nombre:consulta de una extensión, por id
extensions:                          # valores para extensiones, y qué desactivar
  disable: [ roll ]
```

Si el archivo no existe, ambos están activados. Una clave que el archivo no conoce, o un valor de tipo equivocado, se informa al iniciar el chat en lugar de ignorarse.

Las teclas se escriben como se dicen: `enter`, `alt+enter`, `shift+enter`, `ctrl+j`, `esc`, `tab`, `up`, `down`, `home`, `end`, o una letra con `ctrl` o `alt`. Acciones que puedes cambiar: `submit`, `newline`, `historyPrevious`, `historyNext`, `clear`, `exit`, `deleteToStart`, `deleteWord`, `lineStart`, `lineEnd`, `complete`, `pasteImage` (en el cuadro de mensaje) y `stop` (mientras el agente trabaja). Mover el cursor con las flechas, Retroceso y Suprimir no son acciones. Una entrada que no nombra una acción, no se puede leer como tecla, o toma una tecla que otra acción del mismo lugar ya tiene, se avisa al iniciar el chat y esa acción conserva sus teclas por defecto, así que un error de escritura nunca te deja sin forma de enviar un mensaje. El encabezado y la fila de ayuda muestran tus teclas.

#### Archivos e imágenes en el mensaje

| Escribe | Hace |
|---|---|
| `@` | Abre una lista de los archivos bajo la carpeta donde empezaste (hasta cinco niveles; se omiten las carpetas ocultas, `node_modules`, `build`, `dist`, `target`, `out`, `venv`). Sigue escribiendo para filtrar, Arriba y Abajo para moverte, Tab o Enter para elegir uno |
| `@ruta/al/archivo` | Un archivo de texto en el mensaje: su contenido va con el mensaje, en su propio bloque, cortado a 100.000 caracteres. Un nombre que no es un archivo se avisa y queda como texto; el mensaje se envía igualmente |
| `@imagen.png` | Una imagen (png, jpg, gif, webp), enviada como parte de imagen del mensaje |
| Ctrl+Shift+V | Pega una imagen del portapapeles (necesita `wl-paste` o `xclip` en Linux, `pngpaste` en macOS; Windows usa PowerShell). Una ficha en la fila de ayuda muestra cuántas esperan |

Con un mensaje van como máximo 4 imágenes, de hasta 5 MB cada una. Antes de enviar nada, el chat comprueba que el perfil puede ver: pon `vision: true` en un [perfil](conventions/models.md#lo-que-el-proyecto-sabe-de-un-modelo) que pueda, y una imagen enviada a uno que no puede se rechaza con un mensaje en lugar de un error oscuro del proveedor. `/context` cuenta lo adjunto. La imagen llega al modelo como partes de imagen de `AiMessage` de bx-ai, con la forma que ese proveedor espera; por ahora solo se han probado proveedores de estilo OpenAI.

Con `--connect`, los archivos y las imágenes viajan en `attachments` de la petición a `/__bxagents/events`, ver [Control de ejecución](conventions/agent-bx.md#run-control). Las plataformas de chat aún no aceptan adjuntos.

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
- `local`/`ssh`/`ftp`/`sftp` requieren un `package` previo; `docker`/`digitalocean` requieren un `build` previo (construyen directamente desde `.build`; la receta de Docker está [sin verificar](conventions/deploy.md#docker)).
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

Los tokens de acceso de un agente desplegado, guardados en la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (el `chat.db` de la carpeta de datos del agente, o el archivo que indique `BXAGENTS_DB`). El agente los acepta cuando su [`agentApi`](conventions/agent-bx.md#tokens-de-acceso-para-un-agente-desplegado) tiene `tokens: true`.

```bash
bxAgents token create --name=laptop [--scope=chat|admin] [--expires=90d]
bxAgents token list [--json]
bxAgents token revoke --name=laptop
```

- `create` imprime el token **una sola vez**, con cómo usarlo; solo se guarda un hash. `--name` es obligatorio (letras, dígitos, `.`, `-`, `_`). `--scope` es `chat` (hablar con el agente, por defecto) o `admin`. `--expires` es una duración (`90d`, `12h`, `30m`, `2w`) o una fecha; sin él, el token no caduca.
- `list` muestra el nombre, alcance, estado (`active`, `expired` o `revoked`), cuándo se creó, se usó por última vez y caduca de cada token. Nunca el token.
- `revoke` detiene un token al instante. El nombre sigue ocupado, así que no se reutiliza por accidente.
- Ejecútalo donde está la base de datos: en el servidor, o en el proyecto antes de empaquetarlo. En un servidor desplegado, apunta `BXAGENTS_DB` al archivo que usa la app.

### `users`

Las cuentas de inicio de sesión de la página web, tal como las guarda la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto, y cuál de ellas es admin.

```bash
bxAgents users list [--json]
bxAgents users admin --name=ada
bxAgents users member --name=ada
```

- `list` muestra el nombre de usuario de cada cuenta, su rol (`admin` o `member`), si está activa y su nombre visible. Nunca una contraseña.
- `admin` convierte una cuenta en admin; `member` vuelve a hacer normal a un admin. El último admin no puede degradarse.
- La lista en sí viene de los `users` del gateway web en cada arranque. Este verbo solo cambia la marca de admin, que la base de datos conserva desde entonces. Consulta [Administradores y miembros](conventions/web-ui.md#usuarios-e-inicio-de-sesión).
- Ejecútalo donde está la base de datos, como [`token`](#token).

### `notes`

Las notas que guarda un agente, leídas de la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (el `chat.db` de la carpeta de datos del agente, o el archivo que indique `BXAGENTS_DB`). Los límites vienen del bloque [`notes`](conventions/agent-yaml.md#notas) de `Agent.yml`.

```bash
bxAgents notes list [--scope=user|agent] [--user=NOMBRE] [--json]
bxAgents notes add --text="Prefiere respuestas cortas" [--scope=user|agent] [--user=NOMBRE]
bxAgents notes edit --id=<id> --text="Texto nuevo" [--scope=user|agent]
bxAgents notes remove --id=<id> [--scope=user|agent]
bxAgents notes stats [--user=NOMBRE] [--json]
bxAgents notes export [--file=notes.json]
bxAgents notes import --file=notes.json
```

- `--scope` es `user` (por defecto) o `agent`; `list` sin él muestra ambos. `--user` indica de quién son las notas de usuario: por defecto `local`, el único usuario de un servidor abierto. Las notas del agente pertenecen al `name` del agente.
- `stats` muestra cuánto llena cada alcance y el tamaño aproximado que añaden al prompt (unos cuatro caracteres por token; una estimación, no un recuento).
- `export` escribe las notas como JSON, en `--file` o en pantalla. `import` añade las notas de un archivo así; una nota que ya existe se omite y una que no cabe en el límite se informa.
- Ejecútalo donde está la base de datos: en el proyecto, o en un servidor con `BXAGENTS_DB` definido.

### `models`

Los modelos de un proyecto compilado, y si responden.

```bash
bxAgents models list [--json]
bxAgents models test [--profile=NOMBRE | --all] [--json]
```

```text
default       openai/gpt-5                    context 128,000  images yes  key set
fast          openai/gpt-5-mini               context 400,000  images no  key set
planner       claude/claude-opus-4            context ?  images ?  key MISSING
```

- `list` muestra el modelo por defecto y cada [perfil](conventions/models.md#perfiles), con lo que el proyecto dice de cada uno ([`contextWindow` y `vision`](conventions/models.md#lo-que-el-proyecto-sabe-de-un-modelo), `?` cuando no dice nada) y si la clave del perfil está definida.
- `test` envía a cada modelo una pregunta diminuta a través de bx-ai e informa `ok` con el tiempo, o `FAILED` con el mensaje del propio proveedor. Prueba el modelo por defecto, un perfil con `--profile`, o todos con `--all`, y sale con `1` cuando alguno no responde, así que puede usarse como puerta antes de desplegar. Gasta unos pocos tokens por modelo.
- Usa los modelos con los que se compiló el proyecto por última vez: ejecuta antes `bxAgents build`.

### `vault`

Los secretos que usa un agente en tiempo de ejecución, sellados en la [base de datos de chat compartida](conventions/web-ui.md#el-almacén-sqlite) del proyecto (el `chat.db` de la carpeta de datos del agente, o el archivo que nombre `BXAGENTS_DB`). Consulta [la vault](conventions/vault.md).

```bash
bxAgents vault list [--scope=agent|user|all] [--user=NAME] [--json]
bxAgents vault add --name=GMAIL_TOKEN [--user=NAME] [--description=TEXT] [--hosts=a.com,*.b.com] [--stdin]
bxAgents vault edit --name=GMAIL_TOKEN [--user=NAME] [--description=TEXT] [--hosts=...] [--value] [--stdin]
bxAgents vault remove --name=GMAIL_TOKEN [--user=NAME] [--yes]
bxAgents vault status [--json]
bxAgents vault audit [--limit=N] [--json]
bxAgents vault key
```

- Un valor **nunca es un flag**. `add` y `edit` lo piden oculto en una terminal, o lo leen de una tubería con `--stdin` (`op read ... | bxAgents vault add --name=X --stdin`). Nada de esto imprime un valor, y uno no se puede mostrar otra vez tras guardarlo.
- Sin `--user` un secreto es del agente (compartido). Con `--user=NAME` es propio de esa persona.
- `edit` cambia solo lo que se indica; `--value` (o `--stdin`) sustituye el valor.
- `status` dice de dónde viene la clave y avisa cuando es el archivo de clave junto a la base de datos. `audit` lista quién añadió, usó, fue rechazado y quitó qué, sin valores.
- `key` imprime una clave aleatoria nueva para poner en `BXAGENTS_VAULT_KEY`. No toca la base de datos.

### `data`, `backup` y `restore`

Dónde guarda todo el agente, y copias de seguridad de ello. Consulta [datos y volúmenes](conventions/data.md).

```bash
bxAgents data [--json]
bxAgents backup [--to=FILE]
bxAgents restore FILE [--home=DIR] [--force]
```

- `data` imprime el directorio de datos y de dónde salió, el tamaño de la base de datos y de cada carpeta, y los volúmenes con sus modos. No crea nada.
- `backup` comprime la base de datos del chat (copiada entera, así que es segura mientras corre un servidor), `files/` y `skills/`. Sin `--to` el zip va a la carpeta `backups/` del directorio. Los volúmenes no se incluyen.
- `restore` devuelve una copia y conserva lo que había como `<name>.before-restore`. Se detiene cuando la base de datos parece estar en uso salvo que des `--force`. `--home` restaura en otro directorio de datos.

### `connect`

Inicia sesión en los servicios de un proyecto que piden iniciar sesión a cada persona (una entrada de `mcpServers` con una clave `oauth`). Consulta [connect](conventions/connect.md).

```bash
bxAgents connect
bxAgents connect mail [--port=8765] [--no-open] [--timeout=300]
bxAgents connect mail --remove
bxAgents connect [--user=NAME] [--json]
```

- Sin nombre lista los servicios y si estás conectado (`--json` para un script).
- Con un nombre imprime una dirección y abre tu navegador, espera la redirección en `127.0.0.1` (un puerto libre, o `--port`) y termina el inicio de sesión. `--no-open` solo imprime. `--timeout` son los segundos de espera, 300 por defecto.
- `--remove` olvida tu inicio de sesión. `--user` indica de quién: `local` por defecto, el único usuario de un servidor abierto.
- Los tokens se sellan en la base de datos del chat del proyecto. Ejecútalo donde está la base de datos: en el proyecto, o en un servidor con `BXAGENTS_DB` definido.

### `logs`

Los logs del agente, guardados en la carpeta `logs/` del [directorio de datos](conventions/data.md). Consulta [logs](conventions/logs.md).

```bash
bxAgents logs [area] [--tail=N] [--level=warn] [--grep=TEXT] [--json]
bxAgents logs <area> --follow [--tail=N] [--level=warn] [--grep=TEXT]
bxAgents logs --ui [area]
bxAgents logs [area] [--follow | --ui] --connect=URL [--token=TOKEN] [--api-path=/donde]
```

- Sin área lista los logs y su tamaño. Las áreas son `agent`, `gateways`, `routines`, `heartbeat` y `api`.
- Con una imprime las últimas líneas: `--tail` es cuántas (100 por defecto, hasta 1000), `--level` el nivel menos grave a mostrar y `--grep` una palabra que debe contener la línea.
- `--follow` imprime las últimas líneas (20 salvo que `--tail` diga otra cosa) y luego cada línea nueva al escribirse, con los mismos filtros, hasta Ctrl+C. Se vacía línea a línea, así que se puede encadenar (`bxAgents logs gateways --follow | grep slack`), y avisa cuando el archivo rota.
- `--ui` abre un visor a pantalla completa: una pestaña por log (Izquierda y Derecha, o Tab), `l` para el nivel (todos, warn, error), `/` para buscar (Enter lo guarda, Esc lo descarta), las flechas, Re Pág, Av Pág e Inicio para desplazarse (la vista se queda quieta mientras llegan líneas) y Fin para volver a seguir las más nuevas, `q` para salir. Sin terminal (una tubería, CI) sigue el log en su lugar.
- `--connect` lee un agente servido por su [API](guides/agent-api.md) en vez de los archivos de este proyecto: `GET /logs`, y `GET /logs/stream` para `--follow`. Necesita un token de admin (`--token`, o `BXAGENTS_TOKEN`), y `--api-path` cuando el agente sirve su API en otra ruta. Con `--ui` lee el log de nuevo cada 2 segundos.
- En el chat del terminal, `/logs` lista los logs y `/logs <área> [--tail=N] [--level=warn] [--grep=texto]` imprime las últimas líneas (30 salvo que `--tail` diga otra cosa); con `--connect` necesita un token de admin.
- En la app web, un admin tiene los mismos logs en la [página Logs](conventions/web-ui.md#logs), con un interruptor **Live** que sigue las líneas nuevas.
- Los secretos nunca están en un log, ni lo que dijo una persona.

### `routines`

Las [rutinas](conventions/routines.md) programadas de un proyecto, como operador local (alcance admin, así que `--all` lista las de todos los propietarios). Trabaja sobre la base de datos del chat y el directorio de datos del proyecto, y necesita `routines.enabled: true`.

```bash
bxAgents routines list [--all] [--json]
bxAgents routines show <name>
bxAgents routines add --name=<name> --schedule="0 9 * * 1-5" --prompt="..." [--destination=routine|gateway:<name>] [--chat=<id>]
bxAgents routines edit <name> [--schedule=...] [--prompt=...] [--destination=...] [--chat=...]
bxAgents routines pause|resume|run <name>
bxAgents routines delete <name> --yes
bxAgents routines reports <name>
bxAgents routines report <name> <file>
bxAgents routines clean <name> [--older-than=30d | --all] [--yes]
```

- Una planificación son cinco campos cron o `every 30m`. `list` la muestra en palabras y la próxima ejecución.
- `run` marca una rutina como pendiente. Empieza en el siguiente minuto de una app servida, y el comando lo dice.
- `delete` pide `--yes` y conserva los informes de la rutina. `clean` solo lista lo que quitaría salvo que añadas `--yes`.

### `sessions`

Las conversaciones de la [base de datos de chat compartida](conventions/web-ui.md#el-almacen-sqlite) del proyecto (el `chat.db` de la carpeta de datos del agente, o el archivo indicado por `BXAGENTS_DB`), la misma lista que muestran `chat` y la página web.

```bash
bxAgents sessions list [--user=NOMBRE] [--json]
bxAgents sessions rename --session=<número o id> --name="Nuevo nombre" [--user=NOMBRE]
bxAgents sessions fork --session=<número o id> [--name="Otro enfoque"] [--user=NOMBRE]
bxAgents sessions delete --session=<número o id> [--user=NOMBRE]
bxAgents sessions export --session=<número o id> [--file=chat.json] [--md] [--force] [--user=NOMBRE]
bxAgents sessions import --file=chat.json [--name="Nuevo nombre"] [--user=NOMBRE]
```

- Una conversación se elige por su número en `list`, o por su id o el comienzo de él. `--user` es de quién son las conversaciones: `local` por defecto, el único usuario de un servidor abierto.
- `list`, `rename` y la parte de lista de `delete` solo tocan la base de datos. Los mensajes de una conversación viven en la [memoria](conventions/agent-yaml.md#ajustes) del agente, así que `fork` (que los copia) necesita un proyecto compilado, y `delete` también para olvidarlos. Solo alcanzan los mensajes que guarda una memoria que sobrevive al proceso (`file`, `jdbc`): la memoria `cache` por defecto desaparece al terminar el chat.
- Ejecútalo donde está la base de datos: en el proyecto, o en un servidor con `BXAGENTS_DB` definido.
- `export` escribe una conversación en un archivo JSON con el nombre de su título (`--file` para elegirlo, `--md` para una transcripción legible en Markdown) y nunca reemplaza un archivo salvo que añadas `--force`. El archivo contiene los datos de la conversación y sus mensajes tal como los guarda la memoria del agente. Incluye todo lo que se dijo, así que guárdalo donde guardarías la conversación.
- `import` lee ese archivo y lo añade a la lista del usuario como una conversación **nueva** (con un id nuevo, sin reemplazar ninguna), con `--name` para cambiarle el título. Un archivo que no reconoce se rechaza antes de escribir nada: debe ser una conversación exportada de una versión que este BxAgents lee, con como máximo 20.000 mensajes cuyos roles sean `user`, `assistant`, `system` o `tool`. Si se exportó desde otro agente, el mensaje lo indica.
- Ambos leen y escriben la memoria del agente, así que necesitan un proyecto compilado y una memoria que sobreviva al proceso (`file` o `jdbc`; consulta el ajuste [memory](conventions/agent-yaml.md#ajustes)). Con `cache` la memoria está vacía cuando el programa se ha detenido, y `export` lo dice.

### `stats`

Lo que usaron las llamadas al modelo del proyecto, a partir del registro que guarda la app en la [base de datos de chat compartida](conventions/web-ui.md#el-almacen-sqlite) (el `chat.db` de la carpeta de datos del agente, o el archivo indicado por `BXAGENTS_DB`).

```bash
bxAgents stats [--days=30] [--by=model|provider|day|user] [--user=NOMBRE] [--json]
bxAgents stats --enable
```

```text
Last 30 days: 128 calls, 412,300 tokens (351,200 in, 61,100 out)

By model              calls          in         out       total
gpt-5                    90     280,000      45,000     325,000
gpt-5-mini               38      71,200      16,100      87,300

Counts only the calls whose provider reported usage.
```

- **Está desactivado salvo que lo actives.** Añade `usage: true` al `Agent.yml` propio del proyecto (consulta [`usage`](conventions/agent-yaml.md#ajustes)) y recompila. Hasta entonces `stats` explica cómo activarlo, y `--enable` escribe esa línea por ti y te recuerda ejecutar `bxAgents build` y reiniciar un servidor en marcha.
- Solo se guardan **recuentos**: la hora, quién preguntó, el proveedor, el modelo y los tokens de entrada y de salida. No se guarda nada de lo que se dijo, y nada sale de tu base de datos.
- Una llamada cuenta cuando su proveedor informa del uso. El proveedor `mock` y algunas llamadas en streaming no lo hacen, así que no dejan fila, y los totales son los de las llamadas que sí.
- `--by` agrupa las filas por modelo (por defecto), proveedor, día o usuario, con las mayores primero (las más recientes primero en `day`). `--days` es cuánto mirar atrás, contando hoy (de 1 a 3650). `--user` limita a las llamadas de un usuario. `--json` imprime el informe para un script.
- Solo lee la base de datos, así que no necesita compilación. Ejecútalo donde está la base de datos: en el proyecto, o en un servidor con `BXAGENTS_DB` definido.
- No calcula el coste. Los precios cambian demasiado para llevar una tabla.

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

```text
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
| `schedule` | Cada scheduler de `schedules/*.bx` con sus tareas: nombre, cron (o el método de frecuencia) y el agente que ejecuta (`default` para el agente raíz). |
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
- Una carpeta sin `Agent.yml` ni `Agent.bx` es un error.

### `extensions`

Lista las [extensiones](conventions/extensions.md) que cargaría el chat de terminal para este proyecto: el `extensions/` del proyecto, tu propio `~/.bxagents/extensions/` y el `extensions/` de los módulos instalados. Las carga como lo hace `chat`, así que una extensión que falla al cargar aparece aquí con el motivo. No necesita un proyecto compilado.

```bash
bxAgents extensions [--json]
```

- Una línea por extensión: su nombre, de qué capa viene, si cargó, y luego los comandos y schedulers que añadió y cualquier problema.
- `--json` imprime `{ extensions, problems }` para scripts.

Los subcomandos install, list, update y remove se describen en [Instalar extensiones](conventions/extensions.md#instalar-extensiones), y link y unlink en [Trabajar en una](conventions/extensions.md#trabajar-en-una-enlazarla):

```bash
bxAgents extensions install <origen> [--name=<nombre>] [--force] [--yes] [--system]
bxAgents extensions install                    # restaurar desde extensions.lock.json
bxAgents extensions list [--installed] [--json]
bxAgents extensions update [nombre...] [--yes]
bxAgents extensions remove <nombre> [--force] [--system]
bxAgents extensions link <carpeta-o-.bx> [--name=<nombre>] [--force]   # para ti, en ~/.bxagents/extensions
bxAgents extensions unlink <nombre>
```

### `clean`

Elimina la salida `.build/` y `dist/` de un proyecto.

```bash
bxAgents clean [--force]
```

- Solo elimina `.build` y `dist` - las convenciones fuente (`Agent.yml`, `tools/`, etc.) nunca se tocan.
- **Se niega a ejecutarse si el directorio no parece un proyecto BxAgents** (un `Agent.yml`, un `Agent.bx` o un `.build/manifest.json`). `dist/` es un nombre de salida de build muy común en todo el ecosistema, así que esto evita que un `clean` en el directorio equivocado borre algo que no tiene relación. `--force` se salta la comprobación cuando de verdad lo quieres.
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
- Comprueba la variable de la clave de cada proveedor que usan los modelos: el modelo por defecto, cada subagente, cada [perfil](conventions/models.md#perfiles) (su `apiKeyEnv`, o si no la variable habitual del proveedor, como `OPENAI_API_KEY`) y cada valor por defecto de capacidad. Una clave que no está definida en el entorno es un aviso que nombra quién la necesita. Doctor nunca lee el `.env` del proyecto, así que una clave que solo está ahí se informa como no definida aunque funcione al servir la app. `mock` no necesita clave, y `bxAgents test` ejecuta todos los perfiles con `mock`.
- No comprueba `qb`, `cbsecurity`, `cbauth` ni `cbmailservices`: vienen dentro de BxAgents y se copian en cada app construida.
- `--json` imprime los hallazgos crudos como un array JSON (`[{ status, message }, ...]`) en lugar del informe legible - útil para scripting.
- Sale con `1` si falló alguna comprobación y con `0` en caso contrario - los avisos por sí solos no lo hacen fallar.
