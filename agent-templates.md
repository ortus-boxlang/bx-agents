---
title: Agent Templates
icon: phosphor-duotone:squares-four
summary: Every built-in `--template`, sourcing a project from GitHub or ForgeBox instead, and publishing your own.
description: Every built-in `--template`, sourcing a project from GitHub or ForgeBox instead, and publishing your own.
tags: [reference, cli, templates]
---

# Agent Templates

`bxAgents new` creates a project one of three mutually exclusive ways - see [CLI Reference](cli-reference.md#new) for the exact flag syntax and validation rules. This page goes deep on all three: exactly what each built-in `--template` generates, what a `--repo`/`--forgebox` source needs to look like to work as a project source, and how to build and publish one of your own.

```bash
bxAgents new my-agent --model=openai/gpt-5 --template=<name>   # a built-in starter
bxAgents new my-agent --repo=owner/repo-name                   # clone a GitHub repo
bxAgents new my-agent --forgebox=some-package-slug             # install a ForgeBox package
```

Every path lands on the same thing: a directory containing an `Agent.bx` at its root, ready for `bxAgents build`. What differs is where that `Agent.bx` (and everything around it) comes from.

## The 8 built-in `--template` starters

Every template starts from the exact same base skeleton - `Agent.bx`, `instructions.md`, every empty [convention folder](conventions/agent-bx.md), a ready-to-run [`tests/`](conventions/testing.md) folder, a `.env`, and a `.gitignore` - then layers a small, specific amount of pre-wired content on top. None of them need a validator change: each one's extra content reuses a config shape [`ProjectValidator`](conventions/agent-bx.md) already accepts, so a scaffolded project of any template validates cleanly by construction.

::: cards
::: card title="minimal" icon="phosphor-duotone:seedling" href="#minimal"
The bare skeleton. Nothing extra.
:::
::: card title="webui-chat" icon="phosphor-duotone:chat-circle-dots" href="#webui-chat"
A browser chat UI at /chat.
:::
::: card title="slack-bot" icon="phosphor-duotone:slack-logo" href="#slack-bot"
A Slack Socket Mode channel adapter.
:::
::: card title="telegram-bot" icon="phosphor-duotone:telegram-logo" href="#telegram-bot"
A Telegram long-poll channel adapter.
:::
::: card title="github-bot" icon="phosphor-duotone:github-logo" href="#github-bot"
A GitHub issue/PR webhook adapter.
:::
::: card title="mcp-server" icon="phosphor-duotone:plugs-connected" href="#mcp-server"
An example tool exposed as an MCP server.
:::
::: card title="scheduled" icon="phosphor-duotone:clock-countdown" href="#scheduled"
A real ColdBox Scheduler calling the agent.
:::
::: card title="multi-agent" icon="phosphor-duotone:users-three" href="#multi-agent"
Two subagents, wired via configure().
:::
:::

### `minimal`

The default when `--template` is omitted entirely. This IS the base skeleton described above - no extra files. Use it when you're starting from a blank agent and adding conventions yourself as you need them.

### `webui-chat`

Adds `gateways/webui.bx`, exposing the built-in [web chat UI](conventions/web-ui.md) at `/chat`:

```javascript
// gateways/webui.bx
class {

	function configure() {
		return {
			exposes : "webui",
			path    : "/chat"
		};
	}

}
```

After `bxAgents build && bxAgents serve`, the agent is reachable at `http://localhost:8080/chat` - a real static chat page backed by a generated SQLite-based conversation store. No `apiKeyEnvVar`/`users` are configured out of the box, so the page is open by default; see [The web chat UI](conventions/web-ui.md) for locking it down.

### `slack-bot`

Adds `gateways/slack.bx`, a push-style [Slack](conventions/gateways/slack.md) channel adapter (Socket Mode - a persistent websocket, no public webhook needed):

```javascript
// gateways/slack.bx
class {

	function configure() {
		return {
			type           : "slack",
			botTokenEnvVar : "SLACK_BOT_TOKEN",
			appTokenEnvVar : "SLACK_APP_TOKEN"
		};
	}

}
```

Also appends matching stub lines to `.env`:

```bash
## Slack gateway (gateways/slack.bx) - see https://api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

Fill in both real values from a Slack app with Socket Mode enabled before `bxAgents serve` - see [Slack](conventions/gateways/slack.md) for the app-configuration steps.

### `telegram-bot`

Adds `gateways/telegram.bx`, a push-style [Telegram](conventions/gateways/telegram.md) channel adapter (long-poll via `getUpdates`):

```javascript
// gateways/telegram.bx
class {

	function configure() {
		return {
			type           : "telegram",
			botTokenEnvVar : "TELEGRAM_BOT_TOKEN"
		};
	}

}
```

Also appends a matching stub line to `.env`:

```bash
## Telegram gateway (gateways/telegram.bx) - from @BotFather
TELEGRAM_BOT_TOKEN=...
```

Get a token from [@BotFather](https://core.telegram.org/bots#botfather) and drop it in before serving.

### `github-bot`

Adds `gateways/github.bx`, a push-style [GitHub](conventions/gateways/github.md) channel adapter (webhook-driven, `@mention`-gated issue/PR comment threads):

```javascript
// gateways/github.bx
class {

	function configure() {
		return {
			type                : "github",
			tokenEnvVar         : "GITHUB_TOKEN",
			webhookSecretEnvVar : "GITHUB_WEBHOOK_SECRET",
			botNameEnvVar       : "GITHUB_BOT_NAME"
		};
	}

}
```

Also appends matching stub lines to `.env`:

```bash
## GitHub gateway (gateways/github.bx) - a PAT with repo/issues+PR read+write scope
GITHUB_TOKEN=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_BOT_NAME=...
```

`GITHUB_TOKEN` needs a PAT with repo + issues/PR read-write scope; `GITHUB_WEBHOOK_SECRET` is whatever you set the repo's webhook signing secret to; `GITHUB_BOT_NAME` is the account name the bot replies as, used to gate on `@mention`. See [GitHub](conventions/gateways/github.md) for the webhook setup.

### `mcp-server`

Adds an example [MCP](conventions/mcp.md) tool server plus a gateway entry exposing it:

```javascript
// mcp/exampleServer.bx
class {

	function configure() {
		return {
			description : "Example MCP tool server",
			version     : "1.0.0"
		};
	}

}
```

```javascript
// gateways/mcpExpose.bx
class {

	function configure() {
		return {
			exposes : "mcp",
			path    : "/mcp",
			target  : "exampleServer"
		};
	}

}
```

`target` names the `mcp/*` entry to expose - here, the example server above. After `build`/`serve`, any MCP-speaking client can connect at `/mcp`. Add real `@AITool`-annotated functions (or any other MCP-exposable members) to `mcp/exampleServer.bx`, or add more `mcp/*.bx` files entirely, per [mcp/](conventions/mcp.md).

### `scheduled`

Adds a real, hand-written ColdBox scheduler calling the agent on a timer:

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "example" )
			.call( () => getInstance( "my-agent" ).run( "Give me a status update" ) )
			.everyDayAt( "00:00" )
	}

}
```

(`getInstance(...)`'s argument is always the scaffolded agent's own `name`, so it resolves the correct WireBox binding key.) This is real [`schedules/`](conventions/schedules.md) content, not a placeholder - edit `configure()` directly to add/change tasks using ColdBox's own scheduler DSL (`everyMinute()`, `everyHourAt()`, `cron(...)`, etc.).

### `multi-agent`

The one template that changes the root `Agent.bx` itself, rather than only adding files alongside it. Declares two [subagents](conventions/subagents.md) via a `configure()` override:

```javascript
// Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			subAgents : [ "researcher", "writer" ]
		};
	}

}
```

...and scaffolds both as real, working subagent folders:

```
subagents/
├── researcher/
│   ├── Agent.bx
│   └── instructions.md
└── writer/
    ├── Agent.bx
    └── instructions.md
```

Each subagent's own `Agent.bx` is a complete, buildable class-based agent (always against the `mock` provider - a subagent here is a demonstration of the delegation shape, not a working agent out of the box):

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "researcher",
			description : "Gathers facts on a topic. Does not write final prose - that's the writer's job.",
			model       : aiModel( provider: "mock", params: { model: "mock-model" } )
		)
		return this
	}

}
```

`researcher` gathers facts; `writer` turns findings into final prose - a minimal two-role delegation example. See [subagents/](conventions/subagents.md) for how `configure()`'s `subAgents` array (folder names to wire) differs from `super.init()`'s own `subAgents` argument (already-built `AiAgent` instances), and the [multi-agent-team example](guides/example-multi-agent-team.md) for a fuller walkthrough.

## Sourcing a project from GitHub (`--repo`)

```bash
bxAgents new my-agent --repo=owner/repo-name
# or a full URL:
bxAgents new my-agent --repo=https://github.com/owner/repo-name.git
```

Instead of scaffolding from a built-in template, `--repo` clones an existing repository and uses it as the new project directly. Cloning is done with a bundled [JGit](https://www.eclipse.org/jgit/) dependency (`org.eclipse.jgit:org.eclipse.jgit`, from Maven Central) - **no `git` binary needs to be installed or on `PATH`**; the git client ships inside the module's own jar.

**What makes a repo a valid template:** an `Agent.bx` at the repository's root, same as any scaffolded project. Beyond that, there's no special manifest or marker file to add - any BxAgents project (yours, a colleague's, an example from `examples/`) is already a valid `--repo` source as-is.

**What happens on clone, in order:**

1. `owner/repo-name` shorthand resolves to `https://github.com/owner/repo-name.git`; a value already containing `://` or starting with `git@` is used as-is (so a self-hosted GitLab/Bitbucket/etc. HTTPS URL works too, not just GitHub).
2. Refuses to run if the target directory already exists and is **not empty** - nothing is ever cloned over existing files.
3. Clones **shallow** (`--depth=1` - only the current state, no history) via JGit's `cloneRepository()`.
4. **Always deletes the resulting `.git` folder afterward, unconditionally - no flag to keep it.** This is deliberate: a template repo's own git history and `origin` remote have no legitimate reason to survive into a fresh project, and leaving them in place is a real foot-gun (your project's first `git init`/commit/push could otherwise interact with the *template's* upstream repo instead of your own). If you genuinely want the source repo's git history, clone it manually with `git clone` instead of using `bxAgents new --repo`.
5. Verifies `Agent.bx` exists at the cloned root - if not, the whole operation fails with a clear error naming what's missing, rather than leaving behind a half-usable, non-BxAgents directory.

!!! warning
    Cloning is **anonymous HTTPS only** - no credentials are passed to JGit today, so a private repository will fail to clone. Use a public repo, or clone a private one manually and `bxAgents new` isn't the right tool for that case yet.

`--model`, `--name`, and `--description` are **not** required or used with `--repo` - the cloned project already defines its own `Agent.bx` (and therefore its own name/model). Passing `--name`/`--description` anyway produces a warning in the output rather than an error, and is otherwise ignored. The scaffolded-`tests/`'s automatic `box install` step (and `--skipInstall`) also don't apply here - a cloned project's own `tests/` folder, if it has one, is left exactly as cloned.

## Sourcing a project from ForgeBox (`--forgebox`)

```bash
bxAgents new my-agent --forgebox=some-package-slug
```

Installs a [ForgeBox](https://www.forgebox.io) package - CommandBox's package registry, which can host a full app/project template, not just a library - and uses it as the new project. This talks to ForgeBox's own public REST API (`https://www.forgebox.io/api/v1`) directly, using BoxLang's native `bx:http`/`http()` support - **no `box` CLI is required**.

**What makes a ForgeBox entry a valid template:** an `Agent.bx` at the root of its published archive (or nested exactly one folder deep - see the unwrapping note below). ForgeBox has a dedicated `bxagents` entry type for exactly this ("BxAgents" in the ForgeBox UI) - browsing it is the fastest way to find a starting point - but `bxAgents new --forgebox` itself doesn't filter or care about an entry's declared `type` at all when installing; it only cares whether the downloaded archive, once extracted, contains an `Agent.bx`.

**What happens on install, in order:**

1. Refuses to run if the target directory already exists and is **not empty**.
2. `GET /entry/<slug>` looks up the package. A slug that doesn't exist fails clearly and immediately - no download is attempted.
3. Resolves the current release's download URL from the entry's own `latestVersion.downloadURL` (falling back to the newest entry in its `versions` array if that's somehow missing).
4. Downloads the archive and extracts it with BoxLang's own built-in `extract()` BIF (zip support - no bespoke unzip code involved).
5. **Unwraps one level of nesting automatically**, if present: many ForgeBox archives (matching a typical GitHub zip export) wrap their entire contents in one top-level folder. If extraction produces exactly one top-level entry and it's a directory, its contents are moved up so the target directory itself ends up as the project root.
6. Verifies `Agent.bx` exists at the (possibly unwrapped) root - if not, the whole operation fails, since a ForgeBox slug could just as easily be an unrelated library rather than a project template.

Same as `--repo`: `--model`/`--name`/`--description` are not required (warned-and-ignored if passed anyway - the installed project defines its own), and the `tests/` auto-`box install`/`--skipInstall` step doesn't apply.

## Publishing your own template

A BxAgents template - whether you'll share it via GitHub, ForgeBox, or both - is just an ordinary BxAgents project (an `Agent.bx` at its root, plus whatever conventions it uses) with the specifics filled in for someone else to copy and adapt, rather than left as placeholders for you personally.

### 1. Build the project

Start from any of the 8 built-in starters above (or from scratch) and shape it into what you want people to start from:

```bash
bxAgents new my-template --model=openai/gpt-5 --template=<closest starting point>
```

A few things worth doing deliberately, since someone else will `bxAgents new --repo=...`/`--forgebox=...` this and expect it to just work:

- **Keep `Agent.bx` generic and buildable out of the box.** Don't hardcode a real API key or point at a paid-only model by default - `test()`'s `mock/mock-model` override (already scaffolded) means `bxAgents test` still works with zero setup even if `init()`'s real model needs a key nobody but you has yet.
- **Ship a real `instructions.md`** describing the agent's actual purpose, not the generic "You are a helpful AI agent" placeholder `new` scaffolds by default.
- **Document required env vars in `.env`** as commented stub lines (`SLACK_BOT_TOKEN=xoxb-...`, etc.) exactly like the `slack-bot`/`telegram-bot`/`github-bot` templates do above - it's the first thing someone reads after cloning.
- **Verify it from cold**, the same way a stranger would receive it: `rm -rf .build dist`, then `bxAgents build && bxAgents test` (and `bxAgents doctor` to catch anything env/dependency-related) from a completely fresh checkout.
- **Never commit `.build/`, `dist/`, or a real `.env`** - the scaffolded `.gitignore` already covers all three; keep it.

### 2a. Publish it to GitHub

Nothing BxAgents-specific is needed - push the project to a public GitHub repository with `Agent.bx` at the root (or push a subtree; `--repo` only unwraps ForgeBox's own single-nesting convention, not arbitrary repo layouts, so keep `Agent.bx` at the actual repo root). Anyone can then run:

```bash
bxAgents new my-agent --repo=your-org/your-template-repo
```

A short "Getting Started" section in the repo's own `README.md` (what env vars to set, which model to point at) goes a long way, since `--repo` doesn't read or surface anything from the README itself - it's purely for the human cloning it.

### 2b. Publish it to ForgeBox

ForgeBox packages are described by a `box.json` at the project root - the same file CommandBox's own package system uses everywhere else. At minimum:

```json
{
	"name": "My BxAgents Template",
	"slug": "my-bxagents-template",
	"version": "1.0.0",
	"type": "bxagents",
	"shortDescription": "A short description of what this agent template does",
	"private": false
}
```

- **`slug`** is the unique name people install with (`--forgebox=my-bxagents-template`) - it's also what `getEntry()` looks up, so pick one you're happy to keep.
- **`type`** should be `bxagents` - ForgeBox's own dedicated entry type for BxAgents projects/templates (run `box forgebox types` to see it alongside every other type). `bxAgents new --forgebox` itself never inspects `type` when installing, but declaring it correctly is what gets your template listed under ForgeBox's own "BxAgents" category instead of a generic one, so people can actually find it by browsing. Add descriptive `keywords` too (e.g. `"boxlang"`, `"ai-agent"`), since that's what full-text search uses.
- **`version`** should be bumped (`box bump --patch`/`--minor`/`--major`, from inside the template's own folder) each time you publish a change - `bxAgents new --forgebox` always installs whatever `latestVersion` currently resolves to.

Then, from inside the project:

```bash
box forgebox register   # once, if you don't already have a ForgeBox account
box publish
```

`publish` reads `readme`/`instructions`/`changelog` files from the folder by convention and publishes them as the entry's description/installation notes/changelog - worth having a real `README.md` for the same reason as the GitHub path above. Once published, anyone can run:

```bash
bxAgents new my-agent --forgebox=my-bxagents-template
```

!!! info
    `bxAgents new --forgebox` already unwraps one level of nesting automatically (see above), so you don't need `box.json`'s `createPackageDirectory: false` setting for this specific path to work - that flag only matters for `box install`'s own separate install conventions, not this module's installer.
