# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

----

## [Unreleased]

The first public release of BxAgents - a conventions-based framework for building AI
agents in BoxLang, powered by [BoxLang AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai)
and built on [ColdBox](https://coldbox.ortusbooks.com).

You describe an agent with a handful of files and folders; `bxAgents build` assembles a
real, runnable ColdBox application from them **at build time**, ready to serve, chat with,
or package as a portable `.bxa`.

### Added

#### Self-contained install

- `install-bx-module bx-agents` is the only install. The module zip bundles `bx-ai`,
  `bx-sqlite`, `bx-ftp`, `bx-mail` and `bx-yaml` as nested BoxLang modules
  (BoxLang 1.17+), and a `lib/` with ColdBox, `qb`, `cbsecurity`, `cbauth` and
  `cbmailservices` that `build` copies into every generated app. A project's own
  `lib/` folder adds to or overrides them.
- `serve` loads the bundled modules, so a served app finds `bx-ai` without any
  install.
- The web UI's sign-in is backed by `cbsecurity` (which wraps `cbauth`). cbsecurity's
  firewall is switched off in generated apps for now; it cannot resolve a handler for
  `toAi()` routes.
- Minimum BoxLang version is now 1.18.0.

#### Conventions

- `Agent.yaml` + `instructions.md` as the minimum viable agent. `Agent.yaml` is the default
  way to define an agent: plain settings (`name`, `model`, `subAgents`, `memory`, ...),
  per-environment overrides under `environments:`, and optional inline `instructions:`
  (an `instructions.md` beside it wins). Unknown keys are an error. The advanced option is
  an `Agent.bx` - a descriptor whose `configure()` returns config, or a class extending
  bx-ai's `AiAgent` that *is* the agent - for definitions that need code. A folder holds
  one or the other; both together is an error. `bxAgents new` scaffolds an `Agent.yaml`,
  and `--class` scaffolds the class-based `Agent.bx` instead.
- `tools/` - any class with an `@AITool`-annotated function becomes a callable tool, with
  no registration step. A tool belongs to the agent whose folder it is in; subagents'
  `tools/` are now loaded and attached to them.
- `tools:` - an agent lists the module tools it wants as `item@module` or `*@module`
  (`now@bxai`, `*@bxplaywright`). Without it an agent has only its own `tools/`: agents no
  longer implicitly receive every tool in bx-ai's registry. A bare name, an unknown tool
  or an uninstalled module is an error, and an own tool wins over a same-named module tool
  with a logged warning.
- `toolOptions:` - options for a module's tools, keyed by module name. `bxplaywright` takes
  the options of bx-playwright's `playwright()` (`profile`, `headless`, `baseURL`, ...).
  An agent that lists `bxplaywright` tools gets its own fresh browser tools instead of the
  shared registered ones, so a root agent and its subagents never drive the same page.
  `${env.NAME:default}` values are resolved when the app starts. Options are checked at
  build time.
- `skills/<name>/SKILL.md` - model-selected guidance, distinct from the always-on
  `instructions.md`.
- `subagents/<name>/` - a full nested agent per folder, built leaf-first and attached to
  its parent automatically, with cycle detection at build time.
- `models/` - named model configurations, referenced by name from any agent in the tree.
- `gateways/` - one entry per exposure or chat platform (see below).
- `schedules/Scheduler.bx` - a real ColdBox scheduler class, passed through untouched, so
  the full ColdBox task DSL is available.
- `mcp/` - host a local MCP server that re-exposes a project's own tools.
- `interceptors/` - ColdBox interceptors, split by `@scope` into agent-scope (registered with the generated app) and runtime-scope
  (copied out for you to load).
- `modules/` - declared BoxLang module dependencies, validated (including cycles) and recorded
  in the manifest.

#### The build pipeline

- `bxAgents build` runs discovery, validation and code generation exactly once, producing a
  plain ColdBox application under `.build/app` - nothing is wired at request time.
- Build-time validation catches duplicate agent names, subagent and module cycles, unknown
  model providers, unknown gateway types, missing required env-var names, path traversal in
  configured paths, and more, reporting every collected error rather than the first.
- A `manifest.json` describing the build, with SHA-256 content hashing and line-ending
  normalization so a CI-built artifact can be verified against a locally-built one.

#### Exposing an agent

- `exposes: "agent"` - an HTTP route via ColdBox's `toAi()`, with `invoke`/`stream`/`batch`/`info`
  sub-routes.
- `exposes: "mcp"` - the project's tools as a hosted MCP server.
- `exposes: "webui"` - a complete, generated web chat UI: conversation sidebar backed by a
  real SQLite store, token-by-token streaming with reasoning and tool-call disclosures,
  human-in-the-loop approvals, steer-while-streaming, compaction, server-side theming from
  config tokens, optional API-key gating, and optional username/password sign-in via cbauth.
  Plain vanilla HTML/CSS/JS - no Node, no npm, no build step.

#### Chat-platform gateways

Nine push-style gateways, each with inbound normalization, outbound chunking at the
platform's own limit, and human-in-the-loop approval support:

- **Telegram** (long-poll), **Slack** (Socket Mode websocket), **Discord** (Gateway
  websocket with heartbeats), **Signal** (SSE against a `signal-cli` daemon),
  **Email** (scheduled IMAP poll + SMTP send), and the webhook-driven **WhatsApp Business
  Cloud** (`X-Hub-Signature-256`), **Microsoft Teams** (Bot Framework JWT/JWKS),
  **Twilio SMS** (`X-Twilio-Signature`) and **GitHub** (`@mention`-gated issue/PR threads).
- Credentials are always named by *environment variable*, never embedded in config or
  generated source.
- A `type: "http"` entry's webhook surface is mounted by ColdBox's own
  `route( "/gateways" ).toAiGateway()` terminator - inbound events, the platform's URL
  verification handshake, the human-in-the-loop interaction endpoints, and an info route -
  instead of hand-written routes into a generated passthrough handler. The interaction
  endpoints now live under the `/gateways` base path.

#### CLI

Twelve verbs: `new`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`,
`inspect`, `hash-password`, `clean` and `doctor`, shipped as a native `bxAgents` executable.

Tab completion for bash, fish and PowerShell, generated from the CLI's own verb tables
(`tools/generate-completions.bxs`) and installed through `boxlang.completions` in `box.json`.

#### Packaging and deployment

- `bxAgents package` produces a deterministic `.bxa` archive (byte-identical across repeated
  builds), with a `.sha256`, a redacted manifest, an always-on exclusion of dotfiles/`.env`,
  and an optional `.bxaignore`.
- Six deploy targets: `local`, `ssh`, `docker`, `ftp`, `sftp` and `digitalocean`.

#### Testing

- `BaseAgentSpec` - a TestBox base spec that builds a project into a temp copy, mocks model
  responses, and adds agent-aware matchers including tool-call assertions.

#### Documentation

- A full documentation site at [bxagents.ai](https://bxagents.ai): installation, quick start,
  a tutorial course, one page per convention, per-platform gateway pages, example-agent
  guides, the build pipeline, the manifest schema, the CLI reference, deployment and
  secrets.
- 18 real, buildable example projects under `examples/`, built in CI as a regression gate.
- A new homepage with an interactive folder-to-app panel, a hover inspector for every gateway,
  a starter explorer built from the real scaffolder output, the course path, walkthrough
  videos recorded from real runs, and a consulting section. New logo, favicon and social image.

### Security

- The web UI's `/pending` and `/resume` actions now authorize the caller against the
  `userId` the agent checkpointed, rather than acting on any supplied `threadId`.
- `bxAgents serve` binds to `127.0.0.1` by default; `--host=0.0.0.0` is an explicit opt-in.
- A deploy entry may only name an environment variable in the `BXAGENTS_` namespace for its
  password/passphrase, so a config file cannot cause an unrelated secret to be read out of
  the environment and sent to a remote host.
- Configured paths are rejected when absolute or containing `..` segments, matched on whole
  path segments.

[Unreleased]: https://github.com/ortus-boxlang/bx-agents/commits/development
