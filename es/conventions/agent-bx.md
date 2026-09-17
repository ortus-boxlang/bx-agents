---
title: Agent.bx
icon: phosphor-duotone:robot
summary: "El único archivo requerido - una clase que extiende el propio AiAgent de bx-ai, así que ES el agente."
description: "El único archivo requerido - una clase que extiende el propio AiAgent de bx-ai, así que ES el agente."
tags: [conventions, configuration]
---

# Agent.bx

`Agent.bx` es el único archivo requerido en un proyecto BxAgents. **Extiende el propio [`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents) de bx-ai**, así que *es* el agente - el build lo instancia en lugar de reconstruir uno a partir de un struct de configuración, así que lo que escribes es lo que se ejecuta. Hereda y añade lo que necesites: helpers privados, métodos sobreescritos, tools registradas en código. Porque es una clase real en lugar de un descriptor que devuelve un struct, un IDE puede introspeccionarla como cualquier otra clase de BoxLang - ir a la definición, autocompletar en métodos heredados, todo.

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "A helpful assistant",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

`bxAgents new` genera el andamiaje exactamente con esta forma. `instructions.md` es opcional - configura `instructions` directamente en `super.init()`, o coloca el archivo junto a `Agent.bx` y deja que el build lo conecte por ti (ver la tabla abajo).

## Lo que el build agrega encima de la clase

> **La regla:** una convención declarada explícitamente gana; de lo contrario, la clase manda.

Así que un agente que configura todo en su propio `init()` no obtiene nada impuesto, mientras que uno que configura lo mínimo indispensable aún adquiere las convenciones que no especificó. Todo lo de abajo es **opcional** - declara un `configure()` que devuelva cualquiera de estas claves para sobreescribir lo que la clase misma configuró, o la carpeta de convención `instructions.md`/`tools/`/`subagents/` correspondiente:

| Declaras | El build emite | Si no lo declaras |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | las propias instrucciones de la clase permanecen |
| `model` en `configure()` | `setModel( aiModel( ... ) )` | el propio modelo de la clase permanece |
| `name` / `description` en `configure()` | `setName()` / `setDescription()` | los propios de la clase permanecen |
| `memory` en `configure()` | `setMemory( ... )` | la propia de la clase permanece |
| *(nada que declarar)* | `withTools( aiToolRegistry().getAll() )` | siempre - `withTools()` **agrega** en bx-ai en lugar de reemplazar, así que las tools que tu clase registró ella misma se mantienen y las `tools/` descubiertas se añaden |
| `subAgents` en la clase, o `subagents/` en disco | `addSubAgent( ... )` por cada hijo | agregado de la misma forma |
| `checkpointer` en `configure()` | `withCheckpointer( ... )` | **inyectado de todos modos** si la clase no configuró ninguno - ver abajo |

!!! info
    El checkpointer es lo único que el build rellena sin que se le pida. Un agente alcanzable desde un gateway sin checkpointer tiene *silenciosamente* roto el human-in-the-loop, así que una clase que no configuró ninguno aún recibe el valor por defecto `cache`. Una clase que configura el suyo propio se deja intacta.

!!! warning
    Deliberadamente **no** implementado comparando tu instancia contra los valores `DEFAULT_AGENT_*` de bx-ai. "¿El autor quiso decir esto, o es simplemente el valor por defecto?" no tiene respuesta, y un autor que genuinamente quería el nombre por defecto lo encontraría silenciosamente reemplazado. La presencia de una declaración externa es un hecho; la intención detrás de un valor por defecto no lo es.

La clase se copia a la app generada en `agent/classes/` y se instancia allí por su propia ruta de archivo absoluta (nunca una búsqueda relativa que dependería de un mapeo registrado), exactamente como se copian `tools/`, `skills/` y `mcp/` - así que un `.bxa` empaquetado la lleva consigo, y `chat`/`invoke`/`serve` todos la instancian de la misma manera, esté o no arrancado un contenedor ColdBox real.

## `configure()` (opcional) - sobreescribiendo lo que la clase configuró

Un método `configure()` es completamente opcional. Declárarlo solo para sobreescribir campos específicos desde fuera de la clase - útil para mantener valores específicos de despliegue (un modelo diferente por entorno, digamos) fuera del propio cuerpo de la clase:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "with-mcp-servers-agent",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			mcpServers : [
				"https://example.com/mcp",
				{ url : "https://other.com/mcp", name : "other" }
			]
		};
	}

}
```

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | También se convierte en la clave de binding de `config/WireBox.bx` de este agente en tiempo de build (`getInstance( name )`) - ver [schedules/](schedules.md) - así que debe ser único en todo el proyecto (raíz + cada subagente); `build` falla si dos agentes comparten un nombre. |
| `model` | string | Un slug `provider/model`, un nombre de proveedor bare, o un nombre que coincida con una entrada de [`models/`](models.md). Ver abajo. |
| `description` | string | Opcional. |
| `subAgents` | array de strings | Nombres de carpetas hermanas bajo el `subagents/` del proyecto raíz. Ver [subagents/](subagents.md). |
| `mcpServers` | array | Servidores MCP remotos - cada entrada es una cadena URL o `{ url, name }`. Ver [mcp/](mcp.md). |
| `security` | struct | Reenviado textualmente a los ajustes del módulo `bxai` de la app generada; el propio `SecurityDirector` de bx-ai lo convierte en middleware de guardarraíles. Solo passthrough - BxAgents no tiene convención propia de guardarraíles. |
| `memory` | string o struct | La memoria de conversación del agente. Una cadena bare es una abreviatura para el tipo (`"cache"`); un struct es `{ type, ...config }` y se pasa textualmente a `aiMemory()` - por ejemplo, `{ type: "cache", maxMessages: 50 }`, o con `summaryProvider`/`summaryModel`/`summaryThreshold` para hacer funcional el `/compact` de la interfaz web. Se aplica por nodo, así que un subagente puede declarar el suyo propio. |
| `checkpointer` | struct | `{ type: "cache"\|"file"\|"jdbc", ...config }`. Por defecto `{ type: "cache" }` si se omite. Siempre se aplica - sin uno, los flujos de aprobación human-in-the-loop a través de cualquier gateway que no sea `cli` fallan por completo. |
| `gatewaySession` | struct | `{ policy, maxQueueDepth }`, ambos opcionales (por defecto `"queue"` / `50`). Solo significativo si el proyecto tiene al menos una entrada de [gateway](gateways/index.md#3-push-style-gateways-type-telegram--slack--discord--email--whatsapp-cloud--teams--twilio--github--signal-and-friends) de estilo push - controla la política del `GatewaySession` generado para un segundo mensaje entrante que llega en un hilo que ya tiene un turno en curso. `policy` debe ser uno de `reject`/`queue`/`steer`/`interrupt`. |
| `agentApi` | struct | `{ enabled, tokenEnvVar }`, ambos opcionales. Controla la ruta de agente siempre activa en `/__bxagents`. Consulta [La ruta de agente siempre activa](#la-ruta-de-agente-siempre-activa) más abajo. |
| cualquier otra clave | cualquiera | Fusionada y disponible en el struct de configuración resuelto, pero no interpretada por BxAgents mismo. |

## The model slug

`model` es la propia convención de BxAgents - bx-ai mismo toma `provider` y `model` como dos argumentos separados de `aiModel()`. BxAgents divide el slug **solo en la primera `/`**, así que un proveedor que él mismo contiene una barra (como el `openrouter/anthropic/claude-x` de OpenRouter) todavía se analiza correctamente:

| Valor de `model` | proveedor | modelo |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

Si `model` no tiene ninguna `/` en absoluto, debe ser ya sea un nombre de proveedor central conocido o coincidir con el nombre de una entrada de [`models/`](models.md) - la validación rechaza cualquier otra cosa. Los proveedores centrales reconocidos son: `bedrock`, `claude`, `cohere`, `deepseek`, `docker`, `elevenlabs`, `gemini`, `grok`, `groq`, `huggingface`, `minimax`, `mistral`, `mock`, `ollama`, `openai`, `openai-compatible`, `openrouter`, `perplexity`, `voyage` (mantenidos sincronizados con los propios `CORE_PROVIDERS` de bx-ai). `mock` es un proveedor real, útil para pruebas y CI - nunca hace una llamada de red.

Esta convención de división de slug es por la que pasa un `model` de tipo string declarado en `configure()` - el propio argumento `model` de `super.init()` en cambio toma directamente una instancia real de `AiModel` (`aiModel( provider: "...", params: { model: "..." } )`), ya que la clase ya habla la propia API de bx-ai.

## Overrides de entorno

`Agent.bx` puede declarar un método nombrado según un entorno (por ejemplo, `production()`, `development()`, o cualquier nombre personalizado) que devuelve un struct de overrides - esto funciona tanto si la clase declara también un `configure()` como si no:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "override-agent",
			description : "An agent with an environment override",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function production() {
		return {
			model : "openai/gpt-5-mini"
		};
	}

}
```

El entorno activo se resuelve con esta precedencia (mayor gana):

1. Flag de CLI `--environment` (`bxAgents build --environment=production`)
2. El propio método `detectEnvironment()` de `Agent.bx`, si lo declara
3. Variable de entorno `BX_AGENTS_ENV`
4. `"development"` (por defecto)

### `detectEnvironment()`

Para todo lo que el primer y el tercer nivel no puedan expresar, `Agent.bx` puede declarar un método `detectEnvironment()` y decidir por sí mismo. Lo que devuelva se toma como nombre de entorno literalmente:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init( name : "my-agent", model : aiModel( provider : "openai", params : { model : "gpt-5" } ) )
		return this
	}

	function detectEnvironment() {
		return fileExists( expandPath( "/.production-marker" ) ) ? "production" : "development";
	}

}
```

Esto refleja la propia convención de nivel 1 de ColdBox (una config que declara `detectEnvironment()` toma su valor de retorno literalmente), con dos diferencias deliberadas, ambas porque esto se ejecuta en tiempo de **build**:

- Un flag `--environment` explícito **prevalece** sobre `detectEnvironment()` aquí, mientras que ColdBox pone su propio método de detección primero. Un flag que alguien escribió es la declaración de intención más específica disponible.
- El *otro* nivel de detección de ColdBox - un struct `environments` de regexes comparadas contra `CGI.HTTP_HOST` - **no** está soportado. No puede funcionar aquí: el build corre en un proceso CLI sin host HTTP, así que solo describiría la máquina que construye (un runner de CI resolvería `development` para un build de producción).

Devolver una cadena vacía, o algo que no sea una cadena, significa "sin opinión" y cae al siguiente nivel - así un proyecto que calcula su entorno a partir de algo ausente en esta máquina degrada al valor por defecto en vez de fallar el build. Un `detectEnvironment()` que **lanza** es otra cosa: eso es un bug real en el código del propio proyecto, y `build` falla y lo dice.

Esta es una decisión únicamente de **tiempo de build**, distinta de la propia detección de entorno de runtime de ColdBox (la app generada lee `getSetting("environment")` por sí misma, según la convención `environments` de ColdBox) - esta precedencia solo decide qué método de override `environment()` en `Agent.bx`, y qué archivos `boxlang-{env}.json`/`miniserver-{env}.json`, aplica el pipeline de build.

Si no existe ningún método que coincida con el entorno activo, no se aplica ningún override.

## Semántica de fusión

El orden de resolución completo (de menor a mayor precedencia) es:

1. `configure()` (opcional)
2. el método de override de entorno coincidente, si existe
3. `boxlang.json`
4. `boxlang-{environment}.json`
5. `miniserver.json`
6. `miniserver-{environment}.json`

Las claves de struct se fusionan **recursivamente** - un struct anidado en una fuente de mayor precedencia solo sobreescribe las claves que realmente configura, dejando intactas las claves hermanas de una fuente de menor precedencia. Los arrays y todos los valores escalares se **reemplazan completos**, nunca se agregan ni concatenan.

`boxlang.json`/`boxlang-{env}.json`/`miniserver.json`/`miniserver-{env}.json` son todos archivos JSON opcionales en la raíz del proyecto, útiles para configuración que es más fácil de expresar como datos que como código BoxLang (por ejemplo, valores por defecto de modelo):

```json
// boxlang.json
{
	"modelDefaults": { "temperature": 0.7, "maxTokens": 1000 }
}
```

```json
// boxlang-production.json
{
	"modelDefaults": { "temperature": 0.2 }
}
```

Construir con `--environment=production` aquí produce `modelDefaults: { temperature: 0.2, maxTokens: 1000 }` - la fusión recursiva mantuvo `maxTokens` del archivo base ya que `boxlang-production.json` nunca lo mencionó.

!!! warning
    Los secretos (claves de API, tokens) nunca son leídos ni fusionados por BxAgents en tiempo de build - permanecen externos (una variable de entorno del SO, `.env`, un gestor de secretos de plataforma) y son resueltos en vivo por el propio bx-ai en tiempo de ejecución. Ver [Despliegue y secretos](../deployment-and-secrets.md).

## La ruta de agente siempre activa

Todo proyecto construido expone su agente raíz sobre HTTP en una ruta reservada fija, declare o no entradas de [`gateways/`](gateways/index.md):

```
POST /__bxagents/invoke
POST /__bxagents/stream    # SSE
POST /__bxagents/batch
GET  /__bxagents/info
```

Estas son las cuatro sub-rutas que registra el propio terminador `toAi()` de ColdBox. La ruta existe para que el tooling de este módulo siempre tenga una dirección con la que hablar - es la entrada de servicio, no la API pública de tu proyecto. La superficie pública propia de un proyecto va en `gateways/`, en las rutas que elijas.

Como la ruta está reservada, `build` **rechaza** cualquier entrada de `gateways/` cuyo `path` sea `/__bxagents` o cuelgue por debajo. Dos rutas en un mismo punto de montaje son un conflicto real: una eclipsaría silenciosamente a la otra, y la tuya sería la que nunca responde.

### `agentApi`

`configure()` puede devolver un struct `agentApi` para controlarla:

| Clave | Tipo | Notas |
|---|---|---|
| `enabled` | boolean | Por defecto `true`. Ponlo a `false` para omitir la ruta por completo - para un build que va a un sitio donde no tiene por qué existir. |
| `tokenEnvVar` | string | El **nombre** de una variable de entorno que contiene un secreto compartido. Cuando está puesto, cada sub-ruta exige una cabecera de petición `x-bxagents-token` coincidente. |

```javascript
function configure() {
	return {
		name     : "my-agent",
		model    : "openai/gpt-5",
		agentApi : {
			tokenEnvVar : "BXAGENTS_API_TOKEN"
		}
	};
}
```

Como esto viene de `configure()`, se puede acotar por entorno con un [override de entorno](#overrides-de-entorno) como cualquier otra clave - así un proyecto puede dejar la ruta abierta en local y exigir un token en producción:

```javascript
function production() {
	return {
		agentApi : { tokenEnvVar : "BXAGENTS_API_TOKEN" }
	};
}
```

La verja **falla cerrada**: si la variable nombrada está sin definir o vacía en tiempo de ejecución, no coincide nada - nunca degenera en comparar `""` con `""` y dejar pasar a todo el mundo. Una petición sin un token válido recibe un `401` con un pequeño cuerpo JSON, y nunca llega al agente.

!!! warning
    `tokenEnvVar` nombra una **variable**, nunca el secreto en sí. `build` rechaza un valor que no sea un nombre válido de variable de entorno, precisamente para que aquí no se pueda commitear un token literal por error. Solo el nombre de la variable llega al código generado.

!!! info
    La ruta queda ligada al host en el que escuche el [miniserver](../cli-reference.md#serve) - `127.0.0.1` por defecto, así que nada es alcanzable fuera de la máquina salvo que la expongas deliberadamente. `tokenEnvVar` es lo que importa en cuanto lo hagas, y para cualquier artefacto `.bxa` construido que despliegues.
