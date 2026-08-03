# CLI Reference

```
Usage: boxlang module:bxAgents <verb> [options]
```

(or the shorter `bxAgents <verb> [options]` form - see [Installation](getting-started/installation.md).)

## Global flags

These are handled before verb dispatch and never reach a verb - they're only meaningful as the very first token, so they never collide with a verb's own same-named flag.

| Flag | Effect |
|---|---|
| `-h`, `--help`, `help` | Print usage (every verb + description) and exit 0. Also printed (exit 1) if no verb is given at all. |
| `-v`, `--version` | Print `bxAgents v{version}` and exit 0. |

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

## Verbs

### `new`

Scaffold a new agent project.

```bash
bxAgents new my-agent --model=openai/gpt-5 [--name=...] [--description=...]
```

- `--model` is **required** - a `provider/model` slug (see [Agent.bx](conventions/agent-bx.md)).
- `--name` defaults to the target directory's own basename.
- Refuses to run if the target already contains an `Agent.bx`.
- Creates `Agent.bx`, `instructions.md`, every convention folder (empty), and a ready-to-run [`tests/`](conventions/testing.md) folder (`tests/box.json` + `tests/specs/AgentSpec.bx`).

### `build`

Run the full [build pipeline](build-pipeline.md).

```bash
bxAgents build [--environment=production]
```

Writes `.build/app/` and `.build/manifest.json`. Fails with every collected validation error if the project is invalid.

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
bxAgents serve [--port=8080] [--host=0.0.0.0]
```

- Requires a prior `build` - fails clearly if `.build/app` doesn't exist.
- Fails clearly if `boxlang-miniserver` isn't found on `PATH`.
- Writes `.build/miniserver.json` (rewrites enabled, `rewriteFileName: "index.bxm"`, health check on) before launching.

### `chat`

Interactive REPL against the built agent, using BoxLang's own `MiniConsole` for line reading.

```bash
bxAgents chat
```

- Requires a prior `build`.
- Loads `GeneratedAgentFactory.bx` directly (no ColdBox/WireBox container involved) and calls `buildAgent()` once per session - the exact same factory `serve`'s HTTP routes use, so `chat` and HTTP never diverge.
- Type `exit` or `quit` to leave.
- Needs a real interactive TTY (`MiniConsole` shells out to `stty` for raw mode) - it will not work piped/non-interactively.

### `package`

Package a built project into a `.bxa`.

```bash
bxAgents package [--version=1.0.0]
```

- Requires a prior `build` - reads `.build/manifest.json`; fails clearly if it's missing.
- `--version` defaults to `1.0.0`.
- Writes `dist/{agentName}-{version}.bxa`, a sibling `.sha256`, and a redacted `manifest.json` copy. See [Deployment & Secrets](deployment-and-secrets.md).

### `deploy`

Copy the newest packaged `.bxa` to a destination.

```bash
bxAgents deploy --destination=/path/to/somewhere [--target=local]
```

- Requires a prior `package` - fails clearly if `dist/` has no `.bxa`.
- `--target` only supports `local` (the default) in this version - copies to `--destination` (required), creating it if needed.

### `inspect`

Pretty-print an existing `.build/manifest.json` without rebuilding.

```bash
bxAgents inspect
```

- Requires a prior `build`.
- Prints agent name, model, environment, manifest version, generator name/version, and file count.

### `clean`

Remove a project's `.build/` and `dist/` output.

```bash
bxAgents clean
```

- Only ever removes `.build` and `dist` - source conventions (`Agent.bx`, `tools/`, etc.) are never touched.
- Reports "Nothing to clean" if neither directory exists.
