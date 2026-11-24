---
title: "Scaffolding Your First Agent"
icon: phosphor-duotone:sparkle
summary: Run bxAgents new and see exactly what it creates for you.
description: Run bxAgents new and see exactly what it creates for you.
tags: [course, getting-started]
---

# Scaffolding Your First Agent

In [A Model That Needs No Key](practice-model.md) you ran one command and got a project:

```bash
bxAgents new acme-support --model=openai-compatible/fast-model --skipInstall --no-banner
```

This lesson is the tour of what that command made. `--model` is a `provider/model` slug (you'll see exactly how
this gets parsed in [The Agent Definition - Agent.yml](05-agent-bx.md)). Pass it for a script-friendly run: without
`--model`, at a terminal, `new` asks you questions instead (see [`new` wizard](../guides/new-wizard.md)).
`--name` and `--description` are optional;
`--name` defaults to the target directory's own name. `new` refuses to run if the
target already contains an `Agent.yml` or `Agent.bx`.

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

```text
acme-support/
├── Agent.yml
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

Plus a `.env` (commented API key stubs only; it deliberately does not set `BOXLANG_HOME`), a `.gitignore` (it ignores `.build/`, `dist/`, `.env`, `lib/` and `data/chat.db*`, among others; the chat database now lives in the agent's data home, `~/.bxagents/<agent name>/`, outside the project, so that last line only matters for a project that already keeps one in `data/`)
and a few dotfiles (`.boxlang.json`, `.editorconfig`, `.bxlint.json`, `.gitattributes`,
`.markdownlint.json`) - `new` never overwrites them if they already exist. BoxLang loads the `.env` from the project root itself, so
this is where secrets live: the wizard and `add` write an empty line for each key your choices
need (a provider key, a bot token), and the files that use it hold only the variable's name.

Every convention folder is created **empty**. You add files to the ones your agent
actually needs and leave the rest alone - an empty `tools/` folder has zero effect on
the generated app.

## `Agent.yml` looks like this

(Pass `--description` and `new` adds a `description:` line.)

```yaml
# Your agent. Most agents need nothing more than this file and instructions.md.
# For code in the definition (hooks, dynamic instructions), scaffold with --class.
name: acme-support
provider: openai-compatible
model: fast-model

environments:
  # `bxAgents test` builds against this override by default (see
  # BaseAgentSpec.bx) so a fresh project's tests need no API key or
  # network access - swap the model to test against a real provider.
  test:
    model: mock/mock-model
```

That is the whole agent definition - more on each key in [The Agent Definition - Agent.yml](05-agent-bx.md).
If you need code in the definition, pass `--class` and `new` scaffolds a class-based
`Agent.bx` instead (also covered at the end of [The Agent Definition](05-agent-bx.md)).

## The test suite

`new` can also run `box install` in the project root (its `box.json` lists TestBox, installed into `lib/testbox`),
so `bxAgents test` ([Testing Your Agent](19-testing-your-agent.md)) works immediately. This is best-effort: if
`box` isn't on `PATH` or the install fails, `new` still succeeds and tells you to run it yourself. You passed
`--skipInstall`, so nothing was installed yet, and nothing in the next lessons needs it.

## Try it

Look at what is there, then ask for a tool without writing it. `add` shows what it would write when you pass
`--dry-run`, and writes nothing:

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
ls
```

```bash title="Terminal 2"
bxAgents add tool Orders --function=orderStatus --dry-run
```

```text title="You see"
Would create tools/Orders.bx
...
```

Later you can add to a project without editing files by hand: `bxAgents add tool`, `add skill`, `add subagent`,
`add gateway`, `add schedule` and the other `add` kinds ask a few questions and write the files for you. The
next lessons walk through what is actually required to run it.

## Checkpoint

Nothing changed in `acme-support/` in this lesson: it is the project from the last one.

Next: [The Agent Definition - Agent.yml](05-agent-bx.md)
