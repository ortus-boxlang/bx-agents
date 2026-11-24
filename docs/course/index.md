---
title: Introduction to BxAgents
icon: phosphor-duotone:graduation-cap
summary: A 29-lesson hands-on course that builds one support agent, from a model that needs no key to a packaged, tested agent with a web app, routines, people and secrets.
description: A 29-lesson hands-on course that builds one support agent, from a model that needs no key to a packaged, tested agent with a web app, routines, people and secrets.
tags: [course, getting-started]
toc: false
---

# Introduction to BxAgents

Twenty-nine lessons, one agent. You install the CLI, start a scripted model that needs no account and no key, and build
*Acme support* a lesson at a time: its instructions, a tool, a skill, subagents and profiles, then the web app, approvals,
memory, routines, access control, a vault for secrets, per-person settings, logs and backups, tests, and a packaged `.bxa`.
Every command in the course is replayed against the scripted model by a checker, and each lesson ends with a checkpoint you can
restore if you get lost. Every lesson links back to the full [Conventions](../conventions/agent-yaml.md) reference for the
deep dive; this course is the guided path through it.

!!! info
    Each lesson tracks your progress in this browser (no account needed): visit a lesson and it's marked read, and
    **Continue where you left off** below picks up right where you stopped.

::: course id="intro-to-bxagents" :::

## The eight parts

| Part | Lessons |
|---|---|
| **Start** | What BxAgents is, installing it, a model that needs no key, your first project |
| **The agent** | `Agent.yml`, the persona, building, and the terminal chat, `invoke` and `serve` |
| **Teach it** | A tool, a skill, and fast and planner models |
| **The web app** | Serving it, approvals, memory and notes, subagents |
| **On its own** | Routines and reports, and developer schedulers |
| **Reach people** | HTTP and MCP, chat platforms, MCP servers and connectors |
| **Run it for a team** | Accounts and tokens, the vault, each person's settings, logs, usage and backups |
| **Extend and ship** | Interceptors and extensions, tests, packaging and deploying, a capstone |

## Who this is for

Anyone who wants to build an AI agent without hand-wiring a framework's API surface: you describe an agent with **files
and folders**, and `bxAgents build` assembles a real, runnable [ColdBox](https://www.coldbox.org) application out of it.
No prior BoxLang or ColdBox experience is assumed, though it helps, and you need no API key.

## What you'll have built by the last lesson

Acme support: an agent with its own tool, a skill and two subagents, reachable from a terminal chat, a web app and an HTTP
API, with a routine that saves reports, approvals where a person must say yes, notes, accounts and tokens, a vault, tests
that run with no key, a backup, and a packaged `.bxa` ready to deploy.

Ready? Start with [Welcome to BxAgents](01-welcome.md).
