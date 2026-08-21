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

Estos se manejan antes del despacho de verbos y nunca llegan a un verbo - solo son significativos como el primer token, así nunca colisionan con un flag del mismo nombre propio de un verbo.

| Flag | Efecto |
|---|---|
| `-h`, `--help`, `help` | Imprime el uso (cada verbo + descripción) y sale con 0. También se imprime (sale con 1) si no se da ningún verbo en absoluto. |
| `-v`, `--version` | Imprime `bxAgents v{version}` y sale con 0. |

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
:::

### `new`

Genera el andamiaje de un nuevo proyecto de agente.

```bash
bxAgents new my-agent --model=openai/gpt-5 [--name=...] [--description=...]
```

- `--model` es **requerido** - un slug `provider/model` (ver [Agent.bx](conventions/agent-bx.md)).
- `--name` por defecto toma el propio nombre base del directorio destino.
- Se niega a ejecutarse si el destino ya contiene un `Agent.bx`.
- Crea `Agent.bx`, `instructions.md`, cada carpeta de convención (vacía), una carpeta [`tests/`](conventions/testing.md) lista para ejecutar (`tests/box.json` + `tests/specs/AgentSpec.bx`), un `.env` que declara `BOXLANG_HOME=.build/runtime` (coincidiendo con el propio home de runtime delimitado que usa `serve` - ver [limitaciones conocidas](known-limitations.md) para exactamente qué cubre y qué no esto), y un `.gitignore` (`.build/`, `dist/`, `.env`). Nunca sobrescribe un `.env`/`.gitignore` existente.
- También ejecuta `box install` dentro de la nueva carpeta `tests/`, así que `bxAgents test` funciona de inmediato sin un paso separado de `cd tests && box install`. Esto es de mejor esfuerzo: si `box` no está en `PATH` o la instalación falla, `new` igual tiene éxito - el mensaje simplemente te indica ejecutarlo tú mismo. Pasa `--skipInstall` para omitir este paso por completo.

### `build`

Ejecuta el [pipeline de build](build-pipeline.md) completo.

```bash
bxAgents build [--environment=production] [--verbose]
```

Escribe `.build/app/` y `.build/manifest.json`. Falla con todos los errores de validación recopilados si el proyecto no es válido.

- `--verbose` imprime una línea por fase de build en vivo mientras se ejecuta - qué se resolvió/descubrió/validó, conteos por fase (modelos, tools, gateways, advertencias, etc.), qué agentes terminaron registrados en `config/WireBox.bx` y bajo qué nombres, si se encontró un `schedules/Scheduler.bx`, y una línea final de tiempo `Build completed in Xms`. Útil para depurar un build lento o con comportamiento inesperado. Silencioso en cualquier otro caso - `--verbose` no cuesta nada cuando no se pasa.

### `test`

Ejecuta los propios [`tests/specs`](conventions/testing.md) de tu proyecto vía TestBox.

```bash
bxAgents test
```

- Requiere `testbox` instalado bajo `tests/testbox` (`cd tests && box install`).
- Construye tu agente contra el proveedor `mock` por defecto (el override de entorno `test()` de `Agent.bx`) - no se necesita clave de API ni acceso a red.
- Imprime conteos de aprobados/fallidos/con error/omitidos más una línea por fallo, y sale con código distinto de cero si algo falló.

### `serve`

Lanza un proceso real de [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) apuntado a `.build/app`.

```bash
bxAgents serve [--port=8080] [--host=0.0.0.0]
```

- Requiere un `build` previo - falla claramente si `.build/app` no existe.
- Falla claramente si `boxlang-miniserver` no se encuentra en `PATH`.
- Escribe `.build/miniserver.json` (reescrituras habilitadas, `rewriteFileName: "index.bxm"`, health check activado) antes de lanzar.
- Delimita el propio home de runtime de BoxLang del servidor a `.build/runtime` (vía `serverHome`) en lugar del `~/.boxlang` compartido por defecto, así que la caché de clases compiladas y los overrides de configuración de cada proyecto están aislados - y `clean` lo elimina gratis, ya que de todos modos borra `.build` por completo. `invoke --server` también obtiene esto, ya que reutiliza `serve` internamente. Esto **no** se extiende a `chat`/`build`/`test`/`invoke` por defecto - ver [limitaciones conocidas](known-limitations.md).

### `chat`

REPL interactivo contra el agente construido, usando el propio `MiniConsole` de BoxLang para la lectura de líneas.

```bash
bxAgents chat
```

- Requiere un `build` previo.
- Carga `GeneratedAgentFactory.bx` directamente (sin ningún contenedor ColdBox/WireBox involucrado) y llama a `buildAgent()` una vez por sesión - exactamente la misma factory que usan las rutas HTTP de `serve`, así que `chat` y HTTP nunca divergen.
- Escribe `exit` o `quit` para salir.
- Necesita una TTY interactiva real (`MiniConsole` invoca `stty` para el modo raw) - no funcionará canalizado/no interactivo.

### `invoke`

Un solo turno no interactivo contra el agente construido: envía un mensaje, imprime la respuesta, sale. Existe para scripting/CI, donde el requisito de TTY de `chat` es un bloqueo absoluto.

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
bxAgents invoke --message="..." --server [--port=<port>]
```

- Requiere un `build` previo.
- **Por defecto (sin `--server`)**: carga `GeneratedAgentFactory.bx` directamente (sin contenedor ColdBox, sin HTTP) y llama al agente una vez - el mismo camino en proceso que usa `chat` internamente, solo sin el bucle del REPL. No hay ningún prerequisito de `serve`/gateway en absoluto.
- **`--server`**: lanza un proceso real y desechable de `boxlang-miniserver` (igual que `serve`), envía el mensaje como un request HTTP real a través de la ruta expuesta con `toAi()` del proyecto, luego apaga el servidor de nuevo. Ejerce el camino realmente servido (enrutamiento ColdBox, interceptores, gateways) en lugar del atajo en proceso. Requiere una entrada `gateways/*.bx` con `{ exposes: "agent", path: "..." }` (ver [gateways](conventions/gateways.md)) - falla claramente si ninguna existe. `--port` por defecto usa un puerto efímero libre para que nunca colisione con un `serve` ya en ejecución.
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
- `ftp`/`sftp` necesitan el módulo [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp) instalado junto a BX Agents (ver [Instalación](getting-started/installation.md)).

### `hash-password`

Convierte una contraseña en texto plano en el valor `passwordHash` que acepta el bloque [`users`](conventions/web-ui.md) de una entrada `webui`.

```bash
bxAgents hash-password --password="correct horse battery staple"
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
bxAgents clean
```

- Solo elimina `.build` y `dist` - las convenciones fuente (`Agent.bx`, `tools/`, etc.) nunca se tocan.
- Reporta "Nothing to clean" si ninguno de los directorios existe.
