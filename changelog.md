# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

----

## [Unreleased]

* Renamed the module template scaffold to BX Agents (box.json, ModuleConfig.bx, Java package `ortus.boxlang.bxagents`)
* Added the TestBox harness (`tests/Application.bx`, `tests/box.json`, `tests/specs/`) and wired a `testBx` Gradle task into CI
* Added a `checkTemplateTokens` Gradle guard against leftover `@MODULE_*@` template placeholders
* Reserved `src/test/resources/fixtures/` and `src/main/resources/scaffold/` for upcoming build-pipeline milestones
* Added an agent testing framework: `bxAgents new` now scaffolds a ready-to-run `tests/` folder, and a new `test` verb runs a project's `tests/specs` via TestBox against a fresh child BoxLang process. `BaseAgentSpec` builds the project's agent against the mock provider by default and adds `mockResponses()` plus custom matchers (`toContainText`, `toHaveCalledTool`, `toHaveReceivedMessage`)
* Fixed a foundational bug found while building the testing framework: no agent BX Agents ever built actually received its own declared `tools/` - `ColdBoxAppGenerator` now loads them via a new `ToolRegistryLoader` and passes them to every generated agent
* Added pluggable `deploy` targets via a new `IDeploymentTarget` interface and `deploy/` convention folder (mirrors `gateways/`/`schedules/`/`mcp/`): `local` (refactored, now sorting the newest `.bxa` by modification time instead of a lexical filename sort), `ssh`, `ftp`/`sftp` (via the real `bx-ftp` module, now a genuine runtime dependency of this project), `docker`, and `digitalocean` (push-and-minimal-provision against the real DigitalOcean Apps API). `deploy --name=<entry>` dispatches to a named target; the original `--target=local --destination=...` flag-only form still works with no `deploy/` folder present
* Full-framework review pass. Fixed a security bug: an `http` gateway's `secret` was embedded as a plaintext literal in generated `Application.bx` source and shipped unredacted inside the packaged `.bxa` - gateways now declare `secretEnvVar` (the NAME of an environment variable), resolved live via `getSystemSetting()`, never written to generated source. Applied the same secrets-stay-external convention to `ftp`/`sftp` (`passwordEnvVar`/`passphraseEnvVar` replace `password`/`passphrase`) for consistency with `docker`/`digitalocean`, which already resolved secrets from env vars
* Fixed several "passed validation cleanly, then crashed mid-generation" gaps by moving each check into `ProjectValidator`'s Phase 3, consistent with this project's own "collect every error before generating" promise: a schedule's `action` presence, cron-shape support (`ProjectValidator` now calls a new `SchedulerGenerator.isSupportedCron()`, reusing the generator's own translation logic instead of a second, independently-drifting regex), and the ROOT project's own `subAgents` references (previously excluded from the unknown-subagent check, so only nested subagents' bad references were caught)
* Fixed a bug where a subagent's own environment-specific `Agent.bx` overrides always resolved against its default environment, ignoring whatever `--environment` the whole build was invoked with - `cliEnvironment` is now threaded through to every subagent's own config resolution
* Fixed a bug where a bare `model` value (a core provider name with no model, e.g. `"openai"`, or a `models/` entry name, e.g. `"summarizer"` - both explicitly validated as legal) crashed `ColdBoxAppGenerator` mid-generation; it now resolves both shapes correctly, including reading a referenced `models/` entry's own `{provider, model}` config
* Renamed `SshTarget`'s `user` config field to `username`, matching `ftp`/`sftp`'s field name for the same concept; `ssh`/`docker` targets now wrap a missing/failed local process launch (`scp`, `ssh`, `docker`) in a clear `BxAgents.DeployFailed` error instead of an opaque Java exception
* Corrected several stale documentation claims found during the review: `schedules.md`'s validation-phase description, `mcp.md`'s missing `cors` field, `deploy.md`'s missing `timeout` field for `ftp`/`sftp`, `subagents.md`'s stale unknown-subagent error wording, `gateways.md`'s fabricated `cli`-gateway-backs-`chat` claim, and `agent-bx.md`'s fabricated third environment-precedence tier
* Fixed the same "validated but crashes at generation" gap for a subagent's own `model` field: `validateModelProvider()` was only ever called against the ROOT project's config, so a subagent with an unknown provider or an unmatched `models/` reference passed validation cleanly and only threw mid-generation. It's now validated per-subagent too, with errors clearly attributed to the offending subagent
