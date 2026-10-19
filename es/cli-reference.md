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
::: card title="inspect" icon="phosphor-duotone:magnifying-glass" href="#inspect"
Imprime de forma legible un manifest.json existente.
:::
::: card title="clean" icon="phosphor-duotone:broom" href="#clean"
Elimina la salida .build/ y dist/ de un proyecto.
:::
::: card title="doctor" icon="phosphor-duotone:stethoscope" href="#doctor"
Diagnostica el runtime y el proyecto antes de que build o serve te sorprendan.
:::
:::

### `new`

Crea un nuevo proyecto de agente de una de tres formas mutuamente excluyentes: generar el andamiaje desde una plantilla incorporada, clonar un repositorio de GitHub, o instalar un paquete de ForgeBox.

```bash
# Generar el andamiaje desde una plantilla incorporada (por defecto: minimal)
bxAgents new my-agent --model=openai/gpt-5 [--template=minimal|webui-chat|slack-bot|telegram-bot|github-bot|mcp-server|scheduled|multi-agent] [--name=...] [--description=...] [--class] [--skipInstall]

# Clonar un repositorio de GitHub existente
bxAgents new my-agent --repo=owner/repo-name

# Instalar un paquete de ForgeBox
bxAgents new my-agent --forgebox=some-package-slug
```

- `--template`, `--repo` y `--forgebox` nombran tres FUENTES de proyecto distintas - se aplica exactamente una. Combinar dos de ellas es un error.
- **Modo `--template`** (el predeterminado cuando no se pasa ninguna opción de fuente - `minimal`):
  - `--model` es **requerido** - un slug `provider/model` (ver [el slug de modelo](conventions/agent-bx.md#the-model-slug)).
  - `--name` por defecto toma el propio nombre base del directorio destino.
  - Se niega a ejecutarse si el destino ya contiene un `Agent.yaml` o un `Agent.bx`.
  - Crea [`Agent.yaml`](conventions/agent-yaml.md), `instructions.md`, cada carpeta de convención (vacía), un [`box.json`](conventions/box-json.md) en la raíz (`testbox` como dependencia de desarrollo, instalada en `lib/testbox`), una carpeta [`tests/`](conventions/testing.md) lista para ejecutar (`tests/specs/AgentSpec.bx`), un `.env` que declara `BOXLANG_HOME=.build/runtime` (coincidiendo con el propio home de runtime delimitado que usa `serve`), y un `.gitignore` (`.build/`, `dist/`, `.env`, `lib/`, `boxlang_modules/`). Nunca sobrescribe un `.env`/`.gitignore` existente. BoxLang y `boxlang-miniserver` cargan por sí mismos un `.env` desde la raíz del proyecto, así que el archivo también sirve para tus claves de API; BxAgents nunca lo lee, lo copia ni lo empaqueta.
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

REPL interactivo contra el agente construido, usando el propio `MiniConsole` de BoxLang para la lectura de líneas.

```bash
bxAgents chat                                  # rápido, en el mismo proceso
bxAgents chat --server [--port=<puerto>]       # aplicación completa, servidor propio desechable
bxAgents chat --connect=http://127.0.0.1:8080  # aplicación completa, servidor que ya tienes en marcha
```

Tres modos, un solo REPL:

| Modo | Con qué habla | Cuándo usarlo |
|---|---|---|
| por defecto | La factory de agentes generada, cargada directamente en este proceso | Solo quieres hablar con el agente. Lo más rápido, sin servidor. |
| `--server` | Un `boxlang-miniserver` desechable que arranca y detiene | Necesitas la semántica real de la aplicación - `models/`, interceptores, el scheduler, los gateways. |
| `--connect=<url>` | Un servidor que ya está en marcha | Tienes un `serve` abierto en otra terminal, o quieres hablar con un despliegue. |

- Requiere un `build` previo - salvo con `--connect`, que habla con un servidor que mantiene otra persona y por tanto no necesita nada construido localmente.
- **Por defecto**: carga `GeneratedAgentFactory.bx` directamente (sin ningún contenedor ColdBox/WireBox involucrado) y llama a `buildAgent()` una vez por sesión - exactamente la misma factory que usan las rutas HTTP de `serve`, así que el agente en sí nunca diverge. Lo que **sí** cambia es todo lo que aporta ColdBox: sin `models/`, sin scheduler, sin interceptores, sin registro de gateways. Cuando eso importa, usa `--server`.
- **`--server`**: arranca un miniserver real (necesita `boxlang-miniserver` en `PATH`, igual que `serve`) en un puerto efímero de loopback y conduce el REPL sobre HTTP contra la [ruta de agente `/__bxagents` siempre activa](conventions/agent-bx.md#la-ruta-de-agente-siempre-activa) del proyecto, y lo apaga al salir. `--port` fija el puerto en lugar de tomar uno libre.
- **`--connect`**: conduce el mismo REPL contra un servidor en marcha, sin arrancar ni detener nada. La URL es la raíz del servidor (`http://host:puerto`), no la ruta del agente - `chat` la añade por su cuenta.
- `--server` y `--connect` son mutuamente excluyentes: uno dice "arráncame un servidor", el otro "no lo hagas". Pasar ambos falla de inmediato en lugar de honrar uno en silencio.
- Ambos modos HTTP hacen **streaming** de la respuesta: la contestación aparece token a token a medida que el agente la produce, por la subruta `/stream` (SSE) de la ruta, en vez de llegar de golpe al terminar el turno. Si el stream no se puede abrir (un servidor antiguo sin subruta `/stream`, o un proxy que no deja pasar `text/event-stream`) recurre a `/invoke` y obtienes la respuesta completa al final en lugar de un error.
- Ambos modos HTTP arrastran el `threadId` del servidor entre turnos, así que una sesión es una sola conversación y no una serie de primeros mensajes inconexos.
- Un turno que se detiene a esperar una decisión [humana en el bucle](conventions/gateways/index.md) lo indica en lugar de aparentar que responde con silencio, y señala el endpoint `/gateways/interactions/` donde se envía la decisión.
- Si la ruta está protegida tras [`agentApi.tokenEnvVar`](conventions/agent-bx.md#agentapi), estos modos reciben un `401` claro en lugar de un timeout confuso - no envían ningún token.
- Escribe `exit` o `quit` para salir.
- Necesita una TTY interactiva real (`MiniConsole` invoca `stty` para el modo raw) - no funcionará canalizado/no interactivo. Usa [`invoke`](#invoke) para scripting.

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

### `inspect`

Imprime de forma legible un `.build/manifest.json` existente sin reconstruir.

```bash
bxAgents inspect [--json]
```

- Requiere un `build` previo.
- Imprime nombre del agente, modelo, entorno, versión del manifest, nombre/versión del generador, y conteo de archivos.
- `--json` imprime el manifest crudo como JSON en lugar del resumen legible para humanos - útil para scripting.

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
