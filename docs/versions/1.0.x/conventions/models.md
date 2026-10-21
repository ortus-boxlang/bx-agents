---
title: models/
icon: phosphor-duotone:brain
summary: Reusable named model configurations, referenced from Agent.yaml by name.
description: Reusable named model configurations, referenced from Agent.yaml by name.
tags: [conventions, models]
---

# models/

`models/` holds reusable, named model configurations, one YAML or JSON file each: a provider, a model and the settings that go with them. An agent uses one by writing its name as `model` (with no `/`, so it isn't mistaken for a `provider/model` slug). Think `researcher`, `coder`, `summarizer`: the same configuration shared by several agents and subagents, written once.

```yaml
# models/researcher.yaml
description: Cheap, careful model for research
provider: openai
model: gpt-5-mini
params:
  temperature: 0.2
  max_tokens: 2000
```

```yaml
# Agent.yaml - resolves against models/researcher.yaml
name: my-agent
model: researcher
```

## What an entry can say

| Key | Meaning |
|---|---|
| `provider` | Required. A provider bx-ai knows: see [the model slug](agent-bx.md#the-model-slug). |
| `model` | The provider's model. Left out, the provider's own default applies. |
| `description` | For people. |
| `apiKeyEnvVar` | The **name** of an environment variable to read the key from, instead of the provider's usual one (`OPENAI_API_KEY`). Use it when two models of one provider need different keys. The key itself is never written in the file, and a missing variable stops the agent at start and names it. |
| `params` | A mapping sent with every request: `temperature`, `max_tokens`, anything the provider takes. |
| `options` | A mapping of bx-ai model options such as `timeout` or `logRequest`. |

An unknown key, a `params` that is not a mapping, an unknown provider, and an `apiKey` written into `params` or `options` all fail `build` with the entry's name.

`bxAgents add model` writes one for you: see [`add`](../cli-reference.md#add-model).

A `.bx` class returning the same struct from `configure()` also still works, for projects that have one; YAML and JSON are what new entries use.

## Discovery rules

- One entry per top-level `.yaml`, `.yml` or `.json` file directly under `models/` (not recursive), or a legacy `.bx` class.
- The entry name is the file's base name (`researcher.yaml` → `researcher`).
- A name that is also a provider (`openai`, `claude`, ...) would be read as the provider itself, so `add model` refuses it.
- Dotfiles and files with an unrecognized extension (like a `README.md` left in the folder for your own notes) are ignored.
- Two files resolving to the same name fail validation with a duplicate-name error.

## Validation

If the agent's `model` has no `/`, it must be **either** a known core provider name (see [the model slug](agent-bx.md#the-model-slug)) **or** match a `models/` entry's name - anything else fails validation with a clear "no provider and does not match any models/ entry" error.
