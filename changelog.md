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
- A project `box.json` lists the extra packages an agent needs (`bx-playwright`, ...). You
  install them yourself, with CommandBox or `install-bx-module --local`; BxAgents installs
  nothing. `build` copies the project's `boxlang_modules/` into `.build/app`, leaving out
  modules that are only devDependencies, so `serve` and a `.bxa` carry them. `serve` and `test`
  add that folder to the runtime's modules directory.
- `bxAgents new` scaffolds a root `box.json` (TestBox as a development dependency, installed
  into `lib/testbox`) in place of `tests/box.json`, and a `.gitignore` that also ignores `lib/`
  and `boxlang_modules/`. `new` runs `box install` in the project root; `test` finds TestBox in
  `lib/testbox` (or `tests/testbox` for older projects).
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

Thirteen verbs: `new`, `add`, `build`, `test`, `serve`, `chat`, `invoke`, `package`, `deploy`,
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

#### The new wizard

- `bxAgents new` at a terminal asks what the agent should do and writes the project to match:
  model and provider, tools, search provider, file tools and the folders they may use, memory,
  MCP servers, channels, web access, a prompt-injection guard and a deploy target. It ends on a
  review screen with the one-line command that builds the same project without questions.
- A full-screen terminal UI in the BxAgents teal (TamboUI over JLine, bundled), with a numbered
  fallback for pipes and CI and `NO_COLOR` support. `--no-wizard`, `--yes`, `--wizard` and `--no-tui`.
- `new` flags for everything the wizard asks: `--with`, `--search`, `--files`, `--files-dir`,
  `--memory`, `--mcp`, `--channels`, `--web-auth`, `--guard`, `--deploy` and its details.
- After creating the project it prints what is left to do and, for each channel, the setup that
  happens outside the project (a bot token, a public address, a `signal-cli` daemon).
- `toolOptions.bxai.allowedPaths` gives an agent bx-ai's 19 file tools, locked to the folders it
  names (`tmp`, `cwd` or absolute paths), each agent with its own set. An empty list is refused.
- `mcpServers` entries accept `token`, `headers`, `timeout`, `user` and `password`. Secrets must
  be `${env.NAME}` placeholders and are resolved when the app starts.
- Every new project starts with the standard dotfiles: `.editorconfig`, `.gitattributes`, `.bxlint.json`,
  `.markdownlint.json`, a `.boxlang.json` listing every bx-ai setting at its default and a fuller `.gitignore`
  (`.env`, `.env.*`, build output, editor files). Existing files are never overwritten.
- A catalog of MCP servers the wizard can add: GitHub, Stripe, Notion, Atlassian, Cloudflare and Supabase.
- `mcpServers` entries can start a program on the agent's machine: `command: [uvx, mcp-server-git]`, with
  `env`, `cwd`, `inheritEnv`, `maxRestarts`, `timeout`, `prefix` and `toolFilter`. The programs your agents
  declare become bx-ai's `mcp.stdio.allowedCommands` when the app starts (a list you set yourself is kept),
  and `doctor` warns when one is not on the PATH. The Git MCP server is now offered by the wizard.
- Web `mcpServers` entries accept `allowedHosts` (refuses any other host before a request is sent),
  `redirects`, `maxResponseBytes`, `handshake`, `prefix` and `toolFilter`.
- The Cloudflare Workers AI provider (`cloudflare/<model>`) is in the wizard, with its account id stub in `.env`;
  `cartesia` and `cloudflare` are recognised provider names.

#### The shared chat database

- The web chat and the terminal chat share one SQLite file, `data/chat.db` in the project (git-ignored in new
  projects): `bxAgents serve` starts the app with `BXAGENTS_DB` pointing at it. A deployed app keeps using
  `database.path` inside the app unless `BXAGENTS_DB` is set.
- The schema moved out of the generated app into the module's `ChatStore` (plain SQLite, versioned,
  forward-only, write-ahead logging, a write that meets a lock tries again for a few seconds). A database made by
  an earlier generated app is recognised.

#### Run control over HTTP

- `/__bxagents` gains `events` (the `/stream` frames plus `tool` and `suspended` frames), `cancel`, `steer`,
  `pending`, `resume` and `tools`, from a generated `handlers/AgentApi.bx`. They sit behind the same
  `x-bxagents-token` gate as the `toAi()` routes.
- `chat --server` and `chat --connect` use them: the same screen as the in-process chat, with tool lines, thinking,
  Esc to stop the run on the server, steering and approvals answered in place. A server built by an older bxAgents
  falls back to the text stream with a notice. `AgentClient` can send a token.

#### Conversations in the chat

- Every chat is a conversation in the shared chat database, under the user (the OS user, or the
  token name over `--connect`), next to the web chat's own.
- `/sessions`, `/resume`, `/clear`, `/compact` and `/info` in `chat`; `chat --continue` and
  `chat --session=<number or id>` open an earlier conversation and show its messages.
- Server routes `GET /sessions`, `GET /history`, `POST /clear` and `POST /compact`; `/events` takes a
  `conversationId`. A conversation belongs to the caller that started it.

#### Notes

- `notes: {}` in `Agent.yaml` lets an agent keep short notes about the user and about its own work.
  They go into the system prompt within a limit (defaults 1400 characters for the user, 2200 for the
  agent, configurable), are read once per conversation, and are saved one row per note in the shared
  chat database. `provider` can name a class implementing `INotesProvider` for a store of your own.
- The agent gets `remember` and `forget` tools; `forget` stops for a person's approval by default
  (`approveForget`).
- `chat` has `/remember` and `/notes`, in-process and over `--connect`. `/notes` opens a notes screen (`a` add,
  `e` edit, `d` remove, `t`/Tab switch between your notes and the agent's, `s` stats); `/notes list|add|edit|remove|stats`
  work in place.
  `--user` sets whose user notes; the default is the operating system user.
- `bxAgents notes list|add|edit|remove|stats|export|import` manages them from a shell.
- Run-control routes `GET/POST /__bxagents/notes`, `POST /notes/update` and `POST /notes/remove`;
  removing a note of the agent needs an `admin` token.
- The web chat has a Notes panel (about you, about the agent: add, edit, remove your own), over `GET /notes`,
  `POST /notes/add|update|remove` under the web API. Agent notes cannot be removed from the page.
- `token` and `notes` take their action as the first word without mistaking it for a project folder.

#### Access tokens for a deployed agent

- `agentApi: { tokens: true }` accepts tokens made with `bxAgents token create --name=laptop [--scope=chat|admin]
  [--expires=90d]`, plus `token list` and `token revoke`. A token is shown once and only its SHA-256 is kept
  (in the shared chat database); revoking works at once on a running server. The token's name is who is calling:
  a run belongs to the token that started it. `tokenEnvVar` still works and acts as an `admin` token.
- `chat --connect=<url> --token=<token>` (or `BXAGENTS_TOKEN`) talks to a server that wants one.

#### The chat screen

- `bxAgents chat` is now a Pi-style terminal screen that keeps your scrollback: finished turns are
  ordinary terminal text and only the message box and the streaming answer are redrawn.
- Answers stream in and are printed as formatted Markdown. Tool calls show their arguments and
  duration, the model's thinking shows while it works, Esc stops the agent, a message typed
  while it works steers it, and a run that stops for approval asks in place.
- A multi-line message box with history, a `/` command menu (`/new`, `/tools`, `/copy`, `/save`,
  `/exit`) and `NO_COLOR` support. `--no-tui` and non-interactive terminals keep the plain REPL.
- `bxAgents chat --record[=file]` and `/record [file]` / `/record stop` save the screen as an asciicast
  `.cast` file for demos, with a `● rec` marker while it is on.

#### The inspect report

- `bxAgents inspect` reports how the agent is composed, from the project's source, so it works
  before `build`: the agent and subagent tree with each model, tools (the `@AITool` functions in
  `tools/` and the module tools), skills, MCP servers used and hosted, gateways and what each
  exposes, the schedule, named models, interceptors, modules, deploy targets, every environment
  variable the project reads with whether it is set (names only, never values), what `build`
  would reject, and the build state.
- `--section=<names>` shows only some sections, `--json` prints the whole report, `--md` prints it
  as Markdown and `--md=<file>` writes it. Color only at an interactive terminal; `NO_COLOR`,
  `TERM=dumb`, `--no-color` and `--ascii` are honored.

#### The add verb

- `bxAgents add` adds one thing to an existing project, asking the questions `new` asks through
  the same prompters; every answer is also a flag, so it runs in a pipe or CI. A review step lists
  the files first, `--dry-run` shows them without writing, and nothing is overwritten without
  `--force`.
- `add tool` scaffolds `tools/<Name>.bx` with a typed `@AITool` function in bx-ai's documented
  shape, into the root agent or a subagent (`--agent`).
- `add interceptor` scaffolds `interceptors/<Name>.bx` with a method per interception point and the
  `@scope` the build splits on: ColdBox's core points for `agent`, bx-ai's events for `runtime`.
- `add schedule` adds a task to `schedules/Scheduler.bx` from two answers, when and what to tell the
  agent (`every 15 minutes`, `daily 09:00`, `weekly mon 09:00`, ...), creating the file if there is
  none and otherwise adding at the end of `configure()`. There is no cron phrase: ColdBox's
  `ScheduledTask` has none.
- `add mcp client` adds a remote MCP server to an agent's `mcpServers:` (a catalog name or `--url`,
  with the sign-in as an `${env.NAME}` placeholder and an empty `.env` stub); `add mcp server` writes
  `mcp/<name>.bx` offering the project's tools through bx-ai's MCP server, plus the `gateways/` entry
  that serves it. `Agent.yaml` is edited by inserting lines only, so comments and layout stay.
- `add model` writes a named model configuration, `models/<name>.yaml` or `.json`. Named models are
  now YAML or JSON (a `.bx` class still works) and carry more than a provider and model: `params`
  (temperature, max_tokens, ...), `options`, and `apiKeyEnvVar` to read their key from a different
  environment variable. Entries are validated at build time, and the key variable is read when the
  app starts and named if it is missing.
- `add gateway` adds a chat platform (the same catalog the wizard uses: credentials as environment
  variable names with empty `.env` stubs, and the setup steps that happen outside the project), the web
  chat UI (open, behind a random shared key, or with named users stored as hashes only), or the HTTP
  API, and can set what to do with a message that arrives while the agent is answering.
- `add subagent` adds a whole agent under `subagents/<name>/` and wires it into a parent's `subAgents`. It runs the
  `new` wizard stages for its model, tools, search, files, memory, MCP servers and guard (or the same flags),
  nests under another subagent with `--parent`, and edits the parent by inserting only, so its comments and
  order stay; a class parent is left alone and the line to add is shown.
- `add skill` writes a custom skill of your own, `skills/<name>/SKILL.md`, with the frontmatter and a body to fill in.
- `skills find|install|list|update|remove` installs skills from skills.boxlang.io into `.agents/skills/` (out of
  source control) and records them in `.agents/skills.lock.json` (committed). The install is checked against the
  registry's git blob sha before anything is written, a skill that failed the registry's audit is refused, and
  `build` restores whatever the lock lists and the disk lacks. Skills in `skills/` and installed ones both go
  into the build; one of your own with the same name wins. New projects ignore `.agents/skills/`.

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
