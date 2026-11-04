---
title: "Lesson 16: Scheduling Background Work"
icon: phosphor-duotone:clock-countdown
summary: schedules/*.bx - BoxLang schedulers, one file each, with cron syntax.
description: schedules/*.bx - BoxLang schedulers, one file each, with cron syntax.
tags: [course, conventions, scheduling]
---

# Scheduling Background Work

Every `schedules/*.bx` is a **BoxLang scheduler**: a plain class whose `configure()`
builds tasks. There is no ColdBox in it and nothing to extend - the build adds the
base class that gives it `task()`, `run()` and `agent()`.

```javascript
// schedules/Nightly.bx
class {

	function configure() {
		task( "nightly" )
			.cron( "0 0 * * *" )
			.call( () => run( "cleanup" ) )
			.withNoOverlaps()
	}

}
```

`.cron()` takes five fields (`minute hour day-of-month month day-of-week`) or six, with
seconds in front. BoxLang's other task methods work too: `.every( 15, "minutes" )`,
`.everyDayAt( "09:00" )`, `.onWeekdays( "08:30" )`, `.startOn()`/`.endOn()`, `.when()`,
`.withNoOverlaps()`, lifecycle hooks, timezones.

## Retrieving your agent

`run( ... )` sends a message to the **default agent**, the root agent your
`Agent.yaml` defines. `agent( "TheAgentName" )` gets any other agent in the tree by the
`name` its definition declares (see [Lesson 11](11-composing-subagents.md)):

```javascript
task( "weekly-digest" )
	.cron( "0 8 * * MON" )
	.call( () => agent( "ResearchBot" ).run( "summarize this week's findings" ) )
```

## Many schedulers

Each file is its own scheduler, so group tasks however you like: one file per job, or
related tasks together. BoxLang starts them with the app and stops them with it, so they
run while the app is served.

## Validation

`build` checks that each file name is a valid class name (`MyJob.bx`, not `my-job.bx`),
that a scheduler does not extend ColdBox's scheduler any more, and warns about a file in
`schedules/` that is not a `.bx` file. The body is real code: a syntax error or a bad
agent name surfaces when the app starts (`serve`), not at `build`.

## Try it

```bash
bxAgents add schedule --when="weekdays 08:30" --prompt="Summarize yesterday's findings"
bxAgents build --verbose
bxAgents inspect --section=schedule
```

`add schedule` writes `schedules/<Name>.bx`; `inspect` lists each scheduler with its
tasks, cron and agent.

Full reference: [schedules/](../conventions/schedules.md).

Next: [Lesson 17 - Hosting and Consuming MCP Servers](17-hosting-mcp-servers.md)
