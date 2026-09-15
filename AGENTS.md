# Project Guidelines

## Purpose

This repository is **BxAgents**, the conventions-based AI agent framework for BoxLang, built on ColdBox and BX AI. It is a BoxLang module: a Gradle build producing a shadow jar plus a `src/main/bx` module, scaffolded from the standard BoxLang module template.

Because it began life as that template, preserve the packaging contract - placeholders, setup flow, packaging conventions, generated module structure - unless the task explicitly asks to change it.

## Verify Before You Build

**Check whether BoxLang or ColdBox already does it, before writing code that does it yourself.** This is the single most expensive mistake made in this repo: hand-rolling a hundred lines for something the runtime already ships, or asserting an API's behaviour from its docblock. Both have happened; both cost a full rewrite.

Check in this order:

1. **The docs MCP servers** - `BoxLang_Docs`, `Coldbox_Docs`, `CommandBox_Docs`, `TestBox_Docs`, `WireBox_Docs`, `CacheBox_Docs`, `LogBox_Docs`. `searchDocumentation` then `getPage`.
2. **The actual jar.** `src/test/resources/libs/boxlang-*.jar` and `boxlang-miniserver-*.jar` are right there. `unzip -l` to find a class, `javap -p` for signatures, `javap -c -p` for the literals and branches when a signature is not enough. This is how you learn what a method *does*, not what it is documented to do.
3. **The ColdBox source.** `tests/coldbox` is a real install - grep it. Note it is **gitignored**, so it can be an old build of the same version string; when a documented method appears to be missing, re-download before concluding it does not exist (`coldbox@be` / the 8.2 snapshot).

A docblock is not evidence. ColdBox's `Router.cfc` documents `withCondition()` as `( route, params, event )`; `RoutingService.cfc` actually calls it with **one** argument. Read the caller.

## Prove It By Running It

Every real bug found in this module was found by running code, never by reading it. Assertions that only prove the shape of a string prove very little.

- Exercise the thing end to end against a real server (`AgentClient.startServer()` launches a throwaway miniserver on an ephemeral port).
- When a wire format matters, **capture the bytes** and count what you claim - do not describe a payload you have not looked at.
- Assert the property that would actually break. Streaming is asserted on the **delta count**, because reassembled output alone passes just as well when the whole body was buffered and parsed at the end - the exact failure the feature exists to avoid.
- `./gradlew testColdBoxIntegration` must depend on `shadowJar`, not only `compileJava`. `boxlang.json` resolves the module out of `build/modules/bxagents`, which only `shadowJar` refreshes - depending on `compileJava` alone silently tests a **stale** module, and a fix you already made appears not to work.

## BoxLang Gotchas

Each of these cost real debugging time here:

- `char( 10 )`, not `chr( 10 )`. `jsonSerialize` / `jsonDeserialize`, not `serializeJSON` / `deserializeJSON`.
- **`server` and `request` are reserved scopes.** `var server = {...}` does not shadow the scope; it produces baffling "key not found" or "method not found" errors that look like Java-interop failures.
- `structKeyExists( someJavaObject, "method" )` is **false** for Java methods. Do not use it to feature-detect on an interop object - check the class, or call and catch.
- A Java class can be public while the type it returns is package-private, so it is unusable from BoxLang. `ortus.boxlang.runtime.net.SSEParser` is public; the `SSEEvent` it returns is not, and `toStruct()` on it throws `NoMethodException`.
- A `try/catch` at the **top level** of a `.bxs` script (outside any function) can trigger `java.lang.VerifyError: Inconsistent stackmap frames`. Wrap it in a function.

## Server-Sent Events

Do not rewrite `AgentClient.stream()` onto BoxLang's native `http().sse( true ).onChunk()` without re-measuring first. It is the right API and it does not work against this server today: BoxLang's `SSEEmitter` emits **no blank line between frames**, so BoxLang's own `SSEParser` dispatches nothing. See `## BoxLang's native SSE consumption...` in `docs/known-limitations.md` for the three measured defects and the numbers behind them. When the emitter is fixed, delete the local parser and move to the native API.

## Architecture

- Module metadata and runtime lifecycle live in `src/main/bx/ModuleConfig.bx`.
- BoxLang source belongs under `src/main/bx`; Java source belongs under `src/main/java`; tests belong under `src/test`.
- Keep in mind that each BoxLang module is loaded in its own class loader. Avoid changes that assume shared static state, direct classpath leakage, or IDE-only resource loading behavior.
- Custom runtime integrations should follow the existing module folders and registration patterns: `bifs`, `interceptors`, `components` or `tags`, `libs`, and service-loader backed Java types.

## Build And Packaging

- Use the Gradle wrapper from the repo root for build tasks.
- Prefer narrow validation first: `./gradlew test`, `./gradlew spotlessCheck`, or a targeted Gradle task related to the touched area.
- Preserve the packaging pipeline in `build.gradle`: shadow jar output, service loader generation, `build/module` assembly, and zip distribution artifacts.
- Do not reintroduce `src/main/resources` onto the IDE test classpath unless the task explicitly requires it; this template excludes it to avoid BoxLang class loading conflicts during module development.

## Conventions

- Follow `.editorconfig` indentation and line-ending rules. This repo uses tabs by default, with spaces for YAML.
- Follow the Ortus Java formatter in `.ortus-java-style.xml` for Java changes.
- Keep BoxLang module metadata, `box.json`, `settings.gradle`, and Gradle properties aligned when changing names, versions, or packaging identifiers.
- Prefer small template-safe edits. If a change would affect generated modules, update both the implementation and any setup or template placeholders that keep the template consistent.
- **Docs are dual-written.** While `1.0.x` is unreleased, every change under `docs/` must be mirrored into `docs/versions/1.0.x/` - see `CONTRIBUTING.md`. `docs/i18n/`, `docs/assets/`, `docs/versions/` and `docs/blog/` are shared and are **never** duplicated into a version snapshot.
- Comments should say *why*, and cite what was measured. A comment claiming a behaviour nobody verified is worse than none.

## Skills

- Relevant BoxLang development skills live under `.agents/skills`. Use them when the task involves module development, BIFs, components, interceptors, logging, async tasks, or runtime architecture.
- When a task is specifically about custom instructions, prompts, agents, or skills, prefer the agent-customization workflow and keep AGENTS.md focused on workspace-wide rules only.
