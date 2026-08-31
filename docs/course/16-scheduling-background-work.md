---
title: "Lesson 16: Scheduling Background Work"
icon: phosphor-duotone:clock-countdown
summary: schedules/Scheduler.bx - a real, hand-written ColdBox scheduler, passed through untouched.
description: schedules/Scheduler.bx - a real, hand-written ColdBox scheduler, passed through untouched.
tags: [course, conventions, scheduling]
---

# Scheduling Background Work

`schedules/Scheduler.bx` - if present - is a **real, hand-written ColdBox scheduler
class**, passed through into the build untouched: a plain file copy to
`config/Scheduler.bx`, no generation, no translation.

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "my-agent" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

There's nothing BxAgents-specific about the body of that file - it's ColdBox's own
scheduler DSL, in full: `.cron( "0 9 * * 1-5" )`, `.everyWeekOn()`, `.startOn()`/
`.endOn()`/`.between()`, `.when()`, `.withNoOverlaps()`, lifecycle hooks, timezones -
anything ColdBox's `ScheduledTask` supports.

## Retrieving your agent

Every agent in your project's tree - the root project and every `subagents/*` entry -
is registered in the generated `config/WireBox.bx` under its own declared `name` (see
[Lesson 11](11-composing-subagents.md)). A schedule reaches whichever agent it wants
with a plain `getInstance( "TheAgentName" )` - no BxAgents-specific lookup, just
WireBox.

```javascript
task( "weekly-digest" )
	.call( () => getInstance( "ResearchBot" ).run( "summarize this week's findings" ) )
	.everyWeekOn( 1, "08:00" )
```

## Validation

`build` only ever looks for exactly one file: `schedules/Scheduler.bx`. Anything else
in `schedules/` is ignored, and `build` emits a **warning** (not an error) if
`schedules/` exists but has no `Scheduler.bx` in it - so a schedule that quietly
stopped running is at least visible. Beyond that, it's real code: a syntax error or a
bad `getInstance()` name surfaces when the generated app actually boots (`serve`), not
at `build` validation time.

## Try it

Add a `schedules/Scheduler.bx` that calls your root agent once a day, then build and
inspect the generated `.build/app/config/Scheduler.bx` - you'll see your file copied
through byte-for-byte.

```bash
bxAgents build --verbose
```

The verbose output tells you whether a `schedules/Scheduler.bx` was found.

Full reference: [schedules/](../conventions/schedules.md).

Next: [Lesson 17 - Hosting and Consuming MCP Servers](17-hosting-mcp-servers.md)
