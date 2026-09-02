---
title: "Example: A Scheduled Agent"
icon: phosphor-duotone:alarm
summary: Wake an agent on a real ColdBox cron schedule, no separate cron daemon needed.
description: Wake an agent on a real ColdBox cron schedule, no separate cron daemon needed.
tags: [guides, examples, schedules]
---

# Example: A Scheduled Agent

[`examples/scheduled-agent/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/scheduled-agent) wakes an agent nightly via a real, hand-written ColdBox scheduler class under `schedules/` - proof that [Schedules](../conventions/schedules.md) are not a BxAgents-invented DSL, but real ColdBox code passed through the build untouched.

## The project

```
scheduled-agent/
├── Agent.bx
├── instructions.md
└── schedules/
    └── Scheduler.bx
```

`Agent.bx` is the same shape as every other example - nothing special is needed on the agent side to be schedule-driven:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "scheduled-agent",
			description : "An agent that wakes up on a cron schedule via schedules/.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

## The scheduler

`schedules/Scheduler.bx` extends ColdBox's own `ColdBoxScheduler` and uses its real fluent task DSL:

```javascript
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "scheduled-agent" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

Because `build` copies this file into the generated app essentially as-is (see [`schedules/`](../conventions/schedules.md)), the full ColdBox scheduler DSL is available - `everyDayAt()`, `everyMinute()`, `withNoOverlaps()`, `onFailure()`, and everything else ColdBox's own scheduler supports, not a subset BxAgents reimplements.

`getInstance( "scheduled-agent" )` resolves by this project's own `Agent.bx`-declared `name` - every agent in a project's tree is registered under its own name in WireBox, not just the root, which is what makes this line work without any extra wiring.

## Instructions for the scheduled prompt

The instructions describe what the agent should do when `run( "cleanup" )` fires - there's no difference, from the agent's point of view, between a scheduled wake-up and a chat message; both are just a `run()` call with some input text:

```markdown
## Scheduled Agent

You run periodic housekeeping prompts. When asked to "cleanup", summarize
what a cleanup pass would involve for a typical project.
```

## Build and run

Unlike `chat` (which never boots ColdBox at all - see [Known Limitations](../known-limitations.md)), the scheduler only actually fires under a real ColdBox boot, so this one needs `serve`, not `chat`:

```bash
cd examples/scheduled-agent
bxAgents build
bxAgents serve
```

The `nightly` task fires automatically once `serve` is running - no separate cron daemon, no OS-level `cron` entry. ColdBox's own in-process scheduler thread drives it, on the schedule declared in `Scheduler.bx`.

{% hint style="info" %}
`build` cannot meaningfully validate the *contents* of `Scheduler.bx` beyond checking that the file exists - a typo in a `getInstance()` call or a reference to an agent name that doesn't exist will pass `build` cleanly and only surface once the generated app actually boots. See [Known Limitations](../known-limitations.md) for the current state of that gap.
{% endhint %}

## Where to go next

- [Schedules](../conventions/schedules.md) for the full scheduler DSL and where the generated `config/Scheduler.bx` lands in the build output.
- [Example: A Minimal Agent](example-minimal-agent.md) if you haven't seen the base project shape yet.
- [Example: Building a Web Chat Agent](example-web-chat-agent.md) for an agent reachable interactively instead of on a timer.
