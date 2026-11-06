---
title: "Lesson 4: Scaffolding Your First Agent"
icon: phosphor-duotone:sparkle
summary: Run bxAgents new and see exactly what it creates for you.
description: Run bxAgents new and see exactly what it creates for you.
tags: [course, getting-started]
---

# Scaffolding Your First Agent

With BoxLang and BxAgents installed ([Lesson 3](03-installing-bxagents.md)),
scaffold your first project:

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` is a `provider/model` slug (you'll see exactly how this gets
parsed in [Lesson 5](05-agent-bx.md)). Pass it for a script-friendly run: without
`--model`, at a terminal, `new` asks you questions instead (see [`new` wizard](../guides/new-wizard.md)).
`--name` and `--description` are optional;
`--name` defaults to the target directory's own name. `new` refuses to run if the
target already contains an `Agent.yaml` or `Agent.bx`.

## The wizard

At a terminal, `bxAgents new my-agent` (no `--model`) opens a full-screen wizard. It asks what
the agent should do: its model, tools, memory, MCP servers, channels (web chat, Slack, Telegram
and so on), how people sign in, and where it deploys. Esc goes back one question and Ctrl+C
creates nothing. One question picks a template, the shape the project starts from, and
your other answers are added on top of it: a template is a preset, not a limit. The last screen
prints the one-line command that builds the same project without questions, so a script can
repeat it. Pass `--model` (or `--no-wizard`) to skip the questions. See the
[`new` wizard](../guides/new-wizard.md) for every question and flag.

## What gets created

```
my-agent/
├── Agent.yaml
├── box.json
├── instructions.md
├── tools/
├── skills/
├── subagents/
├── gateways/
├── schedules/
├── mcp/
├── interceptors/
├── modules/
└── tests/
    └── specs/
        └── AgentSpec.bx
```

Plus a `.env` declaring `BOXLANG_HOME=.build/runtime` (matching `serve`'s own scoped
runtime home), a `.gitignore` (it ignores `.build/`, `dist/`, `.env`, `lib/` and `data/chat.db*`, among others)
and a few dotfiles (`.boxlang.json`, `.editorconfig`, `.bxlint.json`, `.gitattributes`,
`.markdownlint.json`) - `new` never overwrites them if they already exist. BoxLang loads the `.env` from the project root itself, so
this is where secrets live: the wizard and `add` write an empty line for each key your choices
need (a provider key, a bot token), and the files that use it hold only the variable's name.

Every convention folder is created **empty**. You add files to the ones your agent
actually needs and leave the rest alone - an empty `tools/` folder has zero effect on
the generated app.

## `Agent.yaml` looks like this

(Pass `--description` and `new` adds a `description:` line.)

```yaml
# Your agent. Most agents need nothing more than this file and instructions.md.
# For code in the definition (hooks, dynamic instructions), scaffold with --class.
name: my-agent
provider: openai
model: gpt-5

environments:
  # `bxAgents test` builds against this override by default (see
  # BaseAgentSpec.bx) so a fresh project's tests need no API key or
  # network access - swap the model to test against a real provider.
  test:
    model: mock/mock-model
```

That is the whole agent definition - more on each key in [Lesson 5](05-agent-bx.md).
If you need code in the definition, pass `--class` and `new` scaffolds a class-based
`Agent.bx` instead (also covered at the end of Lesson 5).

## The test suite runs itself

`new` also runs `box install` in the scaffolded project root (its `box.json` lists TestBox, installed into `lib/testbox`), so `bxAgents test`
([Lesson 19](19-testing-your-agent.md)) works immediately with no separate step. This
is best-effort - if `box` isn't on `PATH` or the install fails, `new` still succeeds
and just tells you to run it yourself. Pass `--skipInstall` to opt out entirely.

## Try it

```bash
bxAgents new my-agent --model=openai/gpt-5
cd my-agent
ls
```

You now have a real, if minimal, BxAgents project. Later you can add to it without editing
files by hand: `bxAgents add tool`, `add skill`, `add subagent`, `add gateway`, `add schedule` and
the other `add` kinds ask a few questions and write the files for you (`--dry-run` shows them
first). The next four lessons walk through what's actually required to run it.

Next: [Lesson 5 - The Agent Definition: Agent.yaml](05-agent-bx.md)
