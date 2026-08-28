---
title: Agent.bx
icon: phosphor-duotone:robot
summary: "The one required file - a class that extends bx-ai's own AiAgent, so it IS the agent."
description: "The one required file - a class that extends bx-ai's own AiAgent, so it IS the agent."
tags: [conventions, configuration]
---

# Agent.bx

`Agent.bx` is the only required file in a BxAgents project. It **extends bx-ai's own [`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents)**, so it *is* the agent - the build instantiates it rather than rebuilding one from a config struct, so what you write is what runs. Inherit and add whatever you need: private helpers, overridden methods, tools registered in code. Because it's a real class rather than a struct-returning descriptor, an IDE can introspect it like any other BoxLang class - jump to definition, autocomplete on inherited methods, the works.

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

`bxAgents new` scaffolds exactly this shape. `instructions.md` is optional - set `instructions` directly in `super.init()`, or drop the file beside `Agent.bx` and let the build wire it in for you (see the table below).

## What the build layers on top of the class

> **The rule:** an explicitly declared convention wins; otherwise the class is in charge.

So an agent that sets everything in its own `init()` gets nothing imposed on it, while one that sets the bare minimum still picks up the conventions it didn't speak for. Everything below is **optional** - declare a `configure()` returning any of these keys to override what the class itself set, or the matching `instructions.md`/`tools/`/`subagents/` convention folder:

| You declare | The build emits | If you don't declare it |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | the class's own instructions stand |
| `model` in `configure()` | `setModel( aiModel( ... ) )` | the class's own model stands |
| `name` / `description` in `configure()` | `setName()` / `setDescription()` | the class's own stand |
| `memory` in `configure()` | `setMemory( ... )` | the class's own stands |
| *(nothing to declare)* | `withTools( aiToolRegistry().getAll() )` | always - `withTools()` **appends** in bx-ai rather than replacing, so tools your class registered itself are kept and the discovered `tools/` are added |
| `subAgents` on the class, or `subagents/` on disk | `addSubAgent( ... )` per child | appended the same way |
| `checkpointer` in `configure()` | `withCheckpointer( ... )` | **injected anyway** if the class set none - see below |

!!! info
    The checkpointer is the one thing the build fills in unasked. An agent reachable from a gateway with no checkpointer has *silently* broken human-in-the-loop, so a class that set none still gets the `cache` default. A class that sets its own is left alone.

!!! warning
    Deliberately **not** implemented by comparing your instance against bx-ai's `DEFAULT_AGENT_*` values. "Did the author mean this, or is it just the default?" is unanswerable, and an author who genuinely wanted the default name would find it silently replaced. Presence of an external declaration is a fact; intent behind a default value is not.

The class is copied into the generated app at `agent/classes/` and instantiated there by its own absolute file path (never a relative lookup that would depend on a registered mapping), exactly as `tools/`, `skills/` and `mcp/` are copied - so a packaged `.bxa` carries it, and `chat`/`invoke`/`serve` all instantiate it the same way whether or not a real ColdBox container is booted.

## `configure()` (optional) - overriding what the class set

A `configure()` method is entirely optional. Declare it only to override specific fields from outside the class - useful for keeping deployment-specific values (a different model per environment, say) out of the class body itself:

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

| Field | Type | Notes |
|---|---|---|
| `name` | string | Also becomes this agent's `config/WireBox.bx` binding key at build time (`getInstance( name )`) - see [schedules/](schedules.md) - so it must be unique across the whole project (root + every subagent); `build` fails if two agents share a name. |
| `model` | string | A `provider/model` slug, a bare provider name, or a name matching a [`models/`](models.md) entry. See below. |
| `description` | string | Optional. |
| `subAgents` | array of strings | Names of sibling folders under the root project's `subagents/`. See [subagents/](subagents.md). |
| `mcpServers` | array | Remote MCP servers - each entry a URL string or `{ url, name }`. See [mcp/](mcp.md). |
| `security` | struct | Forwarded verbatim into the generated app's `bxai` module settings; bx-ai's own `SecurityDirector` turns it into guardrail middleware. Passthrough only - BxAgents has no own guardrails convention. |
| `memory` | string or struct | The agent's conversation memory. A bare string is shorthand for the type (`"cache"`); a struct is `{ type, ...config }` and is passed through to `aiMemory()` verbatim - e.g. `{ type: "cache", maxMessages: 50 }`, or with `summaryProvider`/`summaryModel`/`summaryThreshold` to make the web UI's `/compact` functional. Applies per node, so a subagent can declare its own. |
| `checkpointer` | struct | `{ type: "cache"\|"file"\|"jdbc", ...config }`. Defaults to `{ type: "cache" }` if omitted. Always applied - without one, human-in-the-loop approval flows through any gateway other than `cli` fail outright. |
| `gatewaySession` | struct | `{ policy, maxQueueDepth }`, both optional (default `"queue"` / `50`). Only meaningful if the project has at least one push-style [gateway](gateways.md#3-push-style-gateways-type-telegram--slack--discord--email--whatsapp-cloud--teams--twilio--github--signal-and-friends) entry - controls the generated `GatewaySession`'s policy for a second inbound message arriving on a thread that already has a turn in flight. `policy` must be one of `reject`/`queue`/`steer`/`interrupt`. |
| any other key | any | Merged and available in the resolved config struct, but not interpreted by BxAgents itself. |

## The model slug

`model` is BxAgents' own convention - bx-ai itself takes `provider` and `model` as two separate arguments to `aiModel()`. BxAgents splits the slug **on the first `/` only**, so a provider that itself contains a slash (like OpenRouter's `openrouter/anthropic/claude-x`) still parses correctly:

| `model` value | provider | model |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

If `model` has no `/` at all, it must be either a known core provider name or match a [`models/`](models.md) entry's name - validation rejects anything else. The recognized core providers are: `bedrock`, `claude`, `cohere`, `deepseek`, `docker`, `elevenlabs`, `gemini`, `grok`, `groq`, `huggingface`, `minimax`, `mistral`, `mock`, `ollama`, `openai`, `openai-compatible`, `openrouter`, `perplexity`, `voyage` (kept in sync with bx-ai's own `CORE_PROVIDERS`). `mock` is a real provider, useful for tests and CI - it never makes a network call.

This slug-splitting convention is what a `configure()`-declared `model` string goes through - `super.init()`'s own `model` argument instead takes a real `AiModel` instance directly (`aiModel( provider: "...", params: { model: "..." } )`), since the class already speaks bx-ai's own API.

## Environment overrides

`Agent.bx` may declare a method named after an environment (e.g. `production()`, `development()`, or any custom name) returning a struct of overrides - this works whether or not the class also declares a `configure()`:

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

The active environment is resolved with this precedence (highest wins):

1. `--environment` CLI flag (`bxAgents build --environment=production`)
2. `BX_AGENTS_ENV` environment variable
3. `"development"` (default)

This is a **build-time** decision only, distinct from ColdBox's own runtime environment detection (the generated app reads `getSetting("environment")` on its own, per ColdBox's `environments` convention) - this precedence only decides which `environment()` override method on `Agent.bx`, and which `boxlang-{env}.json`/`miniserver-{env}.json` files, the build pipeline applies.

If no method matching the active environment exists, no override is applied.

## Merge semantics

The full resolution order (lowest to highest precedence) is:

1. `configure()` (optional)
2. the matching environment-override method, if any
3. `boxlang.json`
4. `boxlang-{environment}.json`
5. `miniserver.json`
6. `miniserver-{environment}.json`

Struct keys are merged **recursively** - a nested struct in a higher-precedence source only overrides the keys it actually sets, leaving sibling keys from a lower-precedence source intact. Arrays and all scalar values are **replaced whole**, never appended or concatenated.

`boxlang.json`/`boxlang-{env}.json`/`miniserver.json`/`miniserver-{env}.json` are all optional project-root JSON files, useful for config that's easier to express as data than as BoxLang code (e.g. model defaults):

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

Building with `--environment=production` here yields `modelDefaults: { temperature: 0.2, maxTokens: 1000 }` - the recursive merge kept `maxTokens` from the base file since `boxlang-production.json` never mentioned it.

!!! warning
    Secrets (API keys, tokens) are never read or merged by BxAgents at build time - they stay external (an OS environment variable, `.env`, a platform secret manager) and are resolved live by bx-ai itself at runtime. See [Deployment & Secrets](../deployment-and-secrets.md).
