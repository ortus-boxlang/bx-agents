---
title: "Welcome to BxAgents"
icon: phosphor-duotone:hand-waving
summary: What you will build, how to follow along with no account and no key, and how each lesson is organized.
description: What you will build, how to follow along with no account and no key, and how each lesson is organized.
tags: [course, getting-started]
---

# Welcome to BxAgents

This is a hands-on course on **BxAgents**, a conventions-based AI agent framework for
[BoxLang](https://www.boxlang.io), built on [ColdBox](https://www.coldbox.org) and [BX AI](https://ai.boxlang.io).
The idea is simple: you describe an agent with **files and folders**, not a framework's API, and one command,
`bxAgents build`, assembles a real, runnable ColdBox application out of it.

```text
acme-support/
├── Agent.yml          # name, model, settings
├── instructions.md    # the system prompt
├── tools/             # @AITool functions
├── skills/            # SKILL.md capabilities
├── subagents/         # nested agent trees
├── gateways/          # HTTP, MCP, web app, chat platforms
├── schedules/         # BoxLang schedulers
├── mcp/               # MCP servers you host
├── interceptors/      # lifecycle hooks
├── extensions/        # chat commands, keys and more
└── modules/           # module dependencies
```

Every folder is optional except `Agent.yml`. Add the ones your agent needs and leave the rest empty.

## What you will build

You build **one** agent, from the first lesson to the last: *Acme support*, an assistant that answers questions about
orders, returns and shipping. By the end it has:

- a persona, a tool that looks up an order, a skill with the refund policy, and two models to switch between
- a researcher and a writer it can delegate to
- a web app, a terminal chat and an HTTP API in front of it
- a routine that runs on its own and saves a report, and approvals where a person has to say yes
- notes it keeps about people, accounts and tokens for who is allowed, and a vault for a secret
- a test suite that runs with no key, a backup, and a packaged `.bxa` ready to deploy

## You need no account and no key

The agent talks to a **scripted model**: a small server on your machine that speaks the same protocol as a real model
but only says what the course told it to. [A Model That Needs No Key](practice-model.md) sets it up in five minutes, and
from then on every command in the course gives the output the lesson shows. When you do have a key, swapping it in is two
lines, and the [last lesson](capstone.md) shows them. What you need:

- A terminal with a Unix shell (macOS, Linux, or WSL on Windows).
- About 20 minutes per lesson if you type along. There are 29 lessons, so plan a weekend rather than an evening, and
  stop wherever a lesson ends: each one leaves the project working.
- No BoxLang or ColdBox experience. [Installing BxAgents](03-installing-bxagents.md) installs everything.

## How the lessons work

Each lesson explains one thing and then has you do it. The parts of a lesson:

- **Try it** holds what you type. A grey block titled `Terminal 2` is a command, a block titled with a path such as
  `acme-support/Agent.yml` is a file to create, and a block titled `You see` is what the command prints. A `<anything>`
  in it stands for the part that differs on your machine (a path, a time).
- **Checkpoint** says what `acme-support/` holds now. If your project gets out of step, `kit/resume.sh <lesson>` puts it
  back to the state after that lesson, and you rebuild.
- A link to the reference page for the deep dive. The course is the guided path; [Conventions](../conventions/agent-yaml.md)
  is the exhaustive reference you will come back to.

You will use up to three terminals: **Terminal 1** runs the scripted model and stays open, **Terminal 2** is where you
work, and **Terminal 3** runs `bxAgents serve` from the web app lesson on.

Every command and every output in the course is replayed against the scripted model by a checker in the repository
(`tools/course/check-course.bxs`), so the text cannot drift from what the software does. The few steps that need a
person and a screen (the terminal chat, clicking in the web app) are marked as manual and shown with screenshots.

## The parts of the course

1. **Start**: [what BxAgents is](02-what-is-bxagents.md), [installing it](03-installing-bxagents.md), the
   [scripted model](practice-model.md) and your [first project](04-scaffolding-your-first-agent.md).
2. **The agent**: [Agent.yml](05-agent-bx.md), [the persona](06-instructions-and-system-prompt.md),
   [building](07-building-your-agent.md) and [talking to it](08-talking-to-your-agent.md).
3. **Teach it**: [tools](09-giving-your-agent-tools.md), [skills](10-packaging-skills.md) and
   [models and profiles](12-named-model-configs.md).
4. **The web app**: [the web app](15-the-generated-web-chat-ui.md), [approvals](approvals.md),
   [memory and notes](memory-and-notes.md) and [subagents](11-composing-subagents.md).
5. **On its own**: [routines and reports](routines-and-reports.md) and [schedulers](16-scheduling-background-work.md).
6. **Reach people**: [HTTP and MCP](13-exposing-http-and-mcp.md), [chat platforms](14-connecting-chat-platforms.md) and
   [MCP servers and connectors](17-hosting-mcp-servers.md).
7. **Run it for a team**: [who is allowed](users-roles-and-tokens.md), [the vault](the-vault.md),
   [each person's settings](layered-settings.md) and [logs, usage and backups](operating-it.md).
8. **Extend and ship**: [interceptors and extensions](18-interceptors-and-modules.md), [testing](19-testing-your-agent.md),
   [packaging and deploying](20-packaging-deploying-and-wrapping-up.md) and the [capstone](capstone.md).

Next: [What Is BxAgents?](02-what-is-bxagents.md)
