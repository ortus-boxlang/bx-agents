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

ColdBox's scheduler has **no** raw cron-string support - its DSL is named frequency methods (`every()`, `everyMinute()`, `everyHourAt()`, `everyDayAt()`, `everyWeekOn()`, `everyMonthOn()`, `everyYearOn()`, etc.). `schedules/*`'s 5-field cron expression (`minute hour day-of-month month day-of-week`) is translated to the closest matching frequency method. Only these shapes are supported - and only with **exact single values**, never lists, ranges, or step values in the day-of-month/month/day-of-week positions:

| Cron shape | Example | Translates to |
|---|---|---|
| `*/N * * * *` | `*/15 * * * *` | `every( 15, "minutes" )` |
| `M */N * * *` | `0 */4 * * *` | `every( 4, "hours" )` |
| `* * * * *` | | `everyMinute()` |
| `M * * * *` | `30 * * * *` | `everyHourAt( 30 )` |
| `M H * * *` | `0 9 * * *` | `everyDayAt( "09:00" )` |
| `M H * * D` | `0 9 * * 1` | `everyWeekOn( 1, "09:00" )` - weekly |
| `M H D * *` | `0 6 1 * *` | `everyMonthOn( 1, "06:00" )` - monthly |
| `M H D Mo *` | `0 0 25 12 *` | `everyYearOn( 12, 25, "00:00" )` - yearly |

Day-of-week (`D`) follows standard cron numbering - `0`-`7`, where both `0` and `7` mean Sunday and `1`-`6` are Monday-Saturday - and is remapped internally to ColdBox's own `1` (Monday) → `7` (Sunday) convention for `everyWeekOn()`. `D` and day-of-month (`D` in the `M H D * *` shape) may not both be non-`*` at once - ColdBox's `everyWeekOn()`/`everyMonthOn()` each only accept one of the two, so a cron combining both has no equivalent.

Anything else - a list (`1,3,5`), a range (`1-5`), a step value (`*/2`) in the day-of-month/month/day-of-week positions, or an out-of-range value (e.g. day-of-week `9`) - is rejected with a clear "no equivalent in ColdBox's frequency-method scheduler DSL yet" error, rather than silently guessed at.

## Validation

- `cron` must be present and match a valid 5-field cron pattern (checked at [validation](../build-pipeline.md) time). This regex checks shape only - it does not bound day-of-week/day-of-month/month to their valid numeric ranges.
- `action` must be present and non-empty - also checked at validation time.
- An unsupported (or out-of-range, or syntactically valid but structurally ambiguous) cron shape is ALSO caught at **validation** time: `ProjectValidator` calls the same translation logic `SchedulerGenerator` uses to render `config/Scheduler.bx` (`SchedulerGenerator.isSupportedCron()`), so a cron shape it can't translate is reported alongside every other error in one pass, naming the exact supported shapes - it never gets as far as generation.
