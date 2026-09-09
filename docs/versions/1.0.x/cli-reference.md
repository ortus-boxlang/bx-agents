---
title: CLI Reference
icon: phosphor-duotone:terminal-window
summary: Every bxAgents verb and its flags.
description: Every bxAgents verb and its flags.
tags: [reference, cli]
---

# CLI Reference

```
Usage: boxlang module:bxAgents <verb> [options]
```

(or the shorter `bxAgents <verb> [options]` form - see [Installation](getting-started/installation.md).)

## Global flags

These are handled before verb dispatch and never reach a verb.

| Flag | Effect |
|---|---|
| `-h`, `--help`, `help` | Print usage (every verb + description) and exit 0. Accepted in **any** position, so `bxAgents clean --help` prints usage rather than running `clean`. Also printed (exit 1) if no verb is given at all. |
| `-v`, `--version` | Print `bxAgents v{version}` and exit 0. Only meaningful as the very first token, so it never collides with `package --version=1.0.0`. |

## Every verb accepts

`--projectRoot=<path>` (or a bare positional path as the first non-flag argument) to target a project other than the current directory. Precedence: `--projectRoot` flag > first positional argument > current working directory.

## Argument syntax

Follows BoxLang's own documented CLI conventions:

| Form | Result |
|---|---|
| `--option` | `true` |
| `--option=value` / `--option="quoted value"` | `value` (surrounding quotes stripped) |
| `-o=value` | short form with a value |
| `-o` | short form, `true` |
| `-abc` | combined shorthand: `a`, `b`, `c` all `true` |
| `--!option` / `--no-option` | negation, `false` |
| anything else | a positional (the first becomes the project-root fallback) |

Repeated options: last one wins.

Note the first row: a bare `--option` is a **boolean**, not a way to pass the next token as its value. A flag that requires a value (`--model`, `--message`, `--password`, `--environment`, `--port`, ...) is therefore rejected with an error when written bare, rather than silently becoming `true`:

```
$ bxAgents new my-agent --model openai/gpt-5
Error: --model requires a value - write it as `--model=<value>`.
```

Always use the `--flag=value` form. The space-separated form is not supported.

## Verbs

::: cards
::: card title="new" icon="phosphor-duotone:sparkle" href="#new"
Scaffold a new agent project.
:::
::: card title="build" icon="phosphor-duotone:hammer" href="#build"
Run the full build pipeline.
:::
::: card title="test" icon="phosphor-duotone:test-tube" href="#test"
Run your project's own tests/specs via TestBox.
:::
::: card title="serve" icon="phosphor-duotone:broadcast" href="#serve"
Launch a real boxlang-miniserver process.
:::
::: card title="chat" icon="phosphor-duotone:terminal-window" href="#chat"
Interactive REPL against the built agent.
:::
::: card title="invoke" icon="phosphor-duotone:paper-plane-tilt" href="#invoke"
One non-interactive turn - for scripting/CI.
:::
::: card title="package" icon="phosphor-duotone:package" href="#package"
Package a built project into a .bxa.
:::
::: card title="deploy" icon="phosphor-duotone:cloud-arrow-up" href="#deploy"
Ship to a real deployment target.
:::
::: card title="hash-password" icon="phosphor-duotone:key" href="#hash-password"
Hash a plaintext password for a webui users entry.
:::
::: card title="inspect" icon="phosphor-duotone:magnifying-glass" href="#inspect"
Pretty-print an existing manifest.json.
:::
::: card title="clean" icon="phosphor-duotone:broom" href="#clean"
Remove a project's .build/ and dist/ output.
:::
:::

### `new`

Create a new agent project one of three mutually exclusive ways: scaffold from a built-in template, clone a GitHub repo, or install a ForgeBox package.

```bash
# Scaffold from a built-in template (default: minimal)
bxAgents new my-agent --model=openai/gpt-5 [--template=minimal|webui-chat|slack-bot|telegram-bot|github-bot|mcp-server|scheduled|multi-agent] [--name=...] [--description=...]

# Clone an existing GitHub repo
bxAgents new my-agent --repo=owner/repo-name

# Install a ForgeBox package
bxAgents new my-agent --forgebox=some-package-slug
```

- `--template`, `--repo`, and `--forgebox` name three different project SOURCES - exactly one applies. Combining any two of them is an error.
- **`--template` mode** (the default when no source flag is passed at all - `minimal`):
  - `--model` is **required** - a `provider/model` slug (see [Agent.bx](conventions/agent-bx.md)).
  - `--name` defaults to the target directory's own basename.
  - Refuses to run if the target already contains an `Agent.bx`.
  - Creates `Agent.bx`, `instructions.md`, every convention folder (empty), a ready-to-run [`tests/`](conventions/testing.md) folder (`tests/box.json` + `tests/specs/AgentSpec.bx`), a `.env` declaring `BOXLANG_HOME=.build/runtime` (matching `serve`'s own scoped runtime home - see [known limitations](known-limitations.md) for exactly what this does and doesn't cover), and a `.gitignore` (`.build/`, `dist/`, `.env`). Never overwrites an existing `.env`/`.gitignore`.
  - `--template` picks one of 8 built-in starters, each layering a bit of pre-wired content on top of the base skeleton above:
    - `minimal` - the bare skeleton, nothing extra.
    - `webui-chat` - adds a `gateways/webui.bx` exposing the [web chat UI](conventions/gateways/index.md) at `/chat`.
    - `slack-bot` - adds a `gateways/slack.bx` channel adapter, plus matching `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN` stub lines in `.env`.
    - `telegram-bot` - adds a `gateways/telegram.bx` channel adapter, plus a matching `TELEGRAM_BOT_TOKEN` stub line in `.env`.
    - `github-bot` - adds a `gateways/github.bx` channel adapter, plus matching `GITHUB_TOKEN`/`GITHUB_WEBHOOK_SECRET`/`GITHUB_BOT_NAME` stub lines in `.env`.
    - `mcp-server` - adds an example `mcp/exampleServer.bx` tool server and a `gateways/mcpExpose.bx` entry exposing it as an MCP server at `/mcp`.
    - `scheduled` - adds a real [`schedules/Scheduler.bx`](conventions/schedules.md) calling the agent on a daily timer.
    - `multi-agent` - adds a `configure()` to the root `Agent.bx` declaring two [subagents](conventions/subagents.md) (`researcher`, `writer`), each scaffolded as its own real `subagents/<name>/Agent.bx` + `instructions.md`.
  - Also runs `box install` inside the new `tests/` folder, so `bxAgents test` works immediately with no separate `cd tests && box install` step. This is best-effort: if `box` isn't on `PATH` or the install fails, `new` still succeeds - the message just tells you to run it yourself. Pass `--skipInstall` to opt out of this step entirely.
- **`--repo` mode** (`--repo=owner/repo-name` or a full URL): clones the repo via a bundled [JGit](https://www.eclipse.org/jgit/) dependency - no `git` binary needs to be installed. Always clones shallow (depth 1) and always strips the resulting `.git` folder afterward, so the new project starts with a clean history rather than staying tied to the template repo's own remote. Refuses to run into a directory that already exists and is non-empty, and fails clearly if no `Agent.bx` is found in the cloned repo.
- **`--forgebox` mode** (`--forgebox=<slug>`): installs a [ForgeBox](https://www.forgebox.io) package by talking to ForgeBox's own REST API directly (no `box` CLI required). Fails clearly if the slug doesn't exist, the download fails, or the installed package has no `Agent.bx` at its root (unwrapping one level of nesting first, since many ForgeBox archives wrap their contents in a single top-level folder).
- `--model`, `--repo`, and `--forgebox` are mutually exclusive with each other in the sense that only `--template` mode needs `--model` - `--repo`/`--forgebox` never require it, since the source project already defines its own.
- `--name`/`--description` are ignored (with a warning in the output) when `--repo`/`--forgebox` is used - the cloned/installed project defines its own.
- The `tests/` `box install` convenience step (and `--skipInstall`) only ever apply to `--template` mode - a cloned/installed project's own `tests/` folder (if it has one at all) is left untouched.

### `build`

Run the full [build pipeline](build-pipeline.md).

```bash
bxAgents build [--environment=production] [--verbose]
```

Writes `.build/app/` and `.build/manifest.json`. Fails with every collected validation error if the project is invalid.

- `--verbose` prints one line per build phase live as it runs - what got resolved/discovered/validated, per-phase counts (models, tools, gateways, warnings, etc.), which agents ended up registered in `config/WireBox.bx` and under which names, whether a `schedules/Scheduler.bx` was found, and a final `Build completed in Xms` timing line. Useful for debugging a slow or unexpectedly-behaving build. Silent otherwise - `--verbose` costs nothing when not passed.

### `test`

Run your project's own [`tests/specs`](conventions/testing.md) via TestBox.

```bash
bxAgents test
```

- Requires `testbox` installed under `tests/testbox` (`cd tests && box install`).
- Builds your agent against the `mock` provider by default (`Agent.bx`'s `test()` environment override) - no API key or network access needed.
- Prints pass/fail/error/skipped counts plus one line per failure, and exits non-zero if anything failed.

### `serve`

Launch a real [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) process pointed at `.build/app`.

```bash
bxAgents serve [--port=8080] [--host=127.0.0.1]
```

- Requires a prior `build` - fails clearly if `.build/app` doesn't exist.
- Fails clearly if `boxlang-miniserver` isn't found on `PATH`.
- **Binds to `127.0.0.1` by default.** A generated app is not authenticated unless you configured it to be (the web UI's API-key gate and sign-in are both opt-in), so the default keeps a development server off the network. Pass `--host=0.0.0.0` to bind all interfaces deliberately - the startup line tells you which of the two you got.
- `--port` must be an integer in 1-65535; anything else fails immediately rather than inside the server process.
- Writes `.build/miniserver.json` (rewrites enabled, `rewriteFileName: "index.bxm"`, health check on) before launching.
- Scopes the server's own BoxLang runtime home to `.build/runtime` (via `serverHome`) rather than the shared `~/.boxlang` default, so each project's compiled-class cache and config overrides are isolated - and `clean` sweeps it for free, since it already wipes `.build` wholesale. `invoke --server` gets this too, since it reuses `serve` internally. This does **not** extend to `chat`/`build`/`test`/default `invoke` - see [known limitations](known-limitations.md).

### `chat`

Interactive REPL against the built agent, using BoxLang's own `MiniConsole` for line reading.

```bash
bxAgents chat
```

- Requires a prior `build`.
- Loads `GeneratedAgentFactory.bx` directly (no ColdBox/WireBox container involved) and calls `buildAgent()` once per session - the exact same factory `serve`'s HTTP routes use, so `chat` and HTTP never diverge.
- Type `exit` or `quit` to leave.
- Needs a real interactive TTY (`MiniConsole` shells out to `stty` for raw mode) - it will not work piped/non-interactively.

### `invoke`

A single, non-interactive turn against the built agent: submit one message, print the response, exit. Exists for scripting/CI, where `chat`'s TTY requirement is a hard blocker.

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
bxAgents invoke --message="..." --server [--port=<port>]
```

- Requires a prior `build`.
- **Default (no `--server`)**: loads `GeneratedAgentFactory.bx` directly (no ColdBox container, no HTTP) and calls the agent once - the same in-process path `chat` uses internally, just without the REPL loop. No `serve`/gateway prerequisite at all.
- **`--server`**: launches a real, throwaway `boxlang-miniserver` process (same as `serve`), sends the message as a real HTTP request through the project's `toAi()`-exposed route, then shuts the server back down. Exercises the actual served path (ColdBox routing, interceptors, gateways) rather than the in-process shortcut. Requires a `gateways/*.bx` entry with `{ exposes: "agent", path: "..." }` (see [gateways](conventions/gateways/index.md)) - fails clearly if none exists. `--port` defaults to a free ephemeral port so it never collides with an already-running `serve`.
- `--json` prints `{"response": "..."}` instead of the plain-text response.

### `package`

Package a built project into a `.bxa`.

```bash
bxAgents package [--version=1.0.0]
```

- Requires a prior `build` - reads `.build/manifest.json`; fails clearly if it's missing.
- `--version` defaults to `1.0.0`.
- Writes `dist/{agentName}-{version}.bxa`, a sibling `.sha256`, and a redacted `manifest.json` copy. See [Deployment & Secrets](deployment-and-secrets.md).

### `deploy`

Ship a built/packaged project to a real deployment target via the pluggable [`deploy/`](conventions/deploy.md) convention.

```bash
bxAgents deploy --name=production
# or, the flag-only shorthand (local only):
bxAgents deploy --destination=/path/to/somewhere [--target=local]
```

- `--name=<entry>` dispatches to whatever target the named `deploy/<entry>.bx`/`.json` entry declares (`local`, `ssh`, `ftp`, `sftp`, `docker`, or `digitalocean`).
- The flag-only form (`--target=local --destination=...`, or no `--target` at all) works with no `deploy/` folder present - only `local` supports it; every other target requires a named entry, since it needs more configuration than a couple of flags can carry.
- `local`/`ssh`/`ftp`/`sftp` require a prior `package`; `docker`/`digitalocean` require a prior `build` (they build straight from `.build/app`).
- `ftp`/`sftp` need the [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp) module installed alongside BxAgents (see [Installation](getting-started/installation.md)).

### `hash-password`

Turn a plaintext password into the `passwordHash` value a `webui` entry's [`users`](conventions/web-ui.md) block accepts.

```bash
bxAgents hash-password --password="correct horse battery staple"
```

- `--password` is **required**.
- Prints the hash to stdout - `pbkdf2$<iterations>$<salt>$<derivedKey>`, PBKDF2-HMAC-SHA256, salted per call. Safe to commit: it's one-way, and hashing the same password twice yields two different (both valid) hashes.
- Kept deliberately identical to the hasher the generated web UI itself uses to verify a sign-in - a hash produced here always verifies there.

### `inspect`

Pretty-print an existing `.build/manifest.json` without rebuilding.

```bash
bxAgents inspect [--json]
```

- Requires a prior `build`.
- Prints agent name, model, environment, manifest version, generator name/version, and file count.
- `--json` prints the raw manifest as JSON instead of the human-readable summary - useful for scripting.

### `clean`

Remove a project's `.build/` and `dist/` output.

```bash
bxAgents clean [--force]
```

- Only ever removes `.build` and `dist` - source conventions (`Agent.bx`, `tools/`, etc.) are never touched.
- **Refuses to run unless the directory looks like a BxAgents project** (an `Agent.bx` or a `.build/manifest.json`). `dist/` is a common build-output name across the wider ecosystem, so this stops a `clean` in the wrong directory from deleting something unrelated. `--force` skips the check when you genuinely mean it.
- Prints the absolute path of each directory before removing it.
- Reports "Nothing to clean" if neither directory exists.