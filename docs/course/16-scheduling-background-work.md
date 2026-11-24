---
title: "Scheduling Background Work"
icon: phosphor-duotone:clock-countdown
summary: schedules/*.bx - BoxLang schedulers, one file each, saying when with the task's own methods.
description: schedules/*.bx - BoxLang schedulers, one file each, saying when with the task's own methods.
tags: [course, conventions, scheduling]
---

# Scheduling Background Work

There are two ways to make an agent do something on a clock, for two different people.

| | Scheduler (`schedules/*.bx`) | Routine ([the last lesson](routines-and-reports.md)) |
|---|---|---|
| Made by | You, the developer, in a file | Anyone who uses the agent, by asking it |
| Lives | In the project, shipped with the agent | In the chat database, per person |
| Runs as | The app, with no person behind it | The person who made it |
| Changed by | Editing the file and rebuilding | Asking, while the app runs |
| When | BoxLang's task methods (this lesson) | A 5-field cron or `every 30m`, read in the routine's time zone |

Reach for a scheduler for what the *agent's owner* wants to happen whatever anyone says (a nightly clean-up, a digest
to a fixed audience). Reach for a routine for what one *person* wants ("every weekday at 9, check my orders").

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

Acme wants a digest every weekday morning. Write the scheduler. (`bxAgents add schedule` writes the same shape from
`--when` and `--prompt`; its phrases have spaces, so with the 1.19.0 launcher it is easier to write the file.) It
asks the `researcher` subagent from [Composing Subagents](11-composing-subagents.md) a question; `agent( "researcher" )`
finds it by the `name` its definition declares:

```javascript title="acme-support/schedules/Digest.bx"
class {

	function configure() {
		task( "morning-digest" )
			.onWeekdays( "08:30" )
			.call( () => agent( "researcher" ).run( "refund" ) )
			.withNoOverlaps()
	}

}
```

Build, and ask `inspect` what the project would schedule. `inspect` reads the source, so nothing has to run:

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents build
bxAgents inspect --section=schedule
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
...
Digest<anything>
...
morning-digest<anything>
...
```

The task runs while the app is served (`bxAgents serve`), at 08:30 on weekdays, and the course does not wait for a clock.
A five-field cron in `.cron()` does not fire on BoxLang 1.19.0, so use the task methods or six fields
(`0 30 8 * * MON-FRI`), as [schedules/](../conventions/schedules.md#cron) explains. Routines have no such trap: they
store a five-field cron and the app's own one-minute heartbeat reads it.

## Checkpoint

`acme-support/schedules/Digest.bx` exists. `kit/resume.sh 16-scheduling-background-work` restores it; rebuild after.

Full reference: [schedules/](../conventions/schedules.md).

Next: [Exposing Your Agent over HTTP and MCP](13-exposing-http-and-mcp.md)
