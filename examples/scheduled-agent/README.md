# scheduled-agent

An agent woken up nightly by `schedules/Nightly.bx` - a BoxLang scheduler. It is a plain class: `build` gives it the base class that provides `task()` and `run()`.

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

```bash
bxAgents build
bxAgents serve
```

The task fires automatically once `serve` is running, no separate cron daemon needed - BoxLang's own scheduler drives it. `run( "cleanup" )` sends the message to the project's default agent, the root agent. To reach another agent in the tree, call `agent( "TheAgentName" ).run( ... )`, by the `name` its own definition declares.

See [schedules/](../../docs/conventions/schedules.md) for the helpers a scheduler gets and the cron syntax.
