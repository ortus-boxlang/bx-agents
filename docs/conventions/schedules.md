# schedules/

Each `schedules/*.bx`/`.json` entry wakes the agent up on a cron schedule with a plain-text prompt:

```javascript
// schedules/nightly.bx
class {

	function configure() {
		return {
			cron   : "0 0 * * *",
			action : "cleanup"
		};
	}

}
```

This generates a ColdBox scheduled task in `config/Scheduler.bx` that calls the same singleton agent instance every request/chat session shares:

```javascript
task( "nightly" ).call( () => getInstance( "GeneratedAgent" ).run( "cleanup" ) ).everyDayAt( "00:00" )
```

There's no "does this action exist" check - `action` is just a prompt string, and any non-empty string is valid. The agent reasons/uses tools from there, exactly like a normal request.

## Cron support is a deliberately narrow subset

ColdBox's scheduler has **no** raw cron-string support - its DSL is named frequency methods (`every()`, `everyMinute()`, `everyHourAt()`, `everyDayAt()`, etc.). `schedules/*`'s 5-field cron expression (`minute hour day-of-month month day-of-week`) is translated to the closest matching frequency method. Only these shapes are supported:

| Cron shape | Example | Translates to |
|---|---|---|
| `*/N * * * *` | `*/15 * * * *` | `every( 15, "minutes" )` |
| `M */N * * *` | `0 */4 * * *` | `every( 4, "hours" )` |
| `* * * * *` | | `everyMinute()` |
| `M * * * *` | `30 * * * *` | `everyHourAt( 30 )` |
| `M H * * *` | `0 9 * * *` | `everyDayAt( "09:00" )` |

Day-of-month, month, and day-of-week fields **must** be `*` - any list, range, or non-`*` value in those fields (weekly/monthly schedules, day-of-week schedules) is rejected with a clear "no equivalent in ColdBox's frequency-method scheduler DSL yet" error, rather than silently guessed at.

## Validation

- `cron` must be present and match a valid 5-field cron pattern (checked independently of the translation-support check above, at [validation](../build-pipeline.md) time).
- `action` must be present and non-empty.
- An unsupported (but syntactically valid) cron shape fails at **generation** time with the message above, naming the exact supported shapes.
