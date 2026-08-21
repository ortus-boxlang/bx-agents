---
title: Agent.bx
icon: ⚙️
summary: "The one required file, in either of two shapes: a descriptor that configures an agent, or a class that IS one."
description: "The one required file, in either of two shapes: a descriptor that configures an agent, or a class that IS one."
tags: [conventions, configuration]
---

# Agent.bx

`Agent.bx` is the only required file in a BX Agents project. It comes in **two shapes**, and both are fully supported - a project can even mix them, with a class-based root over descriptor subagents or the other way round.

## 1. A descriptor - a class that *configures* an agent

The default. A plain BoxLang class whose `configure()` returns a struct; the build renders an `aiAgent( ... )` call from it. Requires an `instructions.md` beside it.

```javascript
class {

	function configure() {
		return {
			name        : "my-agent",
			model       : "openai/gpt-5",
			description : "A helpful assistant"
		};
	}

}
```

## 2. Class-based - a class that *is* the agent

`Agent.bx` may instead extend bx-ai's own [`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents), in which case **it is the agent**. The build instantiates it rather than rebuilding one, so what you write is what runs - and you can put real behaviour in it: private helpers, overridden methods, tools registered in code.

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

Both `configure()` and `instructions.md` are **optional** here - the class already carries that information. See [`examples/class-based-agent`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/class-based-agent).

### What the build still does for a class-based agent

> **The rule:** an explicitly declared convention wins; otherwise the class is in charge.

So an agent that sets everything in its own `init()` gets nothing imposed on it, while one that sets the bare minimum still picks up the conventions it didn't speak for:

| You declare | The build emits | If you don't declare it |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | the class's own instructions stand |
| `model` in config | `setModel( aiModel( ... ) )` | the class's own model stands |
| `name` / `description` | `setName()` / `setDescription()` | the class's own stand |
| `memory` in config | `setMemory( ... )` | the class's own stands |
| *(nothing to declare)* | `withTools( aiToolRegistry().getAll() )` | always - `withTools()` **appends** in bx-ai rather than replacing, so tools your class registered itself are kept and the discovered `tools/` are added |
| `subAgents` | `addSubAgent( ... )` per child | appended the same way |
| `checkpointer` | `withCheckpointer( ... )` | **injected anyway** if the class set none - see below |

!!! info
    The checkpointer is the one thing the build fills in unasked. An agent reachable from a gateway with no checkpointer has *silently* broken human-in-the-loop, so a class that set none still gets the `cache` default. A class that sets its own is left alone.

!!! warning
    Deliberately **not** implemented by comparing your instance against bx-ai's `DEFAULT_AGENT_*` values. "Did the author mean this, or is it just the default?" is unanswerable, and an author who genuinely wanted the default name would find it silently replaced. Presence of an external declaration is a fact; intent behind a default value is not.

The class is copied into the generated app at `agent/classes/` and instantiated there, exactly as `tools/`, `skills/` and `mcp/` are copied - so a packaged `.bxa` carries it. A descriptor `Agent.bx` is never copied: it's consumed at build time and has no runtime role.

## Recognized fields (descriptor shape)

The fields below are what a `configure()` struct may declare. They apply to a class-based agent too, where declaring one means "override what the class set" per the table above.


| Field | Type | Notes |
|---|---|---|
| `name` | string | Falls back to `"BxAi"` if omitted. Also becomes this agent's `config/WireBox.bx` binding key at build time (`getInstance( name )`) - see [schedules/](schedules.md) - so it must be unique across the whole project (root + every subagent); `build` fails if two agents share a name. |
| `model` | string | Required for a descriptor; **optional** for a class-based agent, which already has one. A `provider/model` slug, a bare provider name, or a name matching a [`models/`](models.md) entry. See below. |
| `description` | string | Optional. |
| `subAgents` | array of strings | Names of sibling folders under the root project's `subagents/`. See [subagents/](subagents.md). |
| `mcpServers` | array | Remote MCP servers - each entry a URL string or `{ url, name }`. See [mcp/](mcp.md). |
| `security` | struct | Forwarded verbatim into the generated app's `bxai` module settings; bx-ai's own `SecurityDirector` turns it into guardrail middleware. Passthrough only - BX Agents has no own guardrails convention. |
| `memory` | string or struct | The agent's conversation memory. A bare string is shorthand for the type (`"cache"`); a struct is `{ type, ...config }` and is passed through to `aiMemory()` verbatim - e.g. `{ type: "cache", maxMessages: 50 }`, or with `summaryProvider`/`summaryModel`/`summaryThreshold` to make the web UI's `/compact` functional. **Omitted entirely when not declared**, leaving bx-ai's own default in place - the generated `aiAgent()` call simply has no `memory:` argument. Applies per node, so a subagent can declare its own. |
| `checkpointer` | struct | `{ type: "cache"\|"file"\|"jdbc", ...config }`. Defaults to `{ type: "cache" }` if omitted. Always passed to the generated `aiAgent()` call - without one, human-in-the-loop approval flows through any gateway other than `cli` fail outright. |
| `gatewaySession` | struct | `{ policy, maxQueueDepth }`, both optional (default `"queue"` / `50`). Only meaningful if the project has at least one push-style [gateway](gateways.md#3-push-style-gateways-type-telegram-and-friends) entry - controls the generated `GatewaySession`'s policy for a second inbound message arriving on a thread that already has a turn in flight. `policy` must be one of `reject`/`queue`/`steer`/`interrupt`. |
| any other key | any | Merged and available in the resolved config struct, but not interpreted by BX Agents itself. |

```javascript
function configure() {
	return {
		name       : "with-mcp-servers-agent",
		model      : "openai/gpt-5",
		mcpServers : [
			"https://example.com/mcp",
			{ url : "https://other.com/mcp", name : "other" }
		]
	};
}
```

```javascript
function configure() {
	return {
		name     : "with-security-agent",
		model    : "openai/gpt-5",
		security : {
			inputSanitizer : true,
			outputGuard    : { blockPatterns : [ "ssn", "creditCard" ] }
		}
	};
}
```

## The model slug

`model` is BX Agents' own convention - bx-ai itself takes `provider` and `model` as two separate arguments to `aiModel()`. BX Agents splits the slug **on the first `/` only**, so a provider that itself contains a slash (like OpenRouter's `openrouter/anthropic/claude-x`) still parses correctly:

| `model` value | provider | model |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

If `model` has no `/` at all, it must be either a known core provider name or match a [`models/`](models.md) entry's name - validation rejects anything else. The recognized core providers are: `bedrock`, `claude`, `cohere`, `deepseek`, `docker`, `elevenlabs`, `gemini`, `grok`, `groq`, `huggingface`, `minimax`, `mistral`, `mock`, `ollama`, `openai`, `openai-compatible`, `openrouter`, `perplexity`, `voyage` (kept in sync with bx-ai's own `CORE_PROVIDERS`). `mock` is a real provider, useful for tests and CI - it never makes a network call.

## Environment overrides

`Agent.bx` may declare a method named after an environment (e.g. `production()`, `development()`, or any custom name) returning a struct of overrides:

```javascript
class {

	function configure() {
		return {
			name        : "override-agent",
			description : "An agent with an environment override",
			model       : "openai/gpt-5",
			tags        : [ "base1", "base2" ]
		};
	}

	function production() {
		return {
			model : "openai/gpt-5-mini",
			tags  : [ "prod1" ]
		};
	}

}
```

The active environment is resolved with this precedence (highest wins):

1. `--environment` CLI flag (`bxAgents build --environment=production`)
2. `BX_AGENTS_ENV` environment variable
3. `"development"` (default)

This is a **build-time** decision only, distinct from ColdBox's own runtime environment detection (the generated app reads `getSetting("environment")` on its own, per ColdBox's `environments` convention) - this precedence only decides which `environment()` override method on `Agent.bx`, and which `boxlang-{env}.json`/`miniserver-{env}.json` files, the build pipeline applies.

If no method matching the active environment exists, no override is applied - `configure()`'s return value stands alone.

## Merge semantics

The full resolution order (lowest to highest precedence) is:

1. `configure()`
2. the matching environment-override method, if any
3. `boxlang.json`
4. `boxlang-{environment}.json`
5. `miniserver.json`
6. `miniserver-{environment}.json`

Struct keys are merged **recursively** - a nested struct in a higher-precedence source only overrides the keys it actually sets, leaving sibling keys from a lower-precedence source intact. Arrays and all scalar values are **replaced whole**, never appended or concatenated - in the example above, `production()`'s `tags: ["prod1"]` completely replaces `["base1", "base2"]`, it doesn't merge into `["base1", "base2", "prod1"]`.

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
    Secrets (API keys, tokens) are never read or merged by BX Agents at build time - they stay external (an OS environment variable, `.env`, a platform secret manager) and are resolved live by bx-ai itself at runtime. See [Deployment & Secrets](../deployment-and-secrets.md).