---
title: "Lesson 1: Welcome to BxAgents"
icon: phosphor-duotone:hand-waving
summary: What this course covers, what you'll build, and how each lesson is organized.
description: What this course covers, what you'll build, and how each lesson is organized.
tags: [course, getting-started]
---

# Welcome to BxAgents

Welcome! This is a 20-lesson course on **BxAgents**, a conventions-based AI agent
framework for [BoxLang](https://boxlang.io), built on [ColdBox](https://coldbox.ortusbooks.com)
and [BX AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai).

The idea behind BxAgents is simple: you describe an agent with **files and folders**,
not a framework's API surface, and one command - `bxAgents build` - assembles a real,
runnable ColdBox application out of it.

```
my-agent/
├── Agent.bx           # name, model, description
├── instructions.md    # the system prompt
├── tools/             # @AITool functions
├── skills/            # SKILL.md capabilities
├── subagents/         # nested agent trees
├── models/            # named model configs
├── gateways/           # HTTP/MCP/chat exposure
├── schedules/          # a real ColdBox scheduler
├── mcp/                # MCP servers you host
├── interceptors/        # lifecycle hooks
└── modules/            # module dependencies
```

Every folder above is optional except `Agent.bx`. Add the ones your agent actually
needs; the rest can stay empty or simply not exist.

## How this course is organized

The 20 lessons follow the order you'd naturally build a real project in:

1. **Lessons 1-4** - orientation, install, and your first scaffolded project.
2. **Lessons 5-8** - the required pieces: `Agent.bx`, instructions, building, and
   running the agent from the terminal.
3. **Lessons 9-12** - giving your agent abilities: tools, skills, subagents, and
   named models.
4. **Lessons 13-16** - reaching your agent: HTTP/MCP exposure, chat platforms, the
   generated web UI, and scheduled background work.
5. **Lessons 17-18** - hosting your own MCP servers, lifecycle interceptors, and
   module dependencies.
6. **Lessons 19-20** - testing for real, then packaging and deploying what you built.

## What you need

- A terminal.
- About 30-60 minutes per lesson if you're following along hands-on (most lessons
  work fine read-only too).
- No prior BoxLang or ColdBox experience required - Lesson 3 installs everything you
  need.

Every lesson links back to the full [Conventions](../conventions/agent-bx.md) reference
for anything this course only summarizes - the course is the guided path, the
Conventions section is the exhaustive reference you'll come back to later.

Next: [Lesson 2 - What Is BxAgents?](02-what-is-bxagents.md)
