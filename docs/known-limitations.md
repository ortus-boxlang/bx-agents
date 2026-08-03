# Known Limitations

BX Agents is under active development. This page tracks the honest gaps - what's tested against a real running app, what still only runs against bx-ai's `"mock"` provider, and real upstream quirks this project ran into.

## Testing runs against the `mock` provider only

Every fast-lane spec (build pipeline, generators, CLI verbs) and the [ColdBox integration suite](#real-coldbox-integration-testing) exercise bx-ai's built-in `"mock"` provider - never a real network call to an LLM. This is deliberate (fast, free, deterministic CI), but it means no automated test currently proves a real provider (OpenAI, Anthropic, etc.) actually round-trips correctly end-to-end. Do at least one manual `chat`/`serve` run against a real provider and a throwaway API key before depending on this in production.

## Real ColdBox integration testing

`./gradlew testColdBoxIntegration` boots a **real** `boxlang-miniserver` process against a generated app's own `Application.bx`/`Bootstrap`, and makes a genuine HTTP request through a `toAi()`-registered route. This is the strongest proof point in the suite - it caught three real bugs in `ColdBoxAppGenerator.bx` during development (a missing WireBox `Binder` `extends`, wrong `Bootstrap` constructor argument order, and a bare `getInstance()` call that doesn't exist on `Binder`).

### The `toAi()` first-request race

The **very first** HTTP request to a freshly booted app's `toAi()` route can transiently fail with "Function [getInstance] not found" - a genuine ColdBox/WireBox lazy-injection race on the Router's own `getInstance` delegate, not a BX Agents bug. It succeeds reliably on every request after something else has already forced WireBox to build the `GeneratedAgent` singleton once (a health check, a `chat` session, another route). **Send a warm-up request** before relying on a freshly deployed `toAi()` route under load.

## Three integration checks - closed via a different route than originally planned

`tests/specs/integration/RuntimeStartupSmokeSpec.bx` still has three `xit()`s, since this file runs via the CLI runner (`runTests.bxs`/`testBx`), and BoxLang's CLI mode never gives a `cgi` scope - which ColdBox's RoutingService needs even to load the router at startup. That's a structural fact about CLI mode, not a gap: all three checks are now proven for real elsewhere, in `tests/specs/integration/coldbox/ColdBoxRuntimeSpec.bx` (which runs inside a real HTTP request served by a real `boxlang-miniserver` process):

- A real ColdBox-routed HTTP request reaching the generated agent end-to-end - proven by `ColdBoxRuntimeSpec.bx` plus `runColdBoxIntegrationTests.bxs`'s own `POST /api/chat/invoke` assertion.
- `schedules/*` actually registering with a **live** ColdBox `Scheduler` - proven via `SchedulerService.getSchedulers()["appScheduler@coldbox"].hasTask(...)` against a real boot, without waiting out an actual cron fire (the coarsest supported granularity is 1 minute, which would tax every CI run for marginal extra proof once the task is confirmed live and registered).
- `chat` and a `serve`d HTTP route never diverging - corrected from its original wording (`chat` deliberately never boots WireBox at all, so it can never share WireBox's singleton *object* by design) to what actually matters: instantiating `GeneratedAgentFactory` outside of WireBox produces a behaviorally-equivalent agent to WireBox's own singleton.

## Real OS-process CLI testing - and a real bug it found

`ModuleCliProcessTest.java` spawns genuine `java -jar <boxlang-jar> module:bxagents <verb> ...` child processes against a copy of the actual installable module structure (`build/modules/bxagents`), pointed at a real `modulesDirectory` - exactly how a real BoxLang installation loads this module. Every other CLI spec calls `ModuleConfig.main()`/each verb's `run()` in-process instead, which is faster but never proves the module resolves correctly once genuinely installed.

That gap was real: this test caught every CLI verb failing with "class not located" the moment it ran through an actual installed-module process, because internal cross-references used a bare `bxagents.models....` dotted path that only ever resolved thanks to this repo's own dev/test `boxlang.json` (a hand-declared `/bxagents` mapping) - a genuinely installed module never gets that mapping. Fixed by switching every nested class's internal references to the `Class@bxagents` module-relative suffix form (`ModuleConfig.bx` itself, sitting at the module root, resolves plain relative paths fine and needed no change) - see `BuildPipeline.bx`'s `init()` docblock for the full explanation. `build.gradle`'s module-structure output moved from `build/module` to `build/modules/bxagents` (folder name must equal the module name for `modulesDirectory` discovery to find it at all) and the dev/test `boxlang.json` now also loads it as a real module, so the whole existing suite exercises the same resolution path production does, not just the convenience mapping.

## A real, foundational bug found building the testing framework: agents never received their own tools

Building `BaseAgentSpec`'s `toHaveCalledTool` matcher (M15) surfaced a serious, previously-undiscovered bug: `ColdBoxAppGenerator`'s generated `aiAgent()` call never passed a `tools:` argument at all - confirmed against real bx-ai source (`AiAgent.bx` never references `aiToolRegistry()` internally). A project's `tools/` were copied into the build and made name-resolvable for MCP wiring, but **no agent BX Agents ever built - in any context: a real served app, `chat`, or a test spec - actually received its own declared tools.** This had gone undetected because no existing test ever asserted on a real tool invocation, only on a non-empty response.

Fixed in `ColdBoxAppGenerator.renderAgentFactory()`: every generated `GeneratedAgentFactory.bx` now loads its own `tools/` directory via a new `ToolRegistryLoader.bx` (using an ABSOLUTE path embedded at generation time, not a relative one depending on whatever "/" mapping happens to be in effect for the loading context - confirmed that `aiToolRegistry().scan("tools")`'s own relative-path resolution silently fails when called from a `DynamicClassLoader`-loaded context like `chat`), then passes `tools: aiToolRegistry().getAll()` to every `aiAgent()` call.

A related, separate BoxLang pitfall found while diagnosing this: **`request` is a reserved built-in scope name.** A local/loop variable named `request` can silently shadow it - `for ( var request in someArray ) { request.someKey }` iterated the correct number of times, but every `request.someKey` access inside it silently read as the empty built-in scope instead of the loop variable, with no error at all. Fixed by renaming to `recordedRequest` in `BaseAgentSpec.bx`'s matchers - worth remembering for any future BoxLang code in this project that loops over anything sensibly named `request`.

## `serve`'s miniserver lookup is PATH-only

`serve` looks for `boxlang-miniserver` only on `PATH` (`MiniServerLauncher.findExecutable()`). There's no fallback to a configured path or a bundled binary - if it isn't installed and on `PATH`, `serve` fails with a clear, actionable error, but there's no alternate way to point it at one.

## `chat` needs a real TTY

`chat` uses BoxLang's own `MiniConsole`, which shells out to `stty` to set up raw terminal mode - it can only run against a genuine interactive terminal. It doesn't work piped, redirected, or from a non-interactive process (a CI job, a script). There's no non-interactive fallback mode.

## No box.json `executable` install smoke test

`box.json` declares `"boxlang": { "executable": "bxAgents" }` so a real module install produces a native `bxAgents` command (see [Installation](getting-started/installation.md)). This wiring itself isn't exercised by an automated test - it relies on the BoxLang module installer's own documented behavior for generating executable wrappers, verified by reading its source, not by an install-and-run test in this repo's own CI.

## Scheduler cron support is a narrow subset

Minute/hour/daily/weekly/monthly/yearly cron shapes translate to ColdBox's frequency-method scheduler DSL - see [schedules/](conventions/schedules.md#cron-support-is-a-deliberately-narrow-subset). Only **exact single values** are supported in every field, though - any list, range, or step value in the day-of-month/month/day-of-week positions, or a cron combining both day-of-month and day-of-week, is rejected outright rather than approximated.

## A real bug found building the `test` verb: resolving "the current BoxLang jar" is ambiguous once `boxlang-miniserver` is on the classpath

`TestRunnerService.bx` spawns a fresh child process to run a project's `tests/specs`, and needs to know which jar to launch it with. The first implementation used the standard "which jar was this class loaded from" trick (`BoxRuntime.class.getProtectionDomain().getCodeSource().getLocation()`) - this worked in isolated manual testing, but failed unpredictably once run as part of this project's own full `testBx` suite, which also needs `boxlang-miniserver-*.jar` on the classpath (for `serve`/`MiniServerLauncher`-related specs). Confirmed via direct inspection: **`boxlang-miniserver-*.jar` is a fat jar that bundles its own copy of `ortus.boxlang.runtime.BoxRuntime`** - with both jars on the classpath, the classloader can resolve `BoxRuntime.class` to the miniserver jar instead of the real runtime jar, silently launching `MiniServer.main` (which rejects `--bx-config` and exits 1 immediately, before any BoxLang script or test report is ever produced) instead of `BoxRunner.main`. This surfaced as `tests/specs/cli/TestSpec.bx`'s real-process cases failing with `exitCode=1` and an empty report - reproducible only when run through the full suite, not in isolation, which is what made it easy to miss.

Fixed by resolving the jar from `java.class.path` instead - scanning for a `boxlang-*.jar` entry that does **not** contain `miniserver`, falling back to the old codeSource trick only if no such entry is found.

## `deploy` supports one target

Only a `local` (directory copy) deployment target ships in this version - see [Deployment & Secrets](deployment-and-secrets.md#deploying). A real pluggable target interface can be added once a second target actually exists.
