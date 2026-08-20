# ⚡︎ BX Agents

```
|:------------------------------------------------------:|
| ⚡︎ B o x L a n g ⚡︎
| Dynamic : Modular : Productive
|:------------------------------------------------------:|
```

<blockquote>
	Copyright Since 2023 by Ortus Solutions, Corp
	<br>
	<a href="https://www.boxlang.io">www.boxlang.io</a> |
	<a href="https://www.ortussolutions.com">www.ortussolutions.com</a>
</blockquote>

<p>&nbsp;</p>

**BX Agents** is a conventions-based AI agent framework for [BoxLang](https://boxlang.io), built on top of [ColdBox](https://coldbox.ortusbooks.com) and [BX AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai). Describe an agent with a handful of files and folders - `Agent.bx`, `instructions.md`, and whichever of `tools/`, `skills/`, `subagents/`, `gateways/`, `schedules/`, `mcp/`, `interceptors/`, `models/`, `modules/` it actually needs - and BX Agents assembles a real, runnable ColdBox application from it **at build time**, ready to serve, chat with, or package as a portable `.bxa`.

## Quick Start

```bash
install-bx-module bx-ai bx-agents      # see docs/getting-started/installation.md

bxAgents new my-agent --model=openai/gpt-5
cd my-agent
# edit instructions.md, add tools/, skills/, etc.

bxAgents build      # assembles a real ColdBox app under .build/app
bxAgents chat       # or: bxAgents serve --port=8080
```

## Documentation & Examples

- **[docs/](docs/index.md)** - installation, quick start, one page per convention folder, the build pipeline, the manifest schema, the full CLI reference, deployment/secrets, and known limitations. Built and published with [bx-docs](https://ortus-boxlang.github.io/bx-docs/); see [Working on the docs](#working-on-the-docs).
- **[examples/](examples/README.md)** - real, buildable sample projects: six core-convention examples (a minimal agent, an HTTP-exposed agent, a scheduled agent, an MCP agent, a multi-agent team, and the web chat UI) plus one per push-style chat-platform gateway (Telegram, Slack, Discord, Email, WhatsApp Cloud, Teams, Twilio, GitHub, Signal), each demonstrating one convention folder end-to-end.

## Why build-time assembly?

Most agent frameworks wire tools, skills, routes, and schedules together **at request time**, on every boot. BX Agents does the opposite: `bxAgents build` runs discovery, validation, and code generation exactly once, producing a plain ColdBox application. Booting that application - via `bxAgents serve`, a real [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) process, or a packaged `.bxa` deployed anywhere BoxLang runs - is then just booting an ordinary app, deterministically and fast.

---

## Contributing to BX Agents

The rest of this readme covers developing BX Agents itself (this repo), not building an agent with it - see [docs/](docs/index.md) for that. See [CONTRIBUTING.md](CONTRIBUTING.md#the-developer-flow---boxlang-is-dynamic) for the actual edit/test loop - BoxLang is a dynamic language, so it isn't the usual edit-compile-run cycle, and there's a real subtlety around how this module's own classes reference each other that's worth reading before you touch `src/main/bx`.

### Directory Structure

- `.github/workflows` - GitHub Actions to test and build the module via CI
- `docs/` - GitBook-style user documentation
- `examples/` - working sample agent projects, built as a CI regression gate (`./gradlew verifyExamples`)
- `src/main/bx` - the BoxLang source: `ModuleConfig.bx` (CLI entry point), `models/build` (the build pipeline: config resolution, discovery, validation, manifest, and code generators), `models/cli` (one class per CLI verb)
- `src/main/java` - supporting Java (packager, miniserver launcher, dynamic class loader, key dictionary)
- `src/test` - JUnit (Java-level) tests and fixtures
- `tests/` - the TestBox BDD suite (`tests/specs`), including the ColdBox-dependent integration specs under `tests/specs/integration/coldbox`
- `box.json` - published to ForgeBox; also declares the `bxAgents` native CLI executable
- `build.gradle` - the Gradle build file, including every verification task below

### Gradle Tasks

Before you get started, fetch the BoxLang binary (until this module is published to Maven):

```bash
./gradlew downloadBoxLang
./gradlew downloadModules        # bx-ai + bx-ftp, needed by the TestBox suite
./gradlew downloadMiniServer     # boxlang-miniserver, needed by the ColdBox integration suite
```

| Task | Description |
| --- | --- |
| `build` | The default lifecycle task: `clean`, `assemble`, and others. |
| `clean` | Deletes the `build` folder. |
| `compileJava` | Compiles Java source in `src/main/java`. |
| `test` | Runs the JUnit suite. |
| `testBx` | Runs the TestBox BDD suite (`tests/specs`, excluding the ColdBox-dependent bundle) via `runTests.bxs`. Requires `testbox/` (`box install`). |
| `testColdBoxIntegration` | Boots a real `boxlang-miniserver` against a generated app and hits a `toAi()` route over real HTTP, via `runColdBoxIntegrationTests.bxs`. Requires `tests/coldbox/` (`box install` in `tests/`) and the miniserver jar. |
| `verifyExamples` | Builds every project under `examples/` through the real build pipeline via `verifyExamples.bxs` - a regression net across the whole feature matrix. |
| `downloadBoxLang` | Downloads the BoxLang binary into `src/test/resources/libs`. |
| `downloadModules` | Downloads supporting BoxLang modules (bx-ai, bx-ftp) into `src/test/resources/modules`. |
| `downloadMiniServer` | Downloads the `boxlang-miniserver` binary into `src/test/resources/libs`. |
| `jar` / `shadowJar` | Packages compiled classes/resources into a JAR under `build/libs`. |
| `javadoc` | Generates Javadocs into `build/docs/javadoc`. |
| `spotlessApply` / `spotlessCheck` | Formats / checks code formatting. |
| `tasks` | Lists every available Gradle task. |

Run the full local verification pass with:

```bash
./gradlew shadowJar checkTemplateTokens test testBx testColdBoxIntegration verifyExamples
```

### VSCode Tests

If running tests via the VSCode test explorer, remove the `/src/main/resources` classpath entry first (Java Projects panel → the 3 dots → Configure Classpath), or BoxLang core will try loading service loaders it finds there. Module development only.

### GitHub Actions Automation

CI clones, tests, packages, and deploys this module to ForgeBox and the Ortus S3 accounts. The following repository environment variables are required (most are already set at the org level):

- `FORGEBOX_TOKEN` - the Ortus ForgeBox API token
- `AWS_ACCESS_KEY` / `AWS_ACCESS_SECRET` - the S3 credentials

Contact `#infrastructure` for these credentials if needed.

### Working on the docs

`docs/` is a [bx-docs](https://ortus-boxlang.github.io/bx-docs/) site - plain Markdown, where the folder structure *is* the navigation and `docs/nav.json` overrides the order. `bxdocs.json` at the repo root holds the site config.

```bash
# once - bx-docs renders through bx-markdown and encodes through bx-esapi
install-bx-module bx-markdown bx-esapi

# bx-docs itself has no installable artifact on FORGEBOX yet, so clone it into
# your modules folder - ModuleConfig.bx sits at its repo root, so a plain
# checkout IS the module. Swap this for `install-bx-module bx-docs` once it
# publishes one.
git clone https://github.com/ortus-boxlang/bx-docs.git ~/.boxlang/modules/bx-docs

bxDocs serve     # live-reloading preview on http://127.0.0.1:8080
bxDocs build     # render docs/ to site/ (gitignored)
```

Every page starts with a small frontmatter block (`title`, `icon`, `summary`, `description`, `tags`); `summary` renders under the page title, `description` is meta-only, and `tags` become clickable badges plus a site-wide `/tags/` index.

Pushes to `development` publish to [`/development/`](https://ortus-boxlang.github.io/bx-agents/development/) and pushes to `main` publish to the site root, via `.github/workflows/docs.yml` - one folder per version, and both stay live at once. There is no `main` branch yet, so the root currently redirects into `/development/`.

The repository's **Settings -> Pages -> Source** must be set to **GitHub Actions** for any of this to publish - the workflow cannot set that itself once a Pages site already exists on a branch source.

A push to either branch rebuilds **both** versions in one job. That is deliberate, not waste: GitHub Pages replaces the entire site on every deploy, so two branches cannot each deploy their own sub-path without the second wiping the first.

## Ortus Sponsors

BoxLang is a professional open-source project and it is completely funded by the [community](https://patreon.com/ortussolutions) and [Ortus Solutions, Corp](https://www.ortussolutions.com). Ortus Patreons get many benefits like a cfcasts account, a FORGEBOX Pro account and so much more. If you are interested in becoming a sponsor, please visit our patronage page: [https://patreon.com/ortussolutions](https://patreon.com/ortussolutions)

### THE DAILY BREAD

> "I am the way, and the truth, and the life; no one comes to the Father, but by me (JESUS)" Jn 14:1-12
