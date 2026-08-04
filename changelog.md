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
