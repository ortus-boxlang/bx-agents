---
title: Quick Start
icon: 🚀
summary: "The full lifecycle of a project: scaffold, edit, build, run."
description: "The full lifecycle of a project: scaffold, edit, build, run."
tags: [getting-started]
---

# Quick Start

This walks through the full lifecycle of a BX Agents project: scaffold, edit, build, run.

## 1. Scaffold a project

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` is required (a `provider/model` slug - see [Agent.bx](../conventions/agent-bx.md) for how it's parsed). `--name` and `--description` are optional; `--name` defaults to the target directory's own name.

This creates:

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

`Agent.bx` looks like:

```javascript
class {

	function configure() {
		return {
			name        : "my-agent",
			model       : "openai/gpt-5",
			description : ""
		};
	}

}
```

Every convention folder is created empty - add files to the ones your agent actually needs and delete (or just ignore) the rest.

## 2. Edit

Open `instructions.md` and write the agent's system prompt. Add a tool:

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

See the [Conventions](../conventions/agent-bx.md) section for every other folder (`skills/`, `subagents/`, `gateways/`, `schedules/`, `mcp/`, `interceptors/`, `models/`, `modules/`).

## 3. Test it

```bash
cd tests && box install && cd ..   # once, to fetch testbox/
bxAgents test
```

The scaffolded `tests/specs/AgentSpec.bx` passes out of the box - it builds your agent against the `mock` provider (no API key or network needed) and asserts on a scripted response. See [tests/](../conventions/testing.md) for `mockResponses()` and the custom matchers (`toHaveCalledTool`, etc.) available to your own specs.

## 4. Build

```bash
bxAgents build
```

Runs the full [build pipeline](../build-pipeline.md) - config resolution, discovery, validation, code generation, manifest normalization - and writes a real ColdBox application to `.build/app/`, plus `.build/manifest.json`. Run `bxAgents build --environment=production` to build against an `Agent.bx` environment override (see [Agent.bx](../conventions/agent-bx.md)).

If your project fails validation (duplicate tool names, a bad cron expression, an unknown model provider, ...) `build` fails with every collected error - not just the first one.

## 5. Run it

Two ways to talk to the built agent - both load the exact same `GeneratedAgentFactory.bx` and build the exact same agent tree, so they never diverge:

**Interactively, from the terminal:**

```bash
bxAgents chat
```

**Over HTTP**, via a real [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) process:

```bash
bxAgents serve --port=8080
```

If your project has a `gateways/*` entry with `{ exposes: "agent", path: "/api/chat" }`, the agent is now reachable at `POST http://localhost:8080/api/chat/invoke` (and `/stream`, `/batch`, `/info` - see [gateways/](../conventions/gateways.md)).

!!! warning
    The very first request to a freshly booted app's `toAi()` route can transiently fail - see [Known Limitations](../known-limitations.md). Send a warm-up request before relying on it under load.

## 6. Inspect, package, deploy

```bash
bxAgents inspect              # pretty-print .build/manifest.json
bxAgents package --version=1.0.0   # writes dist/my-agent-1.0.0.bxa + .sha256
bxAgents deploy --destination=/path/to/somewhere   # copies the newest .bxa there
```

See [The Manifest](../manifest.md) and [Deployment & Secrets](../deployment-and-secrets.md).

## 7. Clean up

```bash
bxAgents clean
```

Removes `.build/` and `dist/` only - your source conventions (`Agent.bx`, `tools/`, etc.) are never touched.

## Next steps

- Walk through every convention folder in [Conventions](../conventions/agent-bx.md).
- Look at the working sample projects in [`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples).
- See every verb's flags in [CLI Reference](../cli-reference.md).