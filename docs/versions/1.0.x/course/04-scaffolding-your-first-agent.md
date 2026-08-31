---
title: "Lesson 4: Scaffolding Your First Agent"
icon: phosphor-duotone:sparkle
summary: Run bxAgents new and see exactly what it creates for you.
description: Run bxAgents new and see exactly what it creates for you.
tags: [course, getting-started]
---

# Scaffolding Your First Agent

With BoxLang, `bx-ai` and BxAgents installed ([Lesson 3](03-installing-bxagents.md)),
scaffold your first project:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` is **required** - a `provider/model` slug (you'll see exactly how this gets
parsed in [Lesson 5](05-agent-bx.md)). `--name` and `--description` are optional;
`--name` defaults to the target directory's own name. `new` refuses to run if the
target already contains an `Agent.bx`.

## What gets created

```
my-agent/
├── Agent.bx
├── instructions.md
├── tools/
├── skills/
├── subagents/
├── models/
├── gateways/
├── schedules/
├── mcp/
├── interceptors/
├── modules/
└── tests/
    ├── box.json
    └── specs/
        └── AgentSpec.bx
```

Plus a `.env` declaring `BOXLANG_HOME=.build/runtime` (matching `serve`'s own scoped
runtime home) and a `.gitignore` (`.build/`, `dist/`, `.env`) - `new` never overwrites
either if they already exist.

Every convention folder is created **empty**. You add files to the ones your agent
actually needs and leave the rest alone - an empty `tools/` folder has zero effect on
the generated app.

## `Agent.bx` looks like this

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

It `extends` bx-ai's own `AiAgent` directly - more on exactly what that means in
[Lesson 5](05-agent-bx.md).

## The test suite runs itself

`new` also runs `box install` inside the scaffolded `tests/` folder, so `bxAgents test`
([Lesson 19](19-testing-your-agent.md)) works immediately with no separate step. This
is best-effort - if `box` isn't on `PATH` or the install fails, `new` still succeeds
and just tells you to run it yourself. Pass `--skipInstall` to opt out entirely.

## Try it

```bash
bxAgents new my-agent --model=openai/gpt-5
cd my-agent
ls
```

You now have a real, if minimal, BxAgents project. The next four lessons walk through
what's actually required to run it.

Next: [Lesson 5 - Agent.bx: The Agent Itself](05-agent-bx.md)
