# BX Agents

**BX Agents** is a conventions-based AI agent framework for [BoxLang](https://boxlang.io), built on top of [ColdBox](https://coldbox.ortusbooks.com) and [BX AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai). You describe an agent with a handful of files and folders - an `Agent.bx`, an `instructions.md`, and whichever of `tools/`, `skills/`, `subagents/`, `gateways/`, `schedules/`, `mcp/`, `interceptors/`, `models/`, `modules/` your agent actually needs - and BX Agents assembles a real, runnable ColdBox application from it at **build time**.

{% hint style="info" %}
Describe the agent with files and folders, not a framework's API surface.
{% endhint %}

## Why build-time assembly?

Every other agent framework wires tools, skills, routes, and schedules together **at request time**, on every boot. BX Agents does the opposite: `bxAgents build` runs discovery, validation, and code generation exactly once, producing a plain ColdBox application under `.build/app/`. Starting that application - via `bxAgents serve`, a real [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) process, or packaged into a portable `.bxa` and deployed anywhere BoxLang runs - is then just booting an ordinary app. No convention-scanning, no dynamic file-walking, no build-time work deferred into the request path.

```
your-agent/
├── Agent.bx              # name, model, description, environment overrides
├── instructions.md        # the system prompt
├── tools/                 # @AITool-annotated functions
├── skills/                # SKILL.md-convention capabilities
├── subagents/             # nested Agent.bx + instructions.md trees
├── models/                # reusable named model configs
├── gateways/              # HTTP/MCP exposure + channel-adapter registrations
├── schedules/              # Scheduler.bx - a real ColdBox scheduler, passed through untouched
├── mcp/                   # local MCP servers this agent hosts
├── interceptors/          # @scope("agent"|"runtime") lifecycle hooks
└── modules/                # BoxLang module dependencies
        │
        │  bxAgents build
        ▼
.build/app/                # a real, plain ColdBox application
├── Application.bx
├── config/
│   ├── ColdBox.bx
│   ├── WireBox.bx
│   ├── Router.bx
│   └── Scheduler.bx
├── agent/GeneratedAgentFactory.bx
├── tools/, skills/, mcp/, handlers/, interceptors/
└── index.bxm
```

Only `Agent.bx` and `instructions.md` are required - every other folder is optional and only affects the generated output if it exists and has content in it.

## Where to go next

| If you want to... | Read |
|---|---|
| Install BX Agents and scaffold your first agent | [Installation](getting-started/installation.md), then [Quick Start](getting-started/quick-start.md) |
| Learn one specific convention folder | The [Conventions](conventions/agent-bx.md) section |
| Understand exactly what `build` does, in order | [The Build Pipeline](build-pipeline.md) |
| Look up a CLI verb's flags | [CLI Reference](cli-reference.md) |
| Ship a `.bxa` somewhere | [Deployment & Secrets](deployment-and-secrets.md) |
| See working, buildable sample projects | [`examples/`](../examples/README.md) at the repo root |

{% hint style="warning" %}
BX Agents is under active development. [Known Limitations](known-limitations.md) tracks the honest gaps - what's tested against a real running app, what still only runs against BX AI's `"mock"` provider, and one real upstream ColdBox quirk this project ran into and worked around.
{% endhint %}
