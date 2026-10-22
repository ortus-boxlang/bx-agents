---
title: Models and profiles
icon: phosphor-duotone:brain
summary: The default model, other providers, named profiles and the capability defaults, all in Agent.yaml.
description: The default model, other providers, named profiles and the capability defaults, all in Agent.yaml.
tags: [conventions, models, profiles]
---

# Models and profiles

Which model an agent uses is written in `Agent.yaml`. The build maps it onto bx-ai's settings, so you never write a `boxlang.json` for it. The names are bx-ai's own: `provider`, `model`, `params`, `options`, `providers`, `profiles`.

```yaml
provider: openai                 # the default model
model: gpt-5
params: { temperature: 0.2 }

providers:                       # settings for another provider
  claude: { params: { max_tokens: 4000 }, options: { timeout: 90 } }

profiles:                        # named combinations
  fast:    { description: Cheap and quick, provider: openai, model: gpt-5-mini, params: { temperature: 0 } }
  planner: { description: Careful planning, provider: claude, model: claude-opus-4, apiKeyEnv: ANTHROPIC_API_KEY }
defaultProfile: fast             # optional

embeddings:    { provider: openai, model: text-embedding-3-small }
speech:        { provider: openai, model: tts-1, voice: nova }
transcription: { provider: openai, model: whisper-1 }
image:         { provider: openai, model: gpt-image-1, size: 1024x1024 }
```

## The default model

`provider`, `model` and `params` are the model every agent uses when it says nothing else. `model: openai/gpt-5` still works as shorthand for `provider: openai` plus `model: gpt-5`. `params` are request parameters such as `temperature` and `max_tokens`. `options` (timeout and similar) apply to the default provider.

## Other providers

`providers` holds `params` and `options` for a provider by name, for the ones you use through a profile or a subagent. `bxAgents add provider` writes one for you. The key for each provider is read from its usual environment variable (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, ...); `bxAgents doctor` tells you when one is missing.

## Profiles

A profile is a named combination: a provider, a model, params, options and the name of the environment variable that holds its key. It can carry a `description`.

| Key | Meaning |
|---|---|
| `description` | For people and the terminal and web pickers. |
| `provider`, `model` | What it runs on. A profile without a provider uses the default provider. |
| `params`, `options` | Layered on top of the provider's and the default's: `params` from the default, then the provider, then the profile. |
| `apiKeyEnv` | The **name** of the variable that holds the key. A key itself is never written in `Agent.yaml`; a profile that has one is refused. |

A profile cannot be named `default` or like a provider (`openai`, `claude`, ...), because both are selected by name. `defaultProfile` picks which profile is used when nothing asks for another one. `bxAgents add profile` writes a profile (and `--default` the `defaultProfile`) without touching the rest of the file; see [`add profile`](../cli-reference.md#add-profile).

## Which agent uses what

An agent uses its own `profile:`, else its own `model:` (a `provider/model` slug), else the default. Every subagent inherits the root's settings, and may set its own `model` or `profile`:

```yaml
# subagents/planner/Agent.yaml
name: planner
profile: planner
```

`providers`, `profiles`, `defaultProfile`, `params` and the capability keys apply to the whole app, so they belong in the project's own `Agent.yaml`; a subagent that sets them fails validation.

## Capability defaults

`embeddings`, `speech`, `transcription` and `image` set bx-ai's defaults for `aiEmbed()`, `aiSpeak()`, `aiTranscribe()` and `aiImage()`. They do not take profiles. bx-ai has one audio provider, so `speech` and `transcription` must name the same one.

## Validation and tests

`bxAgents build` checks all of the above by bx-ai's own rules and names the file and the key. Under `bxAgents test` every profile runs on the `mock` provider, so a test never reaches the network.

## How it reaches bx-ai

The build writes the settings to `config/bxai-settings.json` in the app, and the app merges them into bx-ai's settings when it starts, before ColdBox boots and builds the agents. They travel with the app wherever it runs (`serve`, a `.bxa`, a container).
