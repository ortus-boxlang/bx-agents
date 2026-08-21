---
title: BX Agents
order: 1
icon: phosphor-duotone:robot
summary: Describe an agent in folders and files; build it into a real ColdBox application.
description: Describe an agent in folders and files; build it into a real ColdBox application.
tags: [overview]
toc: false
---

<div class="bxdocs-hero">
	<img class="bxdocs-hero__banner" src="assets/home-banner.jpg" alt="BX Agents - Build. Constrain. Orchestrate. A conventions-based agent framework for BoxLang. Conventions first: convention over configuration for faster development. Pluggable and extensible: swap models, tools, memory and more with ease. Powerful agents: create agents that reason, act, and collaborate effectively. Production ready: built for performance, reliability, and real-world applications. The agent framework native to BoxLang.">
	<div class="bxdocs-hero__actions">
		<a class="bxdocs-hero__btn bxdocs-hero__btn--primary" href="getting-started/installation.md">Get Started</a>
		<a class="bxdocs-hero__btn bxdocs-hero__btn--secondary" href="https://github.com/ortus-boxlang/bx-agents">View on GitHub</a>
	</div>
</div>

**BX Agents** is a conventions-based AI agent framework for [BoxLang](https://boxlang.io),
built on [ColdBox](https://coldbox.ortusbooks.com) and
[BX AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai). You describe an agent
with files and folders - not a framework's API surface - and `bxAgents build` assembles a
real, runnable ColdBox application out of it.

::: cards
::: card title="Assembled at build time" icon="phosphor-duotone:gear-six" href="build-pipeline.md"
Discovery, validation and code generation run **once**, not on every boot. What you run
afterwards is a plain ColdBox app.
:::
::: card title="Folders are the API" icon="phosphor-duotone:tree-structure" href="conventions/agent-bx.md"
`Agent.bx` and `instructions.md` are the only required files. Every other convention folder
is optional and only shapes the output if it exists.
:::
::: card title="Tools and skills" icon="phosphor-duotone:wrench" href="conventions/tools.md"
Drop an `@AITool`-annotated function into `tools/`, or a `SKILL.md` folder into `skills/` -
both are discovered and wired for you.
:::
::: card title="Agents all the way down" icon="phosphor-duotone:users-three" href="conventions/subagents.md"
`subagents/` nests the exact same convention tree, so a team of specialists is just more
folders - built leaf-first.
:::
::: card title="Twelve gateway types" icon="phosphor-duotone:chats-circle" href="conventions/gateways.md"
Telegram, Slack, Discord, Email, WhatsApp, Teams, Twilio, GitHub and Signal, plus `http`,
`cli` and `mock`.
:::
::: card title="A web chat UI, generated" icon="phosphor-duotone:globe-hemisphere-west" href="conventions/web-ui.md"
Ask for it in `Agent.bx` and the build produces a themeable, streaming chat front end with
session history.
:::
:::

## Build one in four steps

::: stepper
::: step "Install"
=== "BoxLang"
    ```bash
    install-bx-module bx-ai bx-agents
    ```

=== "CommandBox"
    ```bash
    box install bx-ai,bx-agents
    ```
:::
::: step "Scaffold"
```bash
bxAgents new my-agent --model=openai/gpt-5
```
Then edit `instructions.md` and add whichever convention folders you need.
:::
::: step "Build"
```bash
bxAgents build
```
Discovery, validation, manifest, code generation - into `.build/app/`.
:::
::: step "Talk to it"
```bash
bxAgents chat
# or serve it over HTTP:
bxAgents serve --port=8080
```
:::
:::

## What `build` actually produces

Your convention tree, and the plain ColdBox application `build` turns it into.

::: columns
::: column
```
your-agent/
├── Agent.bx           # name, model, description
├── instructions.md    # the system prompt
├── tools/             # @AITool functions
├── skills/            # SKILL.md capabilities
├── subagents/         # nested agent trees
├── models/            # named model configs
├── gateways/          # HTTP/MCP/chat exposure
├── schedules/         # a real ColdBox scheduler
├── mcp/               # MCP servers you host
├── interceptors/      # lifecycle hooks
└── modules/           # module dependencies
```
:::
::: column
```
.build/app/
├── Application.bx
├── config/
│   ├── ColdBox.bx
│   ├── WireBox.bx
│   ├── Router.bx
│   └── Scheduler.bx
├── agent/
│   └── GeneratedAgentFactory.bx
├── tools/  skills/  mcp/
├── handlers/  interceptors/
└── index.bxm
```
:::
:::

::: expandable "Why assemble at build time instead of at request time?"
Most agent frameworks wire tools, skills, routes and schedules together **at request time**,
on every boot. BX Agents does the opposite: `bxAgents build` runs discovery, validation and
code generation exactly once, producing a plain ColdBox application under `.build/app/`.

Starting it - via `bxAgents serve`, a real
[`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
process, or a portable `.bxa` deployed anywhere BoxLang runs - is then just booting an
ordinary app. No convention scanning, no dynamic file walking, no build-time work deferred
into the request path.
:::

::: columns
::: column
!!! tip "Start with one file"
    Only `Agent.bx` is required. `instructions.md` is optional - set instructions directly
    in the class, or drop the file in and let the build wire it in. Every other folder only
    affects the generated output if it exists **and** has content in it - so you add
    conventions as you actually need them.
:::
::: column
!!! faq "Agent.bx IS the agent"
    `Agent.bx` extends BX AI's own `AiAgent` directly - the build instantiates your class
    rather than rebuilding one from a config struct, so what you write is what runs, and an
    IDE can introspect it like any other class. See [Agent.bx](conventions/agent-bx.md).
:::
:::

## Reach it from anywhere

::: cards
::: card title="Chat platforms" icon="phosphor-duotone:plugs-connected" href="conventions/gateways.md"
Nine push-style gateways - Telegram, Slack, Discord, Email, WhatsApp Cloud, Teams, Twilio,
GitHub and Signal - coordinated by one session with `queue` / `steer` / `interrupt` policies.
:::
::: card title="HTTP and MCP" icon="phosphor-duotone:stack" href="conventions/mcp.md"
Expose the agent over HTTP routes, or host local MCP servers from `mcp/` so other clients
can call your tools.
:::
::: card title="Ship it" icon="phosphor-duotone:package" href="deployment-and-secrets.md"
Package a portable `.bxa` and deploy it with `local`, `ssh`, `docker`, `digitalocean`,
`ftp` or `sftp` - secrets stay environment variables, never build artifacts.
:::
:::

## Where to go next

::: cards
::: card title="Installation" icon="phosphor-duotone:rocket-launch" href="getting-started/installation.md"
Install BoxLang, BX AI and BX Agents.
:::
::: card title="Quick Start" icon="phosphor-duotone:lightning" href="getting-started/quick-start.md"
Scaffold, build and chat with your first agent.
:::
::: card title="Conventions" icon="phosphor-duotone:cube" href="conventions/agent-bx.md"
One page per convention folder, start to finish.
:::
::: card title="The Build Pipeline" icon="phosphor-duotone:graph" href="build-pipeline.md"
Exactly what `build` does, in order.
:::
::: card title="CLI Reference" icon="phosphor-duotone:terminal-window" href="cli-reference.md"
Every verb and its flags.
:::
::: card title="Deployment & Secrets" icon="phosphor-duotone:cloud-arrow-up" href="deployment-and-secrets.md"
Package a `.bxa` and ship it, safely.
:::
:::

Every convention folder also has a working, buildable sample under
[`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples).

!!! warning
    BX Agents is under active development. [Known Limitations](known-limitations.md) tracks
    the honest gaps - what's tested against a real running app, what still only runs against
    BX AI's `"mock"` provider, and one real upstream ColdBox quirk this project ran into and
    worked around.
