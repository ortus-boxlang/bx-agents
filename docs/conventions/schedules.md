---
title: schedules/
icon: phosphor-duotone:clock-countdown
summary: BoxLang schedulers, one file each, with cron syntax and the agent a call away.
description: BoxLang schedulers, one file each, with cron syntax and the agent a call away.
tags: [conventions, scheduling]
---

# schedules/

Every `schedules/*.bx` is a **BoxLang scheduler**: a plain class whose `configure()` builds tasks with BoxLang's own task DSL. There is no ColdBox in it and nothing to extend:

```javascript
// schedules/Nightly.bx
class {

	function configure() {
		task( "cleanup" )
			.cron( "0 0 * * *" )
			.call( () => run( "clean up old tickets" ) )
			.withNoOverlaps()
	}

}
```

The build copies each file into the app as `schedules/<Name>.bx`, lists them in `this.schedulers` of the [generated base `Application`](application-bx.md), and BoxLang starts them with the app and stops them with it. They run while the app is served (`bxAgents serve`).

!!! note
    A scheduler is for the developer. For prompts that the people who use the agent make for themselves, by asking it, see [routines](routines.md).

!!! tip
    `bxAgents add schedule` writes one for you: say when it runs, what to tell the agent, and which agent. See [`add`](../cli-reference.md#add-schedule).

## What you get without writing an `extends`

The build adds `extends="bxagents.Scheduler"` to any scheduler class that names no parent of its own. That class is copied into the app (`bxagents/Scheduler.bx`) and gives your scheduler these methods:

| Method | What it does |
|---|---|
| `task( name )` | BoxLang's task builder: `.cron()`, `.every()`, `.everyDayAt()`, `.withNoOverlaps()`, `.call()` ... |
| `run( input, params, options )` | Sends a message to the **default agent**, the root agent your `Agent.yaml` or `Agent.bx` defines. Takes the agent's own `run()` arguments. |
| `agent( name )` | Any agent in the project tree by the `name` its own definition declares, root or subagent at any depth. With no name it is the default agent. |
| `defaultAgent()` | The root agent. |
| `getInstance( dsl )` | WireBox's `getInstance()`, for anything else the app registered. |
| `controller()` | The running ColdBox controller. |

```javascript
// schedules/Digest.bx
class {

	function configure() {
		task( "weekly-digest" )
			.cron( "0 8 * * MON" )
			.call( () => agent( "ResearchBot" ).run( "summarize this week's findings" ) )
	}

}
```

Everything is reached when a task fires, not when `configure()` runs, so a scheduler can be configured before ColdBox has finished starting.

If a class names a parent already (`class extends="my.BaseScheduler" {`), the build leaves it alone. Make your parent extend `bxagents.Scheduler` to keep the methods above.

## Cron

`.cron( "..." )` is BoxLang's own and takes **5 fields** (`minute hour day-of-month month day-of-week`) or **6 fields** with seconds in front:

```javascript
.cron( "*/15 * * * *" )        // every 15 minutes
.cron( "0 9 * * 1-5" )         // 09:00 on weekdays
.cron( "0 30 8 * * MON-FRI" )  // 08:30:00 on weekdays (six fields)
```

Lists (`1,3,5`), ranges (`1-5`), steps (`*/5`), month names (`JAN`) and day names (`MON`) work. Anything else the task DSL offers is there too: `.every( 15, "minutes" )`, `.everyDayAt( "09:00" )`, `.onWeekdays( "08:30" )`, `.onFirstBusinessDayOfTheMonth( "09:00" )`, `.startOn()`, `.endOn()`, `.when()`, `.withNoOverlaps()`, `.onSuccess()`, `.onFailure()`, timezones.

## Retrieving an agent

Every agent in the project's tree is registered in the generated `config/WireBox.bx` under its own declared `name`. `agent( "ResearchBot" )` resolves it, and `run( ... )` is the root agent. Because `name` is also a WireBox binding key it must be **unique across the whole project** - `build` fails validation if two agents share one. See [subagents/](subagents.md#retrieving-an-agent-from-schedules).

```yaml
# subagents/researcher/Agent.yaml
name: ResearchBot
model: openai/gpt-5
```

## Validation

`build` checks, because each would otherwise only fail when the app starts:

- the file name becomes the class name (`schedules.<Name>`), so it must be letters, digits and underscores, starting with a letter or underscore. `my-job.bx` is refused; `MyJob.bx` is fine;
- two files that would make the same scheduler class are refused: rename one;
- a scheduler that extends `coldbox.system.web.tasks.ColdBoxScheduler` is refused, with what to change;
- a file in `schedules/` that is not a `.bx` file is ignored, with a warning so a schedule that quietly stopped running is visible.

A syntax error or a wrong agent name in the body surfaces when the app starts (`serve`), like any other BoxLang class.

!!! note "ColdBox's scheduler is a separate thing"
    Chat-platform [gateways](gateways/index.md) register their polling tasks with ColdBox's own app scheduler. That is untouched, and a project's `schedules/` never go through it.
