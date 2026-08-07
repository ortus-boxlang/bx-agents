# schedules/

`schedules/Scheduler.bx` - if present - is a **real, hand-written ColdBox scheduler class**, passed through into the build untouched (a plain file copy to `config/Scheduler.bx`, no generation, no translation):

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "SupportBot" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

There's nothing BX Agents-specific about the body of that file - it's ColdBox's own scheduler DSL, in full: `.cron( "0 9 * * 1-5" )`, `.everyWeekOn()`, `.startOn()`/`.endOn()`/`.between()`, `.when()`, `.withNoOverlaps()`, `before()`/`after()`/`onSuccess()`/`onFailure()` hooks, timezones - anything ColdBox's `ScheduledTask` supports, this project doesn't limit or reinterpret. (An earlier version of this convention was a `{ cron, action }` data shape translated into ColdBox's frequency-method DSL here - that translation only covered a narrow subset of cron and threw away everything else the real scheduler API offers, so it's gone. If you're migrating an old project, see below.)

## Retrieving an agent

Every agent in the project's tree - the root project's own `Agent.bx` and every `subagents/*` entry, however deeply nested - is registered in the generated `config/WireBox.bx` under its own declared `name` (the `name` field in its `Agent.bx`'s `configure()`). A schedule reaches whichever agent it wants with a plain `getInstance( "TheAgentName" )` - no BX Agents-specific lookup, just WireBox, exactly like the `getInstance()` calls elsewhere in a ColdBox app.

```javascript
// subagents/researcher/Agent.bx
function configure() {
	return {
		name  : "ResearchBot",
		model : "openai/gpt-5"
	};
}
```

```javascript
// schedules/Scheduler.bx
task( "weekly-digest" )
	.call( () => getInstance( "ResearchBot" ).run( "summarize this week's findings" ) )
	.everyWeekOn( 1, "08:00" )
```

Because `name` is now also a WireBox binding key, it must be **unique across the whole project** - `build` fails validation if two agents (root or subagent, at any depth) share a name, including two that both leave it unset and silently default to `"BxAi"`. See [subagents/](subagents.md#retrieving-an-agent-from-schedulesschedulerbx) for the distinction between a subagent's folder name (used to wire `subAgents: [...]`) and its own declared `name` (used here).

## Validation

- `build` only ever looks for exactly one file: `schedules/Scheduler.bx`. Anything else in `schedules/` (including old `{ cron, action }` files from before this convention changed) is ignored - `build` emits a warning if `schedules/` exists but has no `Scheduler.bx`, so a schedule that quietly stopped running is at least visible.
- Beyond that, `schedules/Scheduler.bx` is real code - the same kind of "we can't meaningfully validate this without a real ColdBox boot" territory as any other BoxLang class. A syntax error or a bad `getInstance()` name surfaces when the generated app actually boots (`serve`), not at `build` validation time.

## Migrating from the old `{ cron, action }` convention

Before, each file under `schedules/` was its own `{ cron: "0 0 * * *", action: "cleanup" }` entry, translated into a ColdBox frequency-method call against the single root `"GeneratedAgent"` binding. To migrate: delete those files, add one `schedules/Scheduler.bx` extending `coldbox.system.web.tasks.ColdBoxScheduler`, and for each old entry add a `task( name ).call( () => getInstance( "TheAgentName" ).run( "action text" ) )` with whichever real ColdBox frequency method or `.cron()` call matches the old cron expression.
