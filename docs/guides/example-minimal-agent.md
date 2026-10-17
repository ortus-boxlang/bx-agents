---
title: "Example: A Minimal Agent"
icon: phosphor-duotone:seedling
summary: Build the smallest complete BxAgents project - one agent, one tool, one skill.
description: Build the smallest complete BxAgents project - one agent, one tool, one skill.
tags: [guides, examples, tools, skills]
---

# Example: A Minimal Agent

The smallest complete BxAgents project is [`examples/minimal-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/minimal-agent) - three files that show the whole shape of a project: an `Agent.yaml`, instructions, one [tool](../conventions/tools.md), and one [skill](../conventions/skills.md). Every other example in this guide series builds on exactly this shape.

## The project

```
minimal-agent/
├── Agent.yaml
├── instructions.md
├── tools/
│   └── Greeter.bx
└── skills/
    └── greeting/
        └── SKILL.md
```

`Agent.yaml` declares a name, description, and model - the `provider/model` slug (see [The model slug](../conventions/agent-bx.md#the-model-slug)) - and nothing else is required. Need code in the definition (hooks, dynamic instructions)? The class-based [`Agent.bx`](../conventions/agent-bx.md) is the advanced alternative.

```yaml
name: minimal-agent
description: "The smallest complete BX Agents project: one tool, one skill."
model: mock/mock-model
```

`instructions.md` is the system prompt - a plain Markdown file, copied in as-is at build time:

```markdown
## Minimal Agent

You are a friendly assistant. When someone tells you their name, use the
`sayHello` tool to greet them, and follow the greeting skill's guidance
on tone.
```

## The tool

Any `class` under `tools/` with an `@AITool`-annotated function becomes a callable tool automatically - no registration step, no config entry. `tools/Greeter.bx`:

```javascript
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

The string passed to `@AITool` is the tool's description, sent to the model exactly as written - see [Tools](../conventions/tools.md) for how BoxLang argument types map to the JSON schema the model sees.

## The skill

A skill under `skills/<name>/SKILL.md` is guidance the model can pull in when it decides it's relevant - not always-on like `instructions.md`. `skills/greeting/SKILL.md`:

```markdown
---
name: greeting
description: How to greet people warmly.
---

Always greet the user warmly and use their name if known.
```

See [Skills](../conventions/skills.md) for how `description` drives when a skill actually gets used.

## Build and run

```bash
cd examples/minimal-agent
bxAgents build
bxAgents chat
```

`build` assembles everything above into a plain ColdBox application under `.build/app` (see [The Build Pipeline](../build-pipeline.md)); `chat` boots the generated agent in-process and drops you into a terminal REPL against it. Try:

```
> My name is Ada.
```

The model should reach for the `sayHello` tool and reply warmly, per the skill's guidance - both from a single sentence of instructions plus a two-line tool and a two-line skill.

## Where to go next

- [Example: A Multi-Agent Team](example-multi-agent-team.md) - the same shape, with subagents delegating to each other.
- [Example: A Scheduled Agent](example-scheduled-agent.md) - the same shape, woken by a cron schedule instead of a chat prompt.
- [Tools](../conventions/tools.md) and [Skills](../conventions/skills.md) for the full conventions these two files follow.
