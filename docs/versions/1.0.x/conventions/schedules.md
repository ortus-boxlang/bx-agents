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
			.everyDayAt( "00:00" )
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
| `task( name )` | BoxLang's task builder: `.every()`, `.everyDayAt()`, `.onWeekdays()`, `.cron()` (six fields), `.withNoOverlaps()`, `.call()` ... |
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
			.everyWeekOn( 1, "08:00" )
			.call( () => agent( "ResearchBot" ).run( "summarize this week's findings" ) )
	}

}
```

Everything is reached when a task fires, not when `configure()` runs, so a scheduler can be configured before ColdBox has finished starting.

If a class names a parent already (`class extends="my.BaseScheduler" {`), the build leaves it alone. Make your parent extend `bxagents.Scheduler` to keep the methods above.

## When it runs

Say it with the task's own methods. Each of these was served on BoxLang 1.19.0 and waited on until it fired:

```javascript
.every( 15, "minutes" )          // from when the app starts, then every 15 minutes
.everyHour()  .everyHourAt( 15 ) // every hour, or at :15
.everyDayAt( "09:00" )           // every day at 09:00
.onWeekdays( "08:30" )           // Monday to Friday; .onWeekends( "10:00" ) for the other two
.everyWeekOn( 1, "09:00" )       // 1 is Monday
.everyMonthOn( 1, "09:00" )
.onFirstBusinessDayOfTheMonth( "09:00" )
```

Times are `HH:mm` in the scheduler's timezone. Also available: `.startOn()`, `.endOn()`, `.when()`, `.withNoOverlaps()`, `.onSuccess()`, `.onFailure()` and timezones.

## Cron

`.cron( "..." )` needs **six fields**, with the second first:

```javascript
.cron( "0 */15 * * * *" )       // every 15 minutes
.cron( "0 0 9 * * 1-5" )        // 09:00:00 on weekdays
.cron( "0 30 8 * * MON-FRI" )   // 08:30:00 on weekdays
```

Lists (`1,3,5`), ranges (`1-5`), steps (`*/5`), month names (`JAN`) and day names (`MON`) work.

!!! warning "A five-field cron does not fire on BoxLang 1.19.0"
    BoxLang's documentation says `.cron()` takes five fields, and its parser accepts them, but a task written as `.cron( "* * * * *" )`, `.cron( "*/2 * * * *" )` or `.cron( "30 14 * * *" )` never ran in a served app or in a bare `boxlang schedule` run (minutes of waiting, no error). The same schedule as six fields, as `.every()` or as `.everyDayAt()`, ran on time. A five-field expression ticks once a minute and BoxLang then requires the second to be 0; in a probe the tick landed just before the minute, so the test failed every time. Treat it as a BoxLang bug: write six fields, or one of the methods above. `bxAgents add schedule` does this for you, and writes a typed five-field expression with a leading `0`.

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
