---
title: "Lesson 6: instructions.md and the System Prompt"
icon: phosphor-duotone:note-pencil
summary: The optional file that becomes your agent's system prompt.
description: The optional file that becomes your agent's system prompt.
tags: [course, conventions]
---

# instructions.md and the System Prompt

`instructions.md` is **optional** - `bxAgents new` scaffolds an empty one for you to
fill in, but you have two equally valid choices for where your agent's system prompt
lives:

1. Set `instructions` directly in `Agent.bx`'s `super.init()`.
2. Drop an `instructions.md` file beside `Agent.bx` and let the build wire it in.

## Letting the file win

If `instructions.md` exists, the build emits:

```javascript
withInstructions( fileRead( "instructions.md" ) )
```

which overrides whatever the class itself set. This is the more common pattern in
practice - it keeps the prompt as plain text you can edit without touching BoxLang
code, and it's easy to diff in a pull request.

```markdown
# instructions.md
You are a helpful assistant for a small hardware store. Be concise. If a customer
asks about a product you don't have information on, say so rather than guessing.
```

## Setting it in the class instead

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

Do this when the prompt is generated or templated in code, or when you'd rather keep
everything about the agent in one file. If `instructions.md` doesn't exist (or is
empty), the class's own instructions stand untouched.

## Which one should you pick?

Start with `instructions.md` - it's what `bxAgents new` scaffolds, it's the simplest
mental model ("the system prompt is this file"), and it plays nicely with the rest of
this course, which assumes plain-text prompts throughout. Reach for setting it in the
class only once you have a concrete reason to (templating, environment-specific
prompts assembled from smaller pieces, etc.).

## Try it

Open the `instructions.md` that [Lesson 4](04-scaffolding-your-first-agent.md)'s
`bxAgents new` created and write a real system prompt for whatever kind of agent you
want to build in this course - a support bot, a code reviewer, anything. You'll build
and run it in the next two lessons.

Next: [Lesson 7 - Building Your Agent](07-building-your-agent.md)
