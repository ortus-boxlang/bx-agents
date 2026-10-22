---
title: "Lesson 12: Models and Profiles"
icon: phosphor-duotone:brain
summary: Choose the default model, set up other providers and name combinations such as fast and planner, all in Agent.yaml.
description: Choose the default model, set up other providers and name combinations such as fast and planner, all in Agent.yaml.
tags: [course, conventions, models, profiles]
---

# Models and Profiles

You already pick a model with a slug, `model: openai/gpt-5` ([Lesson 5](05-agent-bx.md)). When you want more than one model in the same project, you name them: a **profile** is a provider, a model and a few settings under a name such as `fast` or `planner`. Everything lives in `Agent.yaml`; you never write a `boxlang.json`.

```yaml
provider: openai
model: gpt-5
params: { temperature: 0.2 }

profiles:
  fast:    { description: Cheap and quick, provider: openai, model: gpt-5-mini, params: { temperature: 0 } }
  planner: { description: Careful planning, provider: claude, model: claude-opus-4, apiKeyEnv: ANTHROPIC_API_KEY }
```

A subagent picks one with `profile:`; an agent that says nothing uses the default. A profile cannot be named `default` or like a provider, and a key is never written in the file: `apiKeyEnv` names the environment variable that holds it.

## Why bother

A slug is enough for most agents. Reach for profiles when several agents share a configuration (a cheaper model your routing subagents use), or when a model needs settings you do not want to repeat.

## Try it

Add a `fast` profile that points at a smaller model than your root agent's default, then give a subagent `profile: fast`, a natural fit for the researcher from [Lesson 11](11-composing-subagents.md). Run `bxAgents inspect --section=ai` to see the default, the providers and the profiles, and which variable each key comes from.

Full reference: [Models and profiles](../conventions/models.md).

Next: [Lesson 13 - Exposing Your Agent over HTTP and MCP](13-exposing-http-and-mcp.md)
