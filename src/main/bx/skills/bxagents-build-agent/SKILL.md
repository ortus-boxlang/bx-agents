---
name: bxagents-build-agent
description: >
  How a bxAgents project is laid out, what the Agent.yml keys do, and the CLI verbs to create, check, build, run and serve an agent. Use it when asked to create a new agent, change its settings or model, or build and start it.
---
# Building a bxAgents agent

An agent is a folder. `Agent.yml` plus `instructions.md` is enough; the build turns the folder into a running app in `.build/` (the code in `app/`, the web root in `public/`).

## Project layout

```text
my-agent/
├── Agent.yml        # the definition (or a class-based Agent.bx, never both)
├── instructions.md   # the system prompt
├── tools/            # @AITool functions
├── skills/           # your SKILL.md folders
├── subagents/        # nested agents
├── gateways/         # chat platforms, web UI, API exposure
├── mcp/              # MCP servers you host
├── schedules/        # BoxLang schedulers
├── interceptors/     # ColdBox interceptors
├── extensions/       # chat commands, keys, listeners
├── deploy/           # named deploy targets
├── tests/specs/      # TestBox specs
├── .env              # keys for local runs (never packaged)
└── box.json
```

Every folder is optional except the definition. A folder holds one definition: `Agent.yml` and `Agent.bx` together is a build error. Use `Agent.bx` only when you need code (hooks, dynamic instructions); `bxAgents new --class` scaffolds it.

## A minimal Agent.yml

```yaml
name: support
description: Answers customer questions about orders
model: openai/gpt-5

environments:
  test:
    model: mock/mock-model
```

An unknown key is a build error, so typos fail loudly. `name` must be unique across the root and every subagent.

## Agent.yml keys

| Key | What it does |
|---|---|
| `name`, `description` | The agent's identity. `name` is also its registry key and names its data home |
| `model` | A `provider/model` slug (or a bare provider, or a model name with `provider`) |
| `provider`, `params`, `options`, `providers` | Default provider and request parameters or options, also per provider |
| `profiles`, `defaultProfile`, `profile` | Named model combinations and which one is used |
| `contextWindow`, `vision` | Facts about the default model, used by the chat |
| `instructions` | Inline prompt. `instructions.md` wins if both exist |
| `tools` | Module tools to give the agent, as `item@module` or `"*@module"` |
| `toolOptions` | Options per module (`bxai.allowedPaths` for file tools, `bxplaywright`) |
| `subAgents` | Folder names under `subagents/` |
| `mcpServers` | MCP servers to use (URL, or `command` for a program) |
| `connectors` | Which built-in connectors are offered (`only`, `exclude`, `override`, `toolWarning`) or `none` |
| `memory`, `checkpointer` | Conversation memory (default: the chat database) and checkpoints |
| `notes`, `vault`, `routines` | Opt in to notes, the vault, and user-made routines |
| `skills` | `agentCanSave` (default true), `autoApprove` (default false) |
| `data`, `volumes` | Data home location and named host folders the file tools may use |
| `usage` | `true` records token counts for `bxAgents stats` (off by default) |
| `agentApi` | Access and path of the HTTP API (see bxagents-operate) |
| `gatewaySession` | How chat platforms queue messages and which commands they allow |
| `security`, `tui`, `extensions` | Guardrails, terminal chat look, extension values |
| `environments` | Per-environment overrides, same keys as the top level |

Pick the environment with `--environment=NAME`, else `BX_AGENTS_ENV`, else `development`.

File tools need both an entry and a folder allow-list, or the build fails:

```yaml
tools: [ readFile@bxai, listDirectory@bxai ]
toolOptions:
  bxai:
    allowedPaths: [ cwd ]
```

## CLI verbs

Run `bxAgents <verb>` (or `boxlang module:bxAgents <verb>`). `bxAgents --help` lists them all.

| Verb | Use |
|---|---|
| `new <folder> [--model=provider/model] [--template=minimal\|webui-chat\|slack-bot\|telegram-bot\|github-bot\|mcp-server\|scheduled\|multi-agent] [--class]` | Scaffold a project. At a terminal with no `--model` it runs a wizard |
| `add tool\|interceptor\|schedule\|mcp\|gateway\|subagent\|skill\|provider\|profile\|capability\|extension` | Add one thing to a project. `--dry-run` shows files, `--force` replaces |
| `inspect [--section=tools,env] [--json]` | Report how the agent is composed, from source, before any build |
| `doctor [--json]` | Check runtime, project validation, missing env vars and API keys. Read only |
| `build [--environment=NAME] [--verbose]` | Validate and generate `.build/` (`app/`, `public/`, `lib/`, `runtime/`). Prints every error found |
| `test` | Run `tests/specs` with TestBox against the mock provider (needs `box install`) |
| `chat` | Terminal chat (see bxagents-chat) |
| `invoke --message="..." [--json] [--server]` | One non-interactive turn, for scripts |
| `serve [--port=8080] [--host=127.0.0.1]` | Start a miniserver on `.build/public`. Needs a prior `build` |
| `package [--version=1.0.0]` | Write `dist/<name>-<version>.bxa` |
| `deploy --name=<entry>` | Ship using a `deploy/` entry |
| `clean [--force]` | Remove `.build/` and `dist/` |

## Typical flow

```bash
bxAgents new support --model=openai/gpt-5
cd support
bxAgents doctor          # is the key set, does the project validate
bxAgents build
bxAgents chat            # try it (--server for the full app)
bxAgents serve           # HTTP API at /__bxagents
```

Change `Agent.yml`, then run `bxAgents build` again; a running chat or server must be restarted to see it. Provider keys (for example `OPENAI_API_KEY`) go in the environment or `.env`, never in `Agent.yml`.

More: docs/conventions/agent-yaml.md, docs/cli-reference.md, docs/guides/new-wizard.md
