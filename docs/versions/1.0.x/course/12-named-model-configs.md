---
title: "Models and Profiles"
icon: phosphor-duotone:brain
summary: Choose the default model, set up other providers and name combinations such as fast and planner, all in Agent.yml.
description: Choose the default model, set up other providers and name combinations such as fast and planner, all in Agent.yml.
tags: [course, conventions, models, profiles]
---

# Models and Profiles

You already pick a model with a slug, `model: openai/gpt-5` ([The Agent Definition - Agent.yml](05-agent-bx.md)). When you want more than one model in the same project, you name them: a **profile** is a provider, a model and a few settings under a name such as `fast` or `planner`. Everything lives in `Agent.yml`; you never write a `boxlang.json`.

```yaml
provider: openai
model: gpt-5
params: { temperature: 0.2 }

profiles:
  fast:    { description: Cheap and quick, provider: openai, model: gpt-5-mini, params: { temperature: 0 } }
  planner: { description: Careful planning, provider: claude, model: claude-opus-4, apiKeyEnv: ANTHROPIC_API_KEY }
```

A subagent picks one with `profile:`; an agent that says nothing uses the default. A profile cannot be named `default` or like a provider, and a key is never written in the file: `apiKeyEnv` names the environment variable that holds it.

`defaultProfile: fast` makes a profile the default model (when a top-level `model` is written beside it, the profile wins and `build` and `doctor` warn that the model is ignored). `bxAgents add profile` and `add provider` write these blocks for you, with an empty key stub in `.env`.

## What the project can say about a model

`contextWindow` and `vision` on the default model and on each profile say what the model can hold and whether it can see images. Both are optional and nothing is guessed. `/info`, `/model` and the context size in the chat show them, and a picture sent to a profile with `vision: false` is refused with that reason.

## Using and testing profiles

- In the terminal chat, `/model` shows the model, `/profile` picks a profile from a list (or `/profile fast`) and `/default` goes back. The conversation, memory and tools stay.
- A web chat entry or an agent API that lists `profiles` offers them as a picker. Only the listed ones can be chosen, and the page never sees a key.
- `bxAgents models list` shows what the project can talk to, and `bxAgents models test --all` sends each model one tiny question and says whether it answered and how long it took. In the chat, `/ping` does the same.
- Set `usage: true` in `Agent.yml` and `bxAgents stats` (or `/stats`) shows what the model calls used, by model, provider, day or user. It keeps counts only.

## Why bother

A slug is enough for most agents. Reach for profiles when several agents share a configuration (a cheaper model your routing subagents use), or when a model needs settings you do not want to repeat.

## Try it

Give Acme support two models: a quick one for simple questions and a careful one for planning. Add the profiles at
the end of `Agent.yml`. Both name the scripted model, which accepts any model name, so the answers can still tell
them apart:

<!-- course: append -->
```yaml title="acme-support/Agent.yml"

profiles:
  fast:
    description: Quick answers for simple questions
    provider: openai-compatible
    model: fast-model
  planner:
    description: Thinks it through before it answers
    provider: openai-compatible
    model: planner-model
```

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents build
bxAgents models list
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
default<anything>/fast-model<anything>
fast<anything>openai-compatible/fast-model<anything>
planner<anything>openai-compatible/planner-model<anything>
```

In the terminal chat, `/profile planner` switches the model in the middle of a conversation: same conversation,
same tools, only the model changed. Ask `anything` before and after, and the answer ends with `(Answered by
fast-model.)` and then `(Answered by planner-model.)`. `/model` shows which one is in use and `/default` goes back.
Because the web app and the API list the profiles too, a person can pick one per message there.

!!! note "`models test` and the scripted model"
    `bxAgents models test` sends each model one tiny question. It does not work against the scripted model in this
    course, so the course does not use it; with a real provider it is the quickest way to find a wrong key.

## Checkpoint

`Agent.yml` has the `profiles:` block. `kit/resume.sh 12-named-model-configs` restores it; rebuild after.

Full reference: [Models and profiles](../conventions/models.md).

Next: [The Web App](15-the-generated-web-chat-ui.md)
