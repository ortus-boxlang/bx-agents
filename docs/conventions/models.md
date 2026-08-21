---
title: models/
icon: phosphor-duotone:brain
summary: Reusable named model configurations, referenced from Agent.bx by name.
description: Reusable named model configurations, referenced from Agent.bx by name.
tags: [conventions, models]
---

# models/

`models/` lets you define reusable, named model configurations as one `.bx` or `.json` file each, referenced from `Agent.bx`'s `model` field by name (with no `/`, so it isn't mistaken for a `provider/model` slug):

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
		name  : "my-agent",
		model : "summarizer"   // resolves to models/summarizer.bx
	};
}
```

## Discovery rules

- One entry per top-level `.bx` or `.json` file directly under `models/` (not recursive).
- The entry name is the file's base name (`summarizer.bx` → `summarizer`).
- Dotfiles and files with an unrecognized extension (like a `README.md` left in the folder for your own notes) are ignored.
- Two files resolving to the same name fail validation with a duplicate-name error.

## Validation

If `Agent.bx`'s `model` has no `/`, it must be **either** a known core provider name (see [Agent.bx](agent-bx.md#the-model-slug)) **or** match a `models/` entry's name - anything else fails validation with a clear "no provider and does not match any models/ entry" error.