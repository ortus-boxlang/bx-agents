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
| `model` | string | Un slug `provider/model`, un nombre de proveedor sin más, o el nombre de una entrada de [`models/`](models.md). Ver [The model slug](agent-bx.md#the-model-slug). |
| `description` | string | Opcional. |
| `instructions` | string | Instrucciones en línea, opcionales. Ver [Instrucciones](#instrucciones). |
| `tools` | lista de strings | Tools de módulos que recibe este agente, como `item@module` o `*@module`. Ver [Tools](#tools). |
| `toolOptions` | mapping | Opciones de las tools de un módulo, con el nombre del módulo como clave. Ver [Opciones de tools](#opciones-de-tools). |
| `subAgents` | lista de strings | Nombres de carpetas hermanas bajo el `subagents/` del proyecto raíz. Ver [subagents/](subagents.md). |
| `mcpServers` | lista | Servidores MCP remotos - cada entrada es un string de URL o `{ url, name }`. Ver [mcp/](mcp.md). |
| `security` | mapa | Se reenvía tal cual a los ajustes del módulo `bxai` de la app generada; el `SecurityDirector` de bx-ai lo convierte en middleware de guardarraíles. |
| `memory` | string o mapa | La memoria de conversación del agente. Un string suelto es el tipo (`cache`); un mapa es `{ type, ...config }` y se pasa a `aiMemory()`. |
| `checkpointer` | mapa | `{ type: cache\|file\|jdbc, ...config }`. Por defecto `{ type: cache }` si se omite. |
| `gatewaySession` | mapa | `{ policy, maxQueueDepth }`, ambos opcionales. Ver [Agent.bx](agent-bx.md) para los valores; son idénticos. |
| `agentApi` | mapa | `{ enabled, tokenEnvVar }`, ambos opcionales. Ver [La ruta de agente siempre activa](agent-bx.md#la-ruta-de-agente-siempre-activa). |
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

`toolOptions` configura las tools de un módulo, con el **nombre del módulo** como clave. Hoy el único módulo que acepta opciones es `bxplaywright`, cuyas opciones son las de `playwright()` de bx-playwright: un `profile` (un nombre o una lista) y ajustes como `headless`, `baseURL`, `browser`, `viewport` o `device`.

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

Las sobreescrituras se fusionan luego con `boxlang.json`, `boxlang-{environment}.json`, `miniserver.json` y `miniserver-{environment}.json` exactamente como se describe en [Semántica de fusión](agent-bx.md#semantica-de-fusion).

## Requisitos

Leer YAML necesita el módulo `bx-yaml`, **1.1.0 o posterior**. BxAgents lo incluye, así que no hay nada que instalar. Las etiquetas YAML globales (como `!!java.io.File`) se rechazan, de modo que el `Agent.yaml` de un proyecto clonado no puede hacer que el build instancie clases Java arbitrarias.

## ¿YAML o Agent.bx?

| Usa | Cuándo |
|---|---|
| `Agent.yaml` | El agente es configuración: un nombre, un modelo, instrucciones, memoria, subagentes. Es casi todo agente. |
| [`Agent.bx`](agent-bx.md) | La definición misma necesita código: hooks, instrucciones dinámicas, tools registradas en código, un método sobreescrito o `detectEnvironment()`. |

Puedes empezar con YAML y cambiar después: crea el `Agent.bx`, pasa los ajustes y borra el `Agent.yaml`.
