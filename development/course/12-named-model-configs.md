---
title: "Lesson 12: Named Model Configs"
icon: phosphor-duotone:brain
summary: Reusable named model configurations, referenced from Agent.bx by name.
description: Reusable named model configurations, referenced from Agent.bx by name.
tags: [course, conventions, models]
---

# Named Model Configs

`models/` lets you define reusable, named model configurations as one `.bx` or `.json`
file each, referenced from `Agent.bx`'s `model` field by name (with no `/`, so it
isn't mistaken for a `provider/model` slug - see [Lesson 5](05-agent-bx.md)).

```javascript
// models/summarizer.bx
class {

	function configure() {
		return {
			provider : "openai",
			model    : "gpt-5-mini"
		};
	}

}
```

```javascript
// Agent.bx
function configure() {
	return {
		model : "summarizer"   // resolves against models/summarizer.bx
	};
}
```

## Why bother with a named config instead of just writing the slug?

A `provider/model` slug is enough for most agents - you saw this already in
[Lesson 5](05-agent-bx.md). Reach for `models/` when the same configuration is shared
across several agents or subagents (a cheaper model your whole `subagents/` tree uses
for routing, say), or when the config carries more than just a provider and model name
and you don't want to repeat it.

## Discovery rules

- One entry per top-level `.bx` or `.json` file directly under `models/` - not
  recursive.
- The entry name is the file's base name (`summarizer.bx` becomes `summarizer`).
- Dotfiles and unrecognized extensions (like a `README.md` left for your own notes)
  are ignored.
- Two files resolving to the same name fail validation with a duplicate-name error.

## Validation

If `Agent.bx`'s `model` has no `/`, it must be **either** a known core provider name
(`openai`, `bedrock`, `claude`, `gemini`, `mock`, and others - see
[Agent.bx](../conventions/agent-bx.md#the-model-slug)) **or** match a `models/`
entry's name. Anything else fails validation with a clear "no provider and does not
match any models/ entry" error - a typo here is caught at `build` time, not left to
surface as a confusing runtime error later.

## Try it

Add a `models/fast.bx` config pointing at a smaller/cheaper model than your root
agent's default, then reference `model: "fast"` from a subagent's `configure()` - a
natural fit for the researcher subagent from [Lesson 11](11-composing-subagents.md),
which likely doesn't need your biggest model to do its job.

Full reference: [models/](../conventions/models.md).

Next: [Lesson 13 - Exposing Your Agent over HTTP and MCP](13-exposing-http-and-mcp.md)
