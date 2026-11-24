---
title: "instructions.md and the System Prompt"
icon: phosphor-duotone:note-pencil
summary: The optional file that becomes your agent's system prompt.
description: The optional file that becomes your agent's system prompt.
tags: [course, conventions]
---

# instructions.md and the System Prompt

`instructions.md` is **optional** - `bxAgents new` scaffolds a starter one for you to
edit, but you have two equally valid choices for where your agent's system prompt
lives:

1. Set `instructions` inline in `Agent.yml`.
2. Drop an `instructions.md` file beside `Agent.yml` and let the build wire it in.

## Letting the file win

If `instructions.md` exists, the build emits:

```javascript
withInstructions( fileRead( "instructions.md" ) )
```

which wins over an inline `instructions` in `Agent.yml` (or whatever a class set).
This is the more common pattern in
practice - it keeps the prompt as plain text you can edit without touching BoxLang
code, and it's easy to diff in a pull request.

```markdown
# instructions.md
You are a helpful assistant for a small hardware store. Be concise. If a customer
asks about a product you don't have information on, say so rather than guessing.
```

## Setting it inline instead

```yaml
name: my-agent
model: openai/gpt-5
instructions: |
  You are a helpful assistant.
  Keep answers short.
```

Do this for a short prompt, or when you'd rather keep everything about the agent in one
file. If both exist, `instructions.md` wins; if neither exists, the build fails and says
so. A prompt that must be generated or templated in code belongs in the advanced
class-based `Agent.bx` (see the end of [The Agent Definition - Agent.yml](05-agent-bx.md)).

## Which one should you pick?

Start with `instructions.md` - it's what `bxAgents new` scaffolds, it's the simplest
mental model ("the system prompt is this file"), and it plays nicely with the rest of
this course, which assumes plain-text prompts throughout. Reach for the inline
`instructions` key only for a short prompt, and for code only once you have a concrete
reason to (templating, environment-specific prompts assembled from smaller pieces,
etc.).

## Try it

Write the persona of Acme support. This replaces the starter file:

```markdown title="acme-support/instructions.md"
You are Acme's support agent. Answer questions about orders, returns and shipping.
Be brief and friendly. If you do not know something, say so rather than guessing.
```

How do you know the model really received it? The scripted model has a rule that answers with the system message
it was sent, which is the whole of its instructions. Build, then ask for it (the word the rule listens for is
`system`):

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents build
bxAgents invoke --message=system
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
My instructions are:

Role: Answers questions about orders, returns and shipping for Acme.

Instructions: You are Acme's support agent. Answer questions about orders, returns and shipping.
Be brief and friendly. If you do not know something, say so rather than guessing.
...
```

Your text comes first. What follows it, a list of skills the agent can load, is added by BxAgents (the
[skills lesson](10-packaging-skills.md) is about those). A real model would not echo its prompt, but with a real
one you can ask the same thing: `What are your instructions?`.

## Checkpoint

`instructions.md` holds the persona above. `kit/resume.sh 06-instructions-and-system-prompt` restores it.

Next: [Building Your Agent](07-building-your-agent.md)
