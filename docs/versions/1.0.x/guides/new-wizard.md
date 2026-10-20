---
title: "The new wizard"
icon: phosphor-duotone:magic-wand
summary: "Answer a few questions and bxAgents new builds the agent: tools, MCP servers, channels, access and deploy target."
description: "Answer a few questions and bxAgents new builds the agent: tools, MCP servers, channels, access and deploy target."
tags: [guides, cli, wizard]
---

# The new wizard

Run `bxAgents new` in a terminal with no `--model` and it asks what the agent should do, then writes the project to match. Nothing in it is magic: every answer ends up in a file you can read, and the last screen prints the one-line command that would build the same project without any questions.

```bash
bxAgents new my-agent
```

It is a full-screen UI in the teal of the BxAgents logo. Arrow keys (or `j`/`k`) move, Space ticks, Enter confirms, **Esc goes back one question**, **Ctrl+C cancels** and creates nothing. Answers you have given collapse to one line each above the current question.

## What it asks

| Stage | What you choose | What it writes |
|---|---|---|
| Name, purpose | The agent's name and a one-line description | `name`, `description` in [`Agent.yaml`](../conventions/agent-yaml.md) |
| Shape | A single agent, a team, a scheduled agent, an MCP server | The matching [template](../agent-templates.md) |
| Model | A provider, then optionally a model name (Enter takes the provider's default) | `model`, and a stub for the provider's `<PROVIDER>_API_KEY` in `.env` |
| Tools | Date and time, fetch pages, search the web, browse websites, files, images and speech | A [`tools:`](../conventions/agent-yaml.md#tools) list; browsing also adds `bx-playwright` to your `box.json` |
| Search provider | The built-in one, Brave, Tavily, Exa or Google | A key stub in `.env`, and a line in `instructions.md` telling the agent which provider to use |
| File tools | Read only, all 19, or tool by tool, then the folders they may use | [`toolOptions.bxai.allowedPaths`](../conventions/agent-yaml.md#file-tools) |
| Memory | In memory, or saved to disk | `memory` and `checkpointer` |
| MCP servers | GitHub, Stripe, Notion, Atlassian, Cloudflare, Supabase | [`mcpServers`](../conventions/mcp.md#consuming-remote-servers) entries and token stubs |
| Channels | Web chat, HTTP API, Telegram, Slack, Discord, WhatsApp, Teams, SMS, GitHub, Email, Signal | A `gateways/*.bx` file and the stubs it needs |
| Web access | Open, a shared key, or named users with passwords | `apiKeyEnvVar` or `users` on the web chat entry |
| Guard | Flag, block or ignore suspicious input | A [`security`](../conventions/agent-yaml.md#settings) block |
| Deploy | Docker, DigitalOcean, SSH, SFTP, FTP, a local folder, or later | `deploy/<target>.json` |

A stage whose answer you already gave as a flag is skipped and shown as answered. A stage that does not apply (the search provider when search is off) is skipped without a word.

## File tools never get the whole disk

bx-ai ships 19 file tools but registers none of them. The wizard offers them, and always asks **which folders** they may use: the temp folder (`tmp`), the folder you run the agent from (`cwd`), or a path you type. It will not continue with none. There is no way to ask for unrestricted access from the wizard or from the flags; an empty list is refused because bx-ai reads an empty list as "everywhere".

```yaml
tools:
  - readFile@bxai
  - listDirectory@bxai
toolOptions:
  bxai:
    allowedPaths:
      - tmp
      - cwd
```

## Secrets

The wizard never asks you to type a secret that it stores.

- **API keys and tokens** go in `.env` as empty stubs, each under a comment saying where to get it. The files that use them hold only the variable's **name**.
- A **web access key** is generated for you (a random 64-character value) and written to `.env`, because it protects something you are about to run.
- A **web chat password** is hashed with the same PBKDF2 hasher as `bxAgents hash-password`; only the hash reaches `gateways/webui.bx`, and it is safe to commit.

`.env` is in the `.gitignore` the project is created with.

## MCP servers

All servers in the picker are remote (HTTP) servers that the bundled bx-ai can connect to, listed with how risky they are. Each starts with its credential read from the environment when the app starts:

```yaml
mcpServers:
  - name: github
    url: "https://api.githubcopilot.com/mcp/"
    token: "${env.GITHUB_PERSONAL_ACCESS_TOKEN}"
```

| Server | Credential | Risk |
|---|---|---|
| GitHub | `GITHUB_PERSONAL_ACCESS_TOKEN` | High: can open and merge pull requests, push files, trigger Actions |
| Stripe | `STRIPE_AGENT_API_KEY` | High: moves money. Use a sandbox account first |
| Notion | `NOTION_MCP_TOKEN` | Medium: edits and deletes pages. Tokens need a Business or Enterprise plan |
| Atlassian | `ATLASSIAN_API_TOKEN` | Medium. Unverified: the header an API token goes in is not documented |
| Cloudflare | `CLOUDFLARE_API_TOKEN` | High: DNS, Workers, billable resources, depending on the token |
| Supabase | `SUPABASE_ACCESS_TOKEN` | High: runs SQL. The address starts read-only |

Picking a high-risk server shows what it can do before you continue. **Git** is in the catalog but not offered yet: it runs as a local program, and the bx-ai bundled with this release talks to web MCP servers only.

## After it is created

`new` runs `box install` (skip it with `--skipInstall`), then prints what is left: the keys to fill in, how to chat, test, serve and deploy, and, for each channel you chose, the setup that happens outside the project. For WhatsApp that means the Meta app, the verify token and a public address; for Slack, Socket Mode and two tokens; for Signal, a running `signal-cli`. The same steps live on each [gateway page](../conventions/gateways/index.md).

## Without the wizard

The wizard writes nothing a flag cannot. The last screen prints the command; this one came from a real run:

```bash
bxAgents new support-bot --name=support-bot --model=claude --with=time,fetch,search --search=brave \
  --mcp=github --channels=web,telegram --web-auth=key --guard=flag --deploy=docker --registry=ghcr:me/support-bot
```

| Flag | Takes |
|---|---|
| `--with` | `time`, `fetch`, `search`, `browse`, `files`, `media` (a list) |
| `--search` | `http`, `brave`, `tavily`, `exa`, `google` |
| `--files`, `--files-dir` | `read`, `all` or a list of tool names; folders as `tmp`, `cwd` or absolute paths. Both are needed together |
| `--memory` | `cache` or `file` |
| `--mcp` | MCP server ids (a list) |
| `--channels` | `web`, `api`, or channel ids (a list) |
| `--web-auth` | `open` or `key`. Users need passwords, so they come from the wizard or from `gateways/webui.bx` |
| `--guard` | `off`, `flag` or `block` |
| `--deploy` | `docker`, `digitalocean`, `ssh`, `sftp`, `ftp`, `local`, with `--registry=ghcr:owner/name` (or `dockerhub:`, `docr:`), `--app`, `--region`, `--host`, `--user`, `--remote-path`, `--destination` as the target needs |

A flag with a bad value stops the command and says what the flag accepts. The wizard turns on when:

| You run | Result |
|---|---|
| `bxAgents new` at a terminal | The full-screen wizard |
| `bxAgents new` in a pipe, or with `--no-tui` | The same questions as numbered lines. Type `back` to go back |
| `bxAgents new --model=...` | No questions: a model means a script is calling. Add `--wizard` to be asked the rest |
| `bxAgents new --no-wizard` or `--yes` | No questions, flags and defaults only |

Set `NO_COLOR` for plain output. The Agent.yaml options the wizard writes need the default `Agent.yaml`, so they cannot be combined with `--class`.
