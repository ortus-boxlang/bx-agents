---
title: Agent.yaml
icon: phosphor-duotone:file-text
summary: "La forma predeterminada de definir un agente - ajustes sencillos en un archivo YAML, sin código."
description: "La forma predeterminada de definir un agente - ajustes sencillos en un archivo YAML, sin código."
tags: [conventions, configuration]
---

# Agent.yaml

`Agent.yaml` es la forma predeterminada de definir un agente. Es un archivo YAML sencillo - un nombre, un modelo y cualquiera de los ajustes opcionales de abajo - y el build lo convierte en un agente en ejecución. La mayoría de los agentes no necesitan más que este archivo y un [`instructions.md`](#instrucciones) a su lado.

```yaml
name: support
description: Answers customer questions about orders
model: openai/gpt-5

environments:
  test:
    model: mock/mock-model
```

`bxAgents new` genera el andamiaje exactamente con esta forma. Cuando la definición necesita código real (hooks, instrucciones dinámicas, tools registradas en código), usa la opción avanzada: un [`Agent.bx`](agent-bx.md) basado en clase, que se genera con `bxAgents new --class`.

!!! info
    Una carpeta contiene **una** definición de agente. Un `Agent.yaml` (o `Agent.yml`) junto con un `Agent.bx` en la misma carpeta es un error - dos definiciones de un mismo agente dejarían ambiguo qué ajustes ganan - y `build` falla y nombra ambos archivos para que conserves uno. Esto aplica a la raíz del proyecto y a cada carpeta de [subagente](subagents.md), y un proyecto puede mezclar los dos: una raíz YAML con un subagente basado en clase, o al revés.

## Ajustes

| Clave | Tipo | Notas |
|---|---|---|
| `name` | string | También se convierte en la clave de binding de `config/WireBox.bx` de este agente en tiempo de build, así que debe ser única en todo el proyecto (raíz + cada subagente). |
| `model` | string | Un slug `provider/model`, un nombre de proveedor sin más, o un nombre de modelo cuando se fija `provider`. Ver [El slug del modelo](agent-bx.md#the-model-slug) y [Modelos y perfiles](models.md). |
| `provider` | string | El proveedor por defecto, un nombre de proveedor de bx-ai. Con `model` como nombre de modelo sin más. Ver [Modelos y perfiles](models.md). |
| `params` | mapping | Parámetros de petición por defecto, como `temperature`. |
| `options` | mapping | Opciones del proveedor por defecto, como `timeout`. |
| `providers` | mapping | `params` y `options` por proveedor, por nombre de proveedor. |
| `profiles` | mapping | Combinaciones con nombre de proveedor, modelo, params, options y `apiKeyEnv`, y opcionalmente `contextWindow` y `vision`. |
| `contextWindow`, `vision` | número, booleano | Lo que puede contener el modelo por defecto (tokens) y si puede ver imágenes. Datos opcionales para el chat; bx-ai no los lee. Ver [Modelos](models.md#lo-que-el-proyecto-sabe-de-un-modelo). |
| `defaultProfile` | string | El perfil que se usa cuando nada pide otro. |
| `profile` | string | El perfil que usa este agente. |
| `embeddings`, `speech`, `transcription`, `image` | mapping | Valores por defecto de capacidades de bx-ai: `provider`, `model` y algunos ajustes cada uno. |
| `description` | string | Opcional. |
| `instructions` | string | Instrucciones en línea, opcionales. Ver [Instrucciones](#instrucciones). |
| `tools` | lista de strings | Tools de módulos que recibe este agente, como `item@module` o `*@module`. Ver [Tools](#tools). |
| `toolOptions` | mapping | Opciones de las tools de un módulo, con el nombre del módulo como clave. Ver [Opciones de tools](#opciones-de-tools). |
| `subAgents` | lista de strings | Nombres de carpetas hermanas bajo el `subagents/` del proyecto raíz. Ver [subagents/](subagents.md). |
| `mcpServers` | lista | Servidores MCP - cada entrada es un string de URL, un mapa con `url` y las credenciales que pida el servidor (`token`, `headers`, `timeout`), o un mapa con `command` para un servidor que se ejecuta como programa (`env`, `cwd`, `prefix`, `toolFilter`). Ver [mcp/](mcp.md). |
| `security` | mapa | Se reenvía tal cual a los ajustes del módulo `bxai` de la app generada; el `SecurityDirector` de bx-ai lo convierte en middleware de guardarraíles. |
| `memory` | string o mapa | La memoria de conversación del agente. Un string suelto es el tipo (`cache`); un mapa es `{ type, ...config }` y se pasa a `aiMemory()`. La memoria usa como clave el nombre del agente, así que una que se guarda en disco se encuentra de nuevo en el siguiente arranque; pon `key` en el mapa para darle tú el nombre. |
| `checkpointer` | mapa | `{ type: cache\|file\|jdbc, ...config }`. Por defecto `{ type: cache }` si se omite. |
| `gatewaySession` | mapa | `{ policy, maxQueueDepth, commands }`, todos opcionales. Ver [Agent.bx](agent-bx.md) para los valores; son idénticos. |
| `agentApi` | mapa | `{ enabled, tokenEnvVar, tokens, profiles }`, todos opcionales. Ver [La ruta de agente siempre activa](agent-bx.md#la-ruta-de-agente-siempre-activa). |
| `notes` | mapa | Notas cortas que el agente guarda sobre el usuario y sobre su propio trabajo. `notes: {}` las activa con los valores por defecto. Ver [Notas](#notas). |
| `usage` | booleano | Registra lo que usó cada llamada al modelo (la hora, quién, el proveedor, el modelo y los tokens), para [`bxAgents stats`](../cli-reference.md#stats) y `/stats`. **Desactivado por defecto**: pon `usage: true` para activarlo. Solo recuentos, nunca lo que se dijo. Solo en el `Agent.yaml` propio del proyecto. Recompila tras cambiarlo. |
| `environments` | mapa | Sobreescrituras por entorno. Ver [Entornos](#entornos). |

Son los mismos ajustes que devuelve el `configure()` de un `Agent.bx`, así que todo el comportamiento documentado para ellos aplica sin cambios.

!!! warning
    Una **clave desconocida es un error**, y el mensaje lista las válidas. Un error de tipeo como `modle:` de otro modo no haría nada, en silencio. Los ajustes que llegan en versiones posteriores (por ejemplo `mcp`) se rechazan igual hasta que existan, en lugar de ignorarse en silencio. Todo lo de forma libre pertenece a un `Agent.bx`.

Un valor del tipo equivocado (un texto donde va una lista, por ejemplo) y un valor vacío (`model:` sin nada detrás) también son errores.

## Tools

Un agente recibe su propia carpeta `tools/` y nada más, salvo que lo pida. Las tools que aportan otros módulos (las integradas de bx-ai, `bx-playwright`, ...) son un catálogo: están disponibles, pero un agente solo tiene las que nombra su lista `tools:`. Cada entrada es `item@module`, la clave con la que bx-ai las guarda:

```yaml
name: support
model: openai/gpt-5
tools:
  - now@bxai            # una tool de un módulo
  - "*@bxplaywright"    # todas las tools que registró ese módulo (entre comillas: * inicia un alias YAML)
```

| Entrada | Da al agente |
|---|---|
| `item@module` | esa tool |
| `*@module`, o `@module` | todas las tools que registró el módulo |

- **Por defecto.** Sin `tools:` el agente solo tiene su propio `tools/`. Vale también para cada [subagente](subagents.md): cada uno tiene su `tools/` y su `tools:`.
- **Nombrar un módulo lo valida.** Si el módulo no está instalado, o no tiene esa tool, `build` y la app generada fallan con un mensaje que lista lo que el módulo sí ofrece.
- **Un nombre sin módulo es un error.** `now` falla con la sugerencia de escribir `now@bxai`.
- **Las tools propias ganan.** Si una tool del `tools/` del agente tiene el mismo nombre que una tool de módulo que seleccionó, se usa la propia y la del módulo se omite, con una advertencia en el log `bxagents-tools`.
- **Cada tool una vez.** Listar una tool dos veces, o junto con un `*@module` que la cubre, la adjunta una sola vez.

### Opciones de tools

`toolOptions` configura las tools de un módulo, con el **nombre del módulo** como clave. Dos módulos aceptan opciones: `bxai`, para sus [tools de archivos](#tools-de-archivos), y `bxplaywright`, cuyas opciones son las de `playwright()` de bx-playwright: un `profile` (un nombre o una lista) y ajustes como `headless`, `baseURL`, `browser`, `viewport` o `device`.

```yaml
tools:
  - "*@bxplaywright"
toolOptions:
  bxplaywright:
    profile: mobile
    headless: false
    baseURL: ${env.APP_URL:http://localhost:8080}
```

- **Cada agente tiene su propio navegador.** Las tools de navegador que bx-playwright registra comparten un solo navegador en toda la app. Un agente que lista tools de `bxplaywright` no recibe esas: recibe un conjunto nuevo creado solo para él (`playwright( profile, options ).aiTools()`), así que un agente raíz y su subagente nunca manejan la misma página. El navegador se abre al usar la primera tool, no al arrancar. `*@bxplaywright` funciona sin `toolOptions` y usa los ajustes del propio módulo.
- **Valores de entorno.** `${env.NOMBRE}` y `${env.NOMBRE:valor}` se reemplazan por la variable de entorno cuando arranca la app, nunca al compilar, así un secreto o un ajuste por máquina queda fuera del proyecto. Una variable sin definir y sin valor por defecto hace fallar al agente al arrancar, nombrándola.
- **Se comprueba al compilar.** Una clave que no es un módulo del que el agente lista tools, un módulo que no acepta opciones, una clave escrita como `item@module` o una opción que bx-playwright no tiene (el mensaje lista las válidas) es un error de `build`.
- Los ajustes de todo el módulo (dónde se instalan los navegadores, el perfil por defecto) siguen en los ajustes propios de bx-playwright, no aquí.


### Tools de archivos

bx-ai tiene 19 tools de archivos (`readFile`, `writeFile`, `listDirectory`, `searchFiles`, `deleteFile`, `zipFiles` y más), pero no registra ninguna. En BxAgents un agente las obtiene listándolas **y** nombrando las carpetas que pueden usar en `toolOptions.bxai.allowedPaths`:

```yaml
tools:
  - readFile@bxai
  - listDirectory@bxai
toolOptions:
  bxai:
    allowedPaths:
      - tmp                  # la carpeta temporal del sistema
      - cwd                  # la carpeta desde la que se inicia el agente
      - /data/reports        # o una ruta absoluta
```

- **Cada agente tiene sus propias tools, limitadas a sus propias carpetas.** Una ruta fuera de ellas se rechaza (incluidos los trucos con `..`), y las tools nunca se ponen en el registro compartido donde otro agente podría tomarlas.
- **Sin carpetas, sin tools.** Las tools existen solo cuando `allowedPaths` está definido, y una lista vacía es un error de build, porque bx-ai interpreta una lista vacía como "cualquier ruta". Listar `readFile@bxai` sin `allowedPaths` falla con un mensaje que lo explica.
- `now@bxai`, `httpGet@bxai`, `webSearch@bxai` y el resto de tools registradas de bx-ai siguen funcionando igual, con o sin `toolOptions.bxai`. `*@bxai` incluye las tools de archivos una vez definido `allowedPaths`.
- Una entrada puede ser `${env.NAME}` para tomar una carpeta del entorno.
- `bxAgents new` puede escribir todo esto por ti: ver [el asistente de new](../guides/new-wizard.md).

## Notas

Un agente puede guardar notas cortas: cosas sobre el usuario ("prefiere respuestas cortas") y cosas sobre su propio trabajo ("el repo usa Gradle"). Están desactivadas hasta que existe el bloque:

```yaml
notes: {}
```

```yaml
notes:
  provider: sqlite        # integrado. O una clase que implemente INotesProvider
  user:  { limit: 1400 }  # caracteres de notas del usuario que entran en el prompt
  agent: { limit: 2200 }  # caracteres de notas del agente
  tool: true              # da al agente las tools remember y forget (por defecto true)
  approveForget: true     # una persona aprueba lo que el agente olvida (por defecto true)
```

| Clave | Por defecto | Notas |
|---|---|---|
| `provider` | `sqlite` | `sqlite` guarda una fila por nota en la [base de datos de chat compartida](web-ui.md#el-almacén-sqlite). Cualquier otro valor es el nombre de una clase que implementa `INotesProvider` y se crea con `( config, agentName )`, para un servicio de notas propio. |
| `user.limit` | 1400 | Caracteres de notas sobre el usuario. Cada usuario tiene las suyas. |
| `agent.limit` | 2200 | Caracteres de notas sobre el trabajo del agente. Compartidas por todos los que hablan con él. |
| `tool` | `true` | `remember` (guardar o reemplazar una nota) y `forget` (quitar una). Sin ellas, las notas son de solo lectura para el agente y las gestiona una persona. |
| `approveForget` | `true` | Una ejecución que quiere `forget` se detiene para [aprobación](../cli-reference.md#chat), como cualquier tool que la necesite. Guardar una nota no necesita ninguna. |

Cómo funciona:

- Los dos alcances entran en el prompt del sistema como listas cortas, de la más antigua a la más reciente, dentro de sus límites. Se leen una vez por conversación, así que el prompt no cambia de un turno a otro (la caché de prompts del proveedor sigue funcionando) y una nota guardada ahora aparece desde la siguiente conversación.
- Una nota es una línea de 500 caracteres como máximo. Nada se descarta en silencio: una nota que no cabe en el límite se rechaza, y se le dice al agente cuánto llenas están las notas para que reemplace u olvide una más antigua.
- **Quién es un usuario**: en `bxAgents chat` es el usuario del sistema operativo (`--user=NOMBRE` lo cambia); en un servidor es el nombre del [token de acceso](agent-bx.md#tokens-de-acceso-para-un-agente-desplegado) que usó quien llama, o `api` cuando la ruta está abierta. El alcance del agente pertenece al `name` del agente.
- El chat de terminal, el chat web y el servidor comparten un archivo, `data/chat.db` (ver [el almacén SQLite](web-ui.md#el-almacén-sqlite)).

Gestiónalas tú con `/remember` y `/notes` en [`chat`](../cli-reference.md#chat), con [`bxAgents notes`](../cli-reference.md#notes) desde una shell, o por HTTP con las [rutas de control de ejecución](agent-bx.md#control-de-ejecución).

## Instrucciones

Las instrucciones del agente son su system prompt. Ponlas en un `instructions.md` junto a `Agent.yaml`, la opción habitual porque el archivo es Markdown sencillo y fácil de editar:

```
my-agent/
├── Agent.yaml
└── instructions.md
```

Para un prompt corto puedes escribirlas en línea:

```yaml
name: greeter
model: openai/gpt-5
instructions: |
  You greet people by name.
  Keep it to one sentence.
```

Si existen ambas, **gana `instructions.md`** - el archivo es la elección más deliberada, así que una línea `instructions:` suelta no puede sobreescribirlo. Si no existe ninguna, `build` falla y lo dice.

## Entornos

`environments` contiene sobreescrituras indexadas por nombre de entorno. Es la forma YAML de los métodos de sobreescritura por entorno (`production()`) que puede declarar un `Agent.bx`:

```yaml
name: support
model: openai/gpt-5

environments:
  production:
    model: openai/gpt-5-mini
  staging:
    description: Staging copy
```

El entorno activo se elige con esta precedencia, de mayor a menor:

1. la bandera de CLI `--environment` (`bxAgents build --environment=production`)
2. la variable de entorno `BX_AGENTS_ENV`
3. `development`

Solo se aplica el bloque del entorno activo, encima de los ajustes de nivel superior; las claves que no menciona se dejan como están. Cada bloque acepta las mismas claves que el nivel superior, salvo el propio `environments`.

`bxAgents test` hace el build contra el entorno `test`, y por eso un proyecto generado lleva un bloque `test` que apunta al proveedor `mock`: sus tests no necesitan clave de API ni red.

!!! note
    Un `Agent.yaml` no puede calcular su entorno. El método `detectEnvironment()` descrito en [Overrides de entorno](agent-bx.md#overrides-de-entorno) necesita código, así que un proyecto que lo necesite usa un `Agent.bx`.

Las sobreescrituras se fusionan luego con `boxlang.json`, `boxlang-{environment}.json`, `miniserver.json` y `miniserver-{environment}.json` exactamente como se describe en [Semántica de fusión](agent-bx.md#semántica-de-fusión).

## Requisitos

Leer YAML necesita el módulo `bx-yaml`, **1.1.0 o posterior**. BxAgents lo incluye, así que no hay nada que instalar. Las etiquetas YAML globales (como `!!java.io.File`) se rechazan, de modo que el `Agent.yaml` de un proyecto clonado no puede hacer que el build instancie clases Java arbitrarias.

## ¿YAML o Agent.bx?

| Usa | Cuándo |
|---|---|
| `Agent.yaml` | El agente es configuración: un nombre, un modelo, instrucciones, memoria, subagentes. Es casi todo agente. |
| [`Agent.bx`](agent-bx.md) | La definición misma necesita código: hooks, instrucciones dinámicas, tools registradas en código, un método sobreescrito o `detectEnvironment()`. |

Puedes empezar con YAML y cambiar después: crea el `Agent.bx`, pasa los ajustes y borra el `Agent.yaml`.
