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
