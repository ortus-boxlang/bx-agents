---
title: "Example: A Scheduled Agent"
icon: phosphor-duotone:alarm
summary: Wake an agent on a cron schedule, no separate cron daemon needed.
description: Wake an agent on a cron schedule, no separate cron daemon needed.
tags: [guides, examples, schedules]
---

# Example: A Scheduled Agent

[`examples/scheduled-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/scheduled-agent) wakes an agent nightly with a BoxLang scheduler under `schedules/` - plain [Schedules](../conventions/schedules.md) code with BoxLang's own task DSL and cron syntax.

## The project

```
scheduled-agent/
├── Agent.yaml
├── instructions.md
└── schedules/
    └── Nightly.bx
```

`Agent.yaml` is the same shape as every other example - nothing special is needed on the agent side to be schedule-driven:

```yaml
name: scheduled-agent
description: An agent that wakes up on a cron schedule via schedules/.
model: mock/mock-model
```

## The scheduler

`schedules/Nightly.bx` is a plain class. The build adds the base class that provides `task()` and `run()`:

```javascript
class {

	function configure() {
		task( "nightly" )
			.cron( "0 0 * * *" )
			.call( () => run( "cleanup" ) )
			.withNoOverlaps()
	}

}
```

The full BoxLang task DSL is available - `cron()`, `every()`, `everyDayAt()`, `withNoOverlaps()`, `onFailure()` and the rest, not a subset BxAgents reimplements (see [`schedules/`](../conventions/schedules.md)).

`run( "cleanup" )` sends the message to the project's default agent, the root agent. To reach a subagent, use `agent( "TheAgentName" ).run( ... )`: every agent in a project's tree is registered under its own declared `name`.

## Instructions for the scheduled prompt

The instructions describe what the agent should do when `run( "cleanup" )` fires - there's no difference, from the agent's point of view, between a scheduled wake-up and a chat message; both are just a `run()` call with some input text:

```markdown
## Scheduled Agent

You run periodic housekeeping prompts. When asked to "cleanup", summarize
what a cleanup pass would involve for a typical project.
```

## Build and run

Unlike a plain `bxAgents chat` (which loads the agent in the chat process and never boots ColdBox), schedulers only start with the served app, so this one needs `serve`. `bxAgents chat --server` also starts the app, as a throwaway local server, and chats with it:

```bash
cd examples/scheduled-agent
bxAgents build
bxAgents serve
```

The `nightly` task fires automatically once `serve` is running - no separate cron daemon, no OS-level `cron` entry. BoxLang's own scheduler drives it, on the schedule declared in `Nightly.bx`.

To add another schedule to your own project, run `bxAgents add schedule`. It asks when (for example `daily 09:00` or `every 15 minutes`), what to tell the agent and which agent, and writes `schedules/<Name>.bx`. `bxAgents inspect` lists the schedules a project has.

!!! info
    `build` checks the scheduler's file name and that it is a class, but not the *contents* of `configure()` - a typo in an `agent()` call or a reference to an agent name that doesn't exist will pass `build` cleanly and only surface once the generated app actually boots.

## Where to go next

- [Schedules](../conventions/schedules.md) for the helpers a scheduler gets and the cron syntax.
- [Example: A Minimal Agent](example-minimal-agent.md) if you haven't seen the base project shape yet.
- [Example: Building a Web Chat Agent](example-web-chat-agent.md) for an agent reachable interactively instead of on a timer.
