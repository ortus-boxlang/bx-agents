---
title: "Scheduling Background Work"
icon: phosphor-duotone:clock-countdown
summary: schedules/*.bx - BoxLang schedulers, one file each, saying when with the task's own methods.
description: schedules/*.bx - BoxLang schedulers, one file each, saying when with the task's own methods.
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
			.everyDayAt( "00:00" )
			.call( () => run( "cleanup" ) )
			.withNoOverlaps()
	}

}
```

BoxLang's task methods say when: `.every( 15, "minutes" )`, `.everyDayAt( "09:00" )`,
`.onWeekdays( "08:30" )`, `.everyWeekOn( 1, "09:00" )`, `.startOn()`/`.endOn()`, `.when()`,
`.withNoOverlaps()`, lifecycle hooks, timezones. `.cron()` works with **six** fields
(second first); a five-field one does not fire on BoxLang 1.19.0, see
[schedules/](../conventions/schedules.md#cron).

## Retrieving your agent

`run( ... )` sends a message to the **default agent**, the root agent your
`Agent.yml` defines. `agent( "TheAgentName" )` gets any other agent in the tree by the
`name` its definition declares (see [Composing Subagents](11-composing-subagents.md)):

```javascript
task( "weekly-digest" )
	.everyWeekOn( 1, "08:00" )
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

(With the BoxLang 1.19.0 launcher a quoted value with spaces is split at the spaces; see [Quoting flag values](../cli-reference.md#quoting-flag-values).)

`add schedule` writes `schedules/<Name>.bx` with the task's own methods (this one is
`.onWeekdays( "08:30" )`); `inspect` lists each scheduler with its tasks, when each
runs and the agent. A cron expression you pass to `--when` is written as a six-field
`.cron()`.

Full reference: [schedules/](../conventions/schedules.md).

Next: [Hosting and Consuming MCP Servers](17-hosting-mcp-servers.md)
