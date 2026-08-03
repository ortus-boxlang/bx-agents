# Known Limitations

BX Agents is under active development. This page tracks the honest gaps - what's tested against a real running app, what still only runs against bx-ai's `"mock"` provider, and real upstream quirks this project ran into.

## Testing runs against the `mock` provider only

Every fast-lane spec (build pipeline, generators, CLI verbs) and the [ColdBox integration suite](#real-coldbox-integration-testing) exercise bx-ai's built-in `"mock"` provider - never a real network call to an LLM. This is deliberate (fast, free, deterministic CI), but it means no automated test currently proves a real provider (OpenAI, Anthropic, etc.) actually round-trips correctly end-to-end. Do at least one manual `chat`/`serve` run against a real provider and a throwaway API key before depending on this in production.

## Real ColdBox integration testing

`./gradlew testColdBoxIntegration` boots a **real** `boxlang-miniserver` process against a generated app's own `Application.bx`/`Bootstrap`, and makes a genuine HTTP request through a `toAi()`-registered route. This is the strongest proof point in the suite - it caught three real bugs in `ColdBoxAppGenerator.bx` during development (a missing WireBox `Binder` `extends`, wrong `Bootstrap` constructor argument order, and a bare `getInstance()` call that doesn't exist on `Binder`).

### The `toAi()` first-request race

The **very first** HTTP request to a freshly booted app's `toAi()` route can transiently fail with "Function [getInstance] not found" - a genuine ColdBox/WireBox lazy-injection race on the Router's own `getInstance` delegate, not a BX Agents bug. It succeeds reliably on every request after something else has already forced WireBox to build the `GeneratedAgent` singleton once (a health check, a `chat` session, another route). **Send a warm-up request** before relying on a freshly deployed `toAi()` route under load.

## Three integration checks are still skipped

`tests/specs/integration/RuntimeStartupSmokeSpec.bx` skips three checks (`xit`) because they need `coldbox-platform` fetched as a resolvable module/mapping for the generated app's `Bootstrap` call - a larger dependency addition than the `boxlang-miniserver` binary this project already fetches for the ColdBox integration suite above:

- A real ColdBox-routed HTTP request reaching the generated agent end-to-end (superseded, in practice, by the ColdBox integration suite above - which does fetch a real ColdBox and does prove exactly this).
- A sub-minute test-cron schedule actually firing within a poll window (needs a live ColdBox `Scheduler` under a real boot).
- `chat` and a `serve`d HTTP route resolving to the **same** WireBox singleton (needs a live ColdBox+WireBox container).

## No real CLI *process* test

CLI verb specs (`tests/specs/cli/*.bx`, `tests/specs/ModuleConfigCliSpec.bx`) call `ModuleConfig.main([...])`/each verb's `run()` directly, in-process - proving the dispatch and business logic, but never spawning a genuine `boxlang module:bxAgents <verb>` OS process. A real process-level smoke test (argv → exit code → files on disk, from an actual shell invocation) doesn't exist yet.

## `serve`'s miniserver lookup is PATH-only

`serve` looks for `boxlang-miniserver` only on `PATH` (`MiniServerLauncher.findExecutable()`). There's no fallback to a configured path or a bundled binary - if it isn't installed and on `PATH`, `serve` fails with a clear, actionable error, but there's no alternate way to point it at one.

## `chat` needs a real TTY

`chat` uses BoxLang's own `MiniConsole`, which shells out to `stty` to set up raw terminal mode - it can only run against a genuine interactive terminal. It doesn't work piped, redirected, or from a non-interactive process (a CI job, a script). There's no non-interactive fallback mode.

## No box.json `executable` install smoke test

`box.json` declares `"boxlang": { "executable": "bxAgents" }` so a real module install produces a native `bxAgents` command (see [Installation](getting-started/installation.md)). This wiring itself isn't exercised by an automated test - it relies on the BoxLang module installer's own documented behavior for generating executable wrappers, verified by reading its source, not by an install-and-run test in this repo's own CI.

## Scheduler cron support is a narrow subset

Only a handful of cron shapes translate to ColdBox's frequency-method scheduler DSL - see [schedules/](conventions/schedules.md#cron-support-is-a-deliberately-narrow-subset). Weekly/monthly/day-of-week schedules are rejected outright rather than approximated.

## `deploy` supports one target

Only a `local` (directory copy) deployment target ships in this version - see [Deployment & Secrets](deployment-and-secrets.md#deploying). A real pluggable target interface can be added once a second target actually exists.
