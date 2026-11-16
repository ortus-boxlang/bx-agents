---
title: connector catalog
icon: phosphor-duotone:puzzle-piece
summary: The connectors that ship with BX Agents: what each one does, how a person connects it, how risky it is, and its options.
description: The connectors that ship with BX Agents: what each one does, how a person connects it, how risky it is, and its options.
tags: [conventions, mcp, secrets]
---

# Connector catalog

This page is written from the connector files in `src/main/bx/catalog/connectors/` (`tools/generate-connector-docs.bxs`), so it says what the product does. See [connectors](connectors.md) for how they work, and [how to add one](connectors.md#adding-a-connector).

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Atlassian (Jira and Confluence)](#atlassian) | sign in or token | medium | Jira work items, Confluence pages, Bitbucket |
| [Cloudflare](#cloudflare) | sign in or token | high | The Cloudflare API: DNS, Workers, rules and more |
| [Git](#git) | a local program (an admin) | medium | Read, search and change local Git repositories |
| [GitHub](#github) | token | high | Repositories, issues, pull requests, Actions and code search |
| [Notion](#notion) | sign in or token | medium | Search, read, create and update pages and databases |
| [Stripe](#stripe) | sign in or token | high | Customers, invoices, subscriptions, refunds and documentation search |
| [Supabase](#supabase) | sign in or token | high | Database, SQL, migrations, projects and branches |

## Atlassian (Jira and Confluence)

`atlassian`. Jira work items, Confluence pages, Bitbucket.

- **Connects with:** sign in or token.
- **Risk:** medium. Creates and updates work items and pages and posts comments.
- **Address:** `https://mcp.atlassian.com/v2/mcp`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `ATLASSIAN_API_TOKEN`, only for mcp.atlassian.com. A service account API key, sent as a Bearer token. An organization admin must allow API token sign in first. Personal API tokens use Basic authentication and are not supported here. Tokens are not tied to one site and some tools are missing.

[Documentation](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/). Checked on 2026-11-14.

## Cloudflare

`cloudflare`. The Cloudflare API: DNS, Workers, rules and more.

- **Connects with:** sign in or token.
- **Risk:** high. Three tools (search, execute and docs) reach more than 2,500 endpoints, so turning tools on or off does not limit it. Only the scopes of the sign in or the permissions of the token do. It can change DNS, Workers and rules and create billable resources.
- **Address:** `https://mcp.cloudflare.com/mcp`
- **Sign in:** OAuth with the scopes `user:read`, `account:read`.
- **Token:** sealed in the vault as `CLOUDFLARE_API_TOKEN`, only for mcp.cloudflare.com. A Cloudflare API token, user or account. Scope it to the accounts and zones the agent should touch.

[Documentation](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/). Checked on 2026-11-14.

## Git

`git`. Read, search and change local Git repositories.

- **Connects with:** a local program (an admin).
- **Risk:** medium. Can add, reset, commit, merge and switch branches. Described by its authors as in early development. Without a repository set it can reach every repository the process can.
- **Runs:** `uvx mcp-server-git` on the machine the agent runs on. It needs `uvx` on the PATH. Install uv (https://docs.astral.sh/uv/) so the agent can start this server. It runs on the machine the agent runs on, in the folder you start the agent from.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `repository` | A path inside a Git working tree. The server then works only in that repository. Left empty, it can read and write any repository the process can reach. | arg `--repository` | every way in |

[Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/git). Checked on 2026-11-14.

## GitHub

`github`. Repositories, issues, pull requests, Actions and code search.

- **Connects with:** token.
- **Risk:** high. Can create pull requests, push files, merge, delete files and trigger Actions. Prefer a fine-grained token with read access first.
- **Address:** `https://api.githubcopilot.com/mcp/`
- **Token:** sealed in the vault as `GITHUB_PERSONAL_ACCESS_TOKEN`, only for api.githubcopilot.com. A personal access token. Give it only the repositories and permissions the agent needs.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `toolsets` | A comma separated list of the GitHub toolsets to enable, for example issues,pull_requests. Left empty, the server's default set is used. | header `X-MCP-Toolsets` | every way in |
| `readonly` | Turns off every tool that changes something. | header `X-MCP-Readonly` | every way in |

[Documentation](https://github.com/github/github-mcp-server). Checked on 2026-11-14.

## Notion

`notion`. Search, read, create and update pages and databases.

- **Connects with:** sign in or token.
- **Risk:** medium. Can edit and delete pages and databases.
- **Address:** `https://mcp.notion.com/mcp`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `NOTION_MCP_TOKEN`, only for mcp.notion.com. A token made by a workspace owner under New MCP token in the developer portal. Business and Enterprise plans only.

[Documentation](https://developers.notion.com/guides/mcp/get-started-with-mcp). Checked on 2026-11-14.

## Stripe

`stripe`. Customers, invoices, subscriptions, refunds and documentation search.

- **Connects with:** sign in or token.
- **Risk:** high. Moves money. Its write tool covers POST, PATCH, PUT and DELETE. Stripe asks for human confirmation on refunds and outbound payments.
- **Address:** `https://mcp.stripe.com`
- **Sign in:** OAuth with the scopes `mcp`.
- **Token:** sealed in the vault as `STRIPE_AGENT_API_KEY`, only for mcp.stripe.com. An agent API key with the smallest set of permissions. Use a sandbox account first. Stripe stops accepting full-access secret keys and restricted keys without the Agent tag on 2026-11-30.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `connectedAccount` | The id of a connected account (acct_...) to act as. Platform agent API keys only; OAuth cannot act as a connected account. | header `Stripe-Account` | a token |

[Documentation](https://docs.stripe.com/mcp). Checked on 2026-11-14.

## Supabase

`supabase`. Database, SQL, migrations, projects and branches.

- **Connects with:** sign in or token.
- **Risk:** high. Runs SQL and migrations and can create paid projects. Read only is on by default; add a project to limit it to one. Table data can carry prompt injection, so never give it to end users.
- **Address:** `https://mcp.supabase.com/mcp`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `SUPABASE_ACCESS_TOKEN`, only for mcp.supabase.com. A personal access token.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `project_ref` | Limits the connector to one project and turns off the account tools. | query `project_ref` | every way in |
| `read_only` | Runs queries as a read only Postgres user. On by default. | query `read_only` | every way in |
| `features` | A comma separated list of the tool groups to enable. Left empty, the server's default groups are used. | query `features` | every way in |

[Documentation](https://supabase.com/docs/guides/getting-started/mcp). Checked on 2026-11-14.
