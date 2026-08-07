# scheduled-agent

An agent woken up nightly by `schedules/Scheduler.bx` - a real, hand-written ColdBox scheduler class, passed through into the build untouched:

```javascript
task( "nightly" )
	.call( () => getInstance( "scheduled-agent" ).run( "cleanup" ) )
	.everyDayAt( "00:00" )
	.withNoOverlaps()
```

```bash
bxAgents build
bxAgents serve
```

The task fires automatically once `serve` is running, no separate cron daemon needed - ColdBox's own scheduler drives it. `getInstance( "scheduled-agent" )` resolves by this project's own `Agent.bx`-declared `name` - every agent in a project's tree is registered under its own name, not just the root.

See [schedules/](../../docs/conventions/schedules.md) for the full scheduler DSL this file can use.
