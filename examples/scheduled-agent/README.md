# scheduled-agent

An agent woken up nightly by a `schedules/` entry, generating a ColdBox scheduled task in `config/Scheduler.bx`:

```javascript
task( "nightly" ).call( () => getInstance( "GeneratedAgent" ).run( "cleanup" ) ).everyDayAt( "00:00" )
```

```bash
bxAgents build
bxAgents serve
```

The task fires automatically once `serve` is running, no separate cron daemon needed - ColdBox's own scheduler drives it.

See [schedules/](../../docs/conventions/schedules.md) for the supported cron-shape subset.
