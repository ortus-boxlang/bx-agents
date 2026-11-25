# Project Guidelines

## Purpose

This repository is **BxAgents**, the conventions-based AI agent framework for BoxLang, built on ColdBox and BX AI. It is a BoxLang module: a Gradle build producing a shadow jar plus a `src/main/bx` module, scaffolded from the standard BoxLang module template.

Because it began life as that template, preserve the packaging contract - placeholders, setup flow, packaging conventions, generated module structure - unless the task explicitly asks to change it.

## Verify Before You Build

**Check whether BoxLang or ColdBox already does it, before writing code that does it yourself.** This is the single most expensive mistake made in this repo: hand-rolling a hundred lines for something the runtime already ships, or asserting an API's behaviour from its docblock. Both have happened; both cost a full rewrite.

Check in this order:

1. **The docs MCP servers** - `BoxLang_Docs`, `Coldbox_Docs`, `CommandBox_Docs`, `TestBox_Docs`, `WireBox_Docs`, `CacheBox_Docs`, `LogBox_Docs`. `searchDocumentation` then `getPage`.
2. **The actual jar.** `src/test/resources/libs/boxlang-*.jar` and `boxlang-miniserver-*.jar` are right there. `unzip -l` to find a class, `javap -p` for signatures, `javap -c -p` for the literals and branches when a signature is not enough. This is how you learn what a method *does*, not what it is documented to do.
3. **The ColdBox source.** `build/lib-stage/lib/coldbox` is a real install (`./gradlew installDevLibs`) - grep it. Note it is **gitignored**, so it can be an old build of the same version string; when a documented method appears to be missing, re-run `./gradlew installDevLibs` (after `clean`, or bump the range in `src/main/lib/box.json`) before concluding it does not exist.

A docblock is not evidence. ColdBox's `Router.cfc` documents `withCondition()` as `( route, params, event )`; `RoutingService.cfc` actually calls it with **one** argument. Read the caller.

And a measurement is only evidence of what it actually isolates. A native SSE stream here was measured as emitting no frame terminators, and the emitter was blamed in a commit message - wrongly. The bytes were real; the conclusion was not, because nothing in that test separated the emitter from the response pipeline it was flowing through. The cause was whitespace compression collapsing the blank lines. **Before blaming a component, reproduce the effect with that component and nothing else** - here, a two-line `SSE()` page rather than a full ColdBox route, and a handler writing the bytes by hand. Both would have pointed away from the emitter immediately.

## Prove It By Running It

Every real bug found in this module was found by running code, never by reading it. Assertions that only prove the shape of a string prove very little.

- Exercise the thing end to end against a real server (`AgentClient.startServer()` launches a throwaway miniserver on an ephemeral port).
- When a wire format matters, **capture the bytes** and count what you claim - do not describe a payload you have not looked at.
- Assert the property that would actually break. Streaming is asserted on the **delta count**, because reassembled output alone passes just as well when the whole body was buffered and parsed at the end - the exact failure the feature exists to avoid.
- `./gradlew testColdBoxIntegration` must depend on `shadowJar`, not only `compileJava`. `boxlang.json` resolves the module out of `build/modules/bx-agents`, which only `shadowJar` refreshes - depending on `compileJava` alone silently tests a **stale** module, and a fix you already made appears not to work.

## BoxLang Gotchas

Each of these cost real debugging time here:

- `char( 10 )`, not `chr( 10 )`. `jsonSerialize` / `jsonDeserialize`, not `serializeJSON` / `deserializeJSON`.
- **`server` and `request` are reserved scopes.** `var server = {...}` does not shadow the scope; it produces baffling "key not found" or "method not found" errors that look like Java-interop failures.
- `structKeyExists( someJavaObject, "method" )` is **false** for Java methods. Do not use it to feature-detect on an interop object - check the class, or call and catch.
- A Java class can be public while the type it returns is package-private, so it is unusable from BoxLang. `ortus.boxlang.runtime.net.SSEParser` is public; the `SSEEvent` it returns is not, and `toStruct()` on it throws `NoMethodException`. Not a problem in practice - drive SSE through `http().sse( true )`, which parses internally - but it is why you cannot hand-drive that parser.
- `listFindNoCase( "true,false", "yes" )` is **1**: BoxLang reads `yes` and `no` as booleans when it compares, so a list or `==` check cannot tell `yes` from `true`. To accept only the words `true` and `false`, use `reFindNoCase( "^(true|false)$", value )`.
- A `try/catch` at the **top level** of a `.bxs` script (outside any function) can trigger `java.lang.VerifyError: Inconsistent stackmap frames`. Wrap it in a function.
- **`getSystemSetting()` keeps its first answer per key for the life of the process**, a miss included: after `System.setProperty( "X", "a" )` it answers `a`; after setting `b`, `""` or clearing it, still `a`, and a key asked before it existed keeps answering the default (measured on 1.19.0). Production code reads settings with `getSystemSetting()` (`BXAGENTS_MODULE_DIR`), so a test never changes a setting mid-process: it passes explicit options instead (the `moduleDir` option of `build`, `serve`, `test` and `invoke --server`, `BuildPipeline.setModuleSource()`), and `runTests.bxs` sets `BXAGENTS_MODULE_DIR` once, at the start.
- **`directoryDelete( path, true )` follows symbolic links** and empties what they point at. Anything that can hold a link (a dev build links the web app module's source; a test run links the module) is deleted with `TreeDelete::tree()`. A test run of the `test` verb once emptied `build/modules/bx-agents` this way.
- An **unscoped assignment inside a function is local** to it: `coldbox = {...}` in `configure()` is invisible to ColdBox, which reads `variables.coldbox`. The generated config did this for as long as it existed, hidden by the next item.
- ColdBox's config file is **`config/Coldbox.bx`** (lower-case b). On a case-sensitive file system a file called `ColdBox.bx` is never loaded, and nothing says so.
- `expandPath( "/" )` is the **web root**, which is `.build/public` in a served app: the app is `expandPath( "/app" )` (the template's mapping). Code that means the app asks `models/util/AppRoot.bx`, which also works outside a web boot.
- A bare class path in generated code (`schedules.Pulse`, `agent.GeneratedAgentFactory`, `interceptors.X`, `bxagents.Scheduler`) is **not found** in the built app: write `app.<folder>.<Class>`. `aiToolRegistry().scan()` expands its dotted path against a mapping (`expandPath( "/app/tools" )`), so it takes a mapping path, `app.tools`, never one relative to the app.
- The launcher script of `boxlang-miniserver` puts `$BOXLANG_HOME` unquoted on the java command line (`-XX:SharedArchiveFile=`), so a project or unpacked app under a path with a **space** does not start.

## Server-Sent Events

SSE here is **native on both sides** and should stay that way: ColdBox's `toAi()` `/stream` emits through BoxLang's `SSE()` BIF, and `AgentClient.stream()` consumes with `http( url ).sse( true ).onChunk( ... )`. Do not write a frame parser - `ortus.boxlang.runtime.net.SSEParser` already does it.

The one thing to know: **SSE frames are terminated by a blank line, and the web runtime's whitespace compression is ON by default and collapses blank lines.** What that does was measured on BoxLang and boxlang-miniserver 1.19.0, with the setting on and off:

| writer | terminators, on | terminators, off |
|---|---|---|
| ColdBox `toAi()` `/__bxagents/stream` (native `SSE()`) | 14 terminators, 14 frames, 8 content deltas | the same |
| `route().toSSE()`, a two-line `SSE()` page | 5, 4 | the same |
| a handler that calls `writeOutput( "event: tick\ndata: hello N\n\n" )` three times | **0** (77 bytes) | 3 (82 bytes) |

So on this engine the native emitters survive compression and only a hand-written event stream breaks. An earlier version of this file said the native stream lost every terminator with it on and the client reported `totalEvents: 0`; that did not reproduce, and nothing found out what produced it. The setting stays off anyway, as a safety net: it is the one patched line of the vendored `runtime/boxlang.json` (see `templates/coldbox-boxlang/VERSION`) and this repo's `boxlang.json` sets it for the suite. If streaming ever goes silent, check that first, but count the frames before blaming it.

## Architecture

- Module metadata and runtime lifecycle live in `src/main/bx/ModuleConfig.bx`.
- BoxLang source belongs under `src/main/bx`; Java source belongs under `src/main/java`; tests belong under `src/test`.
- Keep in mind that each BoxLang module is loaded in its own class loader. Avoid changes that assume shared static state, direct classpath leakage, or IDE-only resource loading behavior.
- Custom runtime integrations should follow the existing module folders and registration patterns: `bifs`, `interceptors`, `components` or `tags`, `libs`, and service-loader backed Java types.

## Terminal UI

`bxAgents new` (and later `chat`) draw with TamboUI over JLine 3, both bundled in the shadow jar and used only through `src/main/java/ortus/boxlang/bxagents/tui`. TamboUI says its API is still moving, so keep every call to it inside that package; BoxLang code talks to `TuiScreen` and to the prompters in `models/wizard/prompters`.

- JLine finds its terminal providers through the thread's **context class loader**, which under BoxLang is the runtime's loader and cannot see this module's jar. Without `TuiScreen.open()` swapping it, every provider is "not found" and JLine silently settles for a dumb terminal (`Unable to find terminal provider exec`). Anything new that creates a JLine terminal needs the same swap.
- The prompts are plain objects (keys in, `Row`s out) so they test without a terminal: `TuiPromptsTest`. Test the screen itself in a pseudo terminal against the real runtime (`java ... BoxRunner module:bxagents new` under a pty), not only in isolation; the class loader bug above only appeared there.
- Honor `NO_COLOR` and `TERM=dumb` (`Theme`), and keep a plain fallback (`PlainPrompter`) so a pipe or CI never needs a terminal.

## The built app (`.build/`)

`bxAgents build` lays out `.build/` like the ColdBox BoxLang application template (https://github.com/coldbox-templates/boxlang), and only `.build/public` is served:

```
.build/
  miniserver.json    webRoot public, configPath runtime/boxlang.json, serverHome runtime (paths relative to .build)
  app/               the generated code: Application.bx is the template's `abort;` guard
  public/            the web root: Application.bx, index.bxm, robots.txt, includes/
  lib/               coldbox/, modules/* (from the module's lib/), java/
  runtime/           boxlang.json (the template's), modules/bx-agents (the ONLY module; internal mapping bxagents), global/, logs/ ; also BOXLANG_HOME
  boxlang_modules/   the project's own installed BoxLang modules
```

- The template is **vendored**, never fetched: `src/main/bx/templates/coldbox-boxlang` (commit and version in `VERSION`), refreshed by a person with `tools/refresh-coldbox-template.sh`, which shows the diff. The files it lays out are unchanged apart from one line of `runtime/boxlang.json`; `public/Application.bx` is the one derived file.
- The server must be started with **`.build` as its working directory** (`${user-dir}` in the engine config) and `BOXLANG_HOME=<build>/runtime`. Without a home, BoxLang loads every module in `~/.boxlang/modules` (measured with a decoy module), so no code names the machine's module directory: `Serve.bx`, the test runner and `ModuleCopier` copy or link the one `bx-agents` module instead (internal alias `bxagents`).
- `public/Application.bx` is derived from the template's and changed: a thin class extending the generated base `app/bxagents/Application.bx` (which carries the template's bootstrap settings and `onApplicationStart()`/`onRequestStart()`), or the project's own Application.bx pointed at it; see docs/conventions/application-bx.md for what is derived and what is changed.
- Tests that boot a served app need the BUILT module: `./gradlew --no-daemon shadowJar createModuleStructure`, then they find `build/modules/bx-agents` themselves (`BXAGENTS_MODULE_DIR`, see `ModuleCopier.sourceDir()`). The unit suite builds hundreds of projects, so `runTests.bxs` points that variable at a stand-in folder.

## Build And Packaging

- Use the Gradle wrapper from the repo root for build tasks.
- **Building needs Java and Node 24**, with no skip flag. The web app (`ui/`) is built by `uiBuild` (`npm ci`, then `npm run build`) into `src/main/bx/bxagentsui/includes/build`, which is **git-ignored, never committed**; `createModuleStructure` depends on it, so `shadowJar`, a release and a snapshot always carry a fresh one. A missing Node, npm or another major fails the build with what to install. `npm run build` in `ui/` builds only the web app. Keep `ui/.nvmrc`, `ui/package.json` `engines`, `uiNodeMajor` in `build.gradle` and the workflows' `setup-node` in step.
- Dependencies are bundled, never installed by the user. BoxLang modules (`ext.boxlangModules` in `build.gradle`, versions in `gradle.properties`) are downloaded into `build/bundle-modules`, copied into the module's `modules/` by `createModuleStructure`, and load as nested modules (BoxLang 1.17+); ColdBox libraries are listed in `src/main/lib/box.json` (same `installPathConventions` as the ColdBox templates: `coldbox` to `lib/coldbox/`, every module to `lib/modules/`), installed with `./gradlew installLibs` (shipped set, `--production`) and `installDevLibs` (adds TestBox; never shipped), CommandBox / bx-cli is required for development; shipped as `lib/` and copied into each built app by `RuntimeLibsCopier`. Add a dependency there, not to `box.json`.
- Prefer narrow validation first: `./gradlew test`, `./gradlew spotlessCheck`, or a targeted Gradle task related to the touched area.
- Preserve the packaging pipeline in `build.gradle`: shadow jar output, service loader generation, `build/module` assembly, and zip distribution artifacts.
- Do not reintroduce `src/main/resources` onto the IDE test classpath unless the task explicitly requires it; this template excludes it to avoid BoxLang class loading conflicts during module development.

## Conventions

- Follow `.editorconfig` indentation and line-ending rules. This repo uses tabs by default, with spaces for YAML.
- Follow the Ortus Java formatter in `.ortus-java-style.xml` for Java changes.
- Keep BoxLang module metadata, `box.json`, `settings.gradle`, and Gradle properties aligned when changing names, versions, or packaging identifiers.
- Prefer small template-safe edits. If a change would affect generated modules, update both the implementation and any setup or template placeholders that keep the template consistent.
- **Docs are dual-written.** While `1.0.x` is unreleased, every change under `docs/` must be mirrored into `docs/versions/1.0.x/` - see `CONTRIBUTING.md`. `docs/assets/`, `docs/versions/` and `docs/blog/` are shared and are **never** duplicated into a version snapshot. Translations live inside the versioned tree, under `docs/versions/1.0.x/i18n/<code>/`, not in `docs/i18n/`.
- Comments should say *why*, and cite what was measured. A comment claiming a behaviour nobody verified is worse than none.

## Skills

- Relevant BoxLang development skills live under `.agents/skills`. Use them when the task involves module development, BIFs, components, interceptors, logging, async tasks, or runtime architecture.
- When a task is specifically about custom instructions, prompts, agents, or skills, prefer the agent-customization workflow and keep AGENTS.md focused on workspace-wide rules only.

## Tutorial and demo videos

Narrate every tutorial or demo video with the same voice: Kokoro `af_heart` (American English, female, speed 1.0). The settings are in `tools/demo/narration/voice.json` and `tools/demo/narration/narrate.py` makes the audio from a narration file. Do not switch voices between videos.
