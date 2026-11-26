---
title: connector catalog
icon: phosphor-duotone:puzzle-piece
summary: The connectors that ship with BX Agents: what each one does, how a person connects it, how risky it is, and its options.
description: The connectors that ship with BX Agents: what each one does, how a person connects it, how risky it is, and its options.
tags: [conventions, mcp, secrets]
---

# Connector catalog

This page is written from the connector files in `src/main/bx/catalog/connectors/` (`tools/generate-connector-docs.bxs`), so it says what the product does. See [connectors](connectors.md) for how they work, and [how to add one](connectors.md#adding-a-connector).

## Developer

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Cloudflare](#cloudflare) | sign in or token | high | The Cloudflare API: DNS, Workers, rules and more |
| [Context7](#context7) | token | low | Up-to-date documentation and code examples for libraries |
| [Git](#git) | a local program (an admin) | medium | Read, search and change local Git repositories |
| [GitHub](#github) | token | high | Repositories, issues, pull requests, Actions and code search |
| [Netlify](#netlify) | sign in | high | Create, deploy and manage Netlify sites from an agent |
| [Supabase](#supabase) | sign in or token | high | Database, SQL, migrations, projects and branches |
| [Vercel](#vercel) | sign in | high | Search Vercel docs, manage projects, inspect deployments and logs, and query Web Analytics |

## Productivity

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Atlassian (Jira and Confluence)](#atlassian-jira-and-confluence) | sign in or token | medium | Jira work items, Confluence pages, Bitbucket |
| [Calendly](#calendly) | sign in | high | List event types and meetings, create scheduling links and bookings, read meeting notes |
| [ClickUp](#clickup) | sign in | high | Search, create and update tasks, documents and chat messages |
| [Gamma](#gamma) | sign in | medium | Create, search, edit and export presentations, documents and webpages |
| [HyperFrames by HeyGen](#hyperframes-by-heygen) | sign in | medium | Create, revise and render videos from a text description |
| [Linear](#linear) | sign in or token | medium | Find, create and update issues, projects, documents and comments |
| [Notion](#notion) | sign in or token | medium | Search, read, create and update pages and databases |
| [RingCentral Chat](#ringcentral-chat) | sign in | high | Team messaging chats, direct conversations, teams and posts in RingEX |
| [RingCentral Phone](#ringcentral-phone) | sign in | high | Call logs, contacts, messages, presence and SMS in RingEX |
| [Slack](#slack) | token | high | Search channels and people, read threads, send messages, canvases, files and lists |
| [Whop](#whop) | sign in | high | Search the Whop docs and read or change live Whop data |

## Finance

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Daloopa](#daloopa) | sign in | low | Company financials, KPIs, filings and earnings transcripts |
| [S&P Global](#sp-global) | sign in | low | Financial data and company research from the Kensho LLM-ready API |
| [Stripe](#stripe) | sign in or token | high | Customers, invoices, subscriptions, refunds and documentation search |

## Analytics

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Mixpanel](#mixpanel) | sign in | medium | Run reports on events, funnels and retention, and browse dashboards (US data region) |

## Social Media

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Buffer](#buffer) | sign in or token | high | Read channels and queue, schedule and edit posts, capture ideas and pull post analytics |
| [Metricool](#metricool) | sign in | high | Manage brands, read social analytics and schedule posts |

## Apps

| Connector | Connects with | Risk | What it does |
|---|---|---|---|
| [Wix](#wix) | sign in | high | Search Wix documentation and make API calls on your Wix sites |
| [Zapier](#zapier) | sign in or token | high | Run actions in the apps connected to your Zapier account |

## Details

### Cloudflare

`cloudflare`. The Cloudflare API: DNS, Workers, rules and more. Listed under Developer.

- **Connects with:** sign in or token.
- **Risk:** high. Three tools (search, execute and docs) reach more than 2,500 endpoints, so turning tools on or off does not limit it. Only the scopes of the sign in or the permissions of the token do. It can change DNS, Workers and rules and create billable resources.
- **Address:** `https://mcp.cloudflare.com/mcp`
- **Sign in:** OAuth with the scopes `user:read`, `account:read`.
- **Token:** sealed in the vault as `CLOUDFLARE_API_TOKEN`, only for mcp.cloudflare.com. A Cloudflare API token, user or account. Scope it to the accounts and zones the agent should touch.

[Documentation](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/). Checked on 2026-11-14.

### Context7

`context7`. Up-to-date documentation and code examples for libraries. Listed under Developer.

- **Connects with:** token.
- **Risk:** low. Reads public library documentation. The library name and the question the agent asks are sent to Context7's servers.
- **Address:** `https://mcp.context7.com/mcp`
- **Token:** sealed in the vault as `CONTEXT7_API_KEY`, only for mcp.context7.com. A Context7 API key (starts with ctx7sk), made on the dashboard at context7.com. The server also answers without one, at much lower rate limits.

[Documentation](https://context7.com/docs/resources/all-clients). Checked on 2026-11-26.

### Git

`git`. Read, search and change local Git repositories. Listed under Developer.

- **Connects with:** a local program (an admin).
- **Risk:** medium. Can add, reset, commit, merge and switch branches. Described by its authors as in early development. Without a repository set it can reach every repository the process can.
- **Runs:** `uvx mcp-server-git==2026.11.11` on the machine the agent runs on. It needs `uvx` on the PATH. Install uv (https://docs.astral.sh/uv/) so the agent can start this server. It runs on the machine the agent runs on, in the folder you start the agent from.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `repository` | A path inside a Git working tree. The server then works only in that repository. Left empty, it can read and write any repository the process can reach. | arg `--repository` | every way in |

[Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/git). Checked on 2026-11-17.

### GitHub

`github`. Repositories, issues, pull requests, Actions and code search. Listed under Developer.

- **Connects with:** token.
- **Risk:** high. Can create pull requests, push files, merge, delete files and trigger Actions. Prefer a fine-grained token with read access first.
- **Address:** `https://api.githubcopilot.com/mcp/`
- **Token:** sealed in the vault as `GITHUB_PERSONAL_ACCESS_TOKEN`, only for api.githubcopilot.com. A personal access token. Give it only the repositories and permissions the agent needs.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `toolsets` | A comma separated list of the GitHub toolsets to enable, for example issues,pull_requests. Left empty, the server's default set is used. | header `X-MCP-Toolsets` | every way in |
| `readonly` | Turns off every tool that changes something. | header `X-MCP-Readonly` | every way in |

[Documentation](https://github.com/github/github-mcp-server). Checked on 2026-11-14.

### Netlify

`netlify`. Create, deploy and manage Netlify sites from an agent. Listed under Developer.

- **Connects with:** sign in.
- **Risk:** high. Can create and change sites and publish deploys in the person's Netlify account, which can reach production sites. Start with a test site.
- **Address:** `https://mcp.netlify.com/mcp`
- **Sign in:** OAuth.

[Documentation](https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/). Checked on 2026-11-26.

### Supabase

`supabase`. Database, SQL, migrations, projects and branches. Listed under Developer.

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

### Vercel

`vercel`. Search Vercel docs, manage projects, inspect deployments and logs, and query Web Analytics. Listed under Developer.

- **Connects with:** sign in.
- **Risk:** high. Can manage projects and deployments in the person's Vercel account, which can reach production sites. Start with a test team or project.
- **Address:** `https://mcp.vercel.com`
- **Sign in:** OAuth.

[Documentation](https://vercel.com/docs/mcp/vercel-mcp). Checked on 2026-11-26.

### Atlassian (Jira and Confluence)

`atlassian`. Jira work items, Confluence pages, Bitbucket. Listed under Productivity.

- **Connects with:** sign in or token.
- **Risk:** medium. Creates and updates work items and pages and posts comments.
- **Address:** `https://mcp.atlassian.com/v2/mcp`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `ATLASSIAN_API_TOKEN`, only for mcp.atlassian.com. A service account API key, sent as a Bearer token. An organization admin must allow API token sign in first. Personal API tokens use Basic authentication and are not supported here. Tokens are not tied to one site and some tools are missing.

[Documentation](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/). Checked on 2026-11-14.

### Calendly

`calendly`. List event types and meetings, create scheduling links and bookings, read meeting notes. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** high. Can book and cancel meetings, create event types, mark no-shows and invite people to the organization, which can send emails to other people.
- **Address:** `https://mcp.calendly.com`
- **Sign in:** OAuth with the scopes `mcp:scheduling:read`, `mcp:scheduling:write`.

[Documentation](https://developer.calendly.com/docs/mcp/calendly-mcp-server). Checked on 2026-11-26.

### ClickUp

`clickup`. Search, create and update tasks, documents and chat messages. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** high. Can create and change tasks and documents and post chat messages that other people in the workspace see. It has no delete tools.
- **Address:** `https://mcp.clickup.com/mcp`
- **Sign in:** OAuth.

[Documentation](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server). Checked on 2026-11-26.

### Gamma

`gamma`. Create, search, edit and export presentations, documents and webpages. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** medium. Can create and edit gammas in the workspace and uses the workspace's credits when it generates or edits.
- **Address:** `https://mcp.gamma.app/mcp`
- **Sign in:** OAuth.

[Documentation](https://developers.gamma.app/mcp/gamma-mcp-server). Checked on 2026-11-26.

### HyperFrames by HeyGen

`hyperframes`. Create, revise and render videos from a text description. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** medium. Creates and renders videos in the person's HeyGen account, which can use credits. The documentation calls this connector a beta.
- **Address:** `https://mcp.heygen.com/mcp/hyperframes/`
- **Sign in:** OAuth.

[Documentation](https://hyperframes.heygen.com/guides/mcp). Checked on 2026-11-26.

### Linear

`linear`. Find, create and update issues, projects, documents and comments. Listed under Productivity.

- **Connects with:** sign in or token.
- **Risk:** medium. Can create and change issues, projects, documents and comments in the workspace. Use a read-only key to limit it.
- **Address:** `https://mcp.linear.app/mcp`
- **Sign in:** OAuth with the scopes `read`, `write`.
- **Token:** sealed in the vault as `LINEAR_API_KEY`, only for mcp.linear.app. A Linear API key, or an OAuth access token from your own Linear OAuth app. A key with only the Read permission gives read-only access.

[Documentation](https://linear.app/docs/mcp). Checked on 2026-11-26.

### Notion

`notion`. Search, read, create and update pages and databases. Listed under Productivity.

- **Connects with:** sign in or token.
- **Risk:** medium. Can edit and delete pages and databases.
- **Address:** `https://mcp.notion.com/mcp`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `NOTION_MCP_TOKEN`, only for mcp.notion.com. A token made by a workspace owner under New MCP token in the developer portal. Business and Enterprise plans only.

[Documentation](https://developers.notion.com/guides/mcp/get-started-with-mcp). Checked on 2026-11-14.

### RingCentral Chat

`ringcentral-chat`. Team messaging chats, direct conversations, teams and posts in RingEX. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** high. Can read and post messages in your chats and teams as you. This is a RingCentral Labs preview.
- **Address:** `https://mcp.labs.ringcentral.com/ringex/team-chat`
- **Sign in:** OAuth with the scopes `ReadAccounts`, `TeamMessaging`.

[Documentation](https://developers.ringcentral.com/mcp/servers/). Checked on 2026-11-26.

### RingCentral Phone

`ringcentral-phone`. Call logs, contacts, messages, presence and SMS in RingEX. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** high. Can read call history and messages and send SMS from your number. This is a RingCentral Labs preview.
- **Address:** `https://mcp.labs.ringcentral.com/ringex/phone`
- **Sign in:** OAuth with the scopes `ReadAccounts`, `ReadContacts`, `ReadCallLog`, `AI`, `ReadMessages`, `ReadPresence`, `SMS`.

[Documentation](https://developers.ringcentral.com/mcp/servers/). Checked on 2026-11-26.

### Slack

`slack`. Search channels and people, read threads, send messages, canvases, files and lists. Listed under Productivity.

- **Connects with:** token.
- **Risk:** high. Can send and schedule messages as the person, add reactions, create channels and canvases, upload files and read private channels and direct messages the token reaches. Use a test workspace first, and give the token read scopes only to start with.
- **Address:** `https://mcp.slack.com/mcp`
- **Token:** sealed in the vault as `SLACK_MCP_TOKEN`, only for mcp.slack.com. A Slack user token (xoxp-...) of a Slack app that is internal to your workspace or published in the Slack Marketplace, with only the scopes the agent needs (docs.slack.dev lists the scopes of each tool). Slack does not accept dynamic client registration, so there is no sign in, and an app that is neither internal nor published is refused. (not verified yet)

[Documentation](https://docs.slack.dev/ai/slack-mcp-server). Checked on 2026-11-26.

### Whop

`whop`. Search the Whop docs and read or change live Whop data. Listed under Productivity.

- **Connects with:** sign in.
- **Risk:** high. Asks for admin access and works on production data only. It can change products, plans and payments data. There is no sandbox.
- **Address:** `https://mcp.whop.com/mcp`
- **Sign in:** OAuth with the scopes `admin`.

[Documentation](https://docs.whop.com/developer/guides/ai_and_mcp.md). Checked on 2026-11-26.

### Daloopa

`daloopa`. Company financials, KPIs, filings and earnings transcripts. Listed under Finance.

- **Connects with:** sign in.
- **Risk:** low. Reads financial data, filings and stock prices. It cannot change anything. You need a Daloopa account.
- **Address:** `https://mcp.daloopa.com/server/mcp`
- **Sign in:** OAuth.

[Documentation](https://docs.daloopa.com/docs/daloopa-mcp). Checked on 2026-11-26.

### S&P Global

`spglobal`. Financial data and company research from the Kensho LLM-ready API. Listed under Finance.

- **Connects with:** sign in.
- **Risk:** low. Reads financial and market data. It cannot change anything. You need a Kensho account.
- **Address:** `https://kfinance.kensho.com/integrations/mcp`
- **Sign in:** OAuth with the scopes `kensho:app:kfinance`, `offline_access`.

[Documentation](https://docs.kensho.com/llmreadyapi/mcp). Checked on 2026-11-26.

### Stripe

`stripe`. Customers, invoices, subscriptions, refunds and documentation search. Listed under Finance.

- **Connects with:** sign in or token.
- **Risk:** high. Moves money. Its write tool covers POST, PATCH, PUT and DELETE. Stripe asks for human confirmation on refunds and outbound payments.
- **Address:** `https://mcp.stripe.com`
- **Sign in:** OAuth with the scopes `mcp`.
- **Token:** sealed in the vault as `STRIPE_AGENT_API_KEY`, only for mcp.stripe.com. An agent API key with the smallest set of permissions. Use a sandbox account first. Stripe stops accepting full-access secret keys and restricted keys without the Agent tag on 2026-11-30.

| Option | What it does | Goes to | For |
|---|---|---|---|
| `connectedAccount` | The id of a connected account (acct_...) to act as. Platform agent API keys only; OAuth cannot act as a connected account. | header `Stripe-Account` | a token |

[Documentation](https://docs.stripe.com/mcp). Checked on 2026-11-14.

### Mixpanel

`mixpanel`. Run reports on events, funnels and retention, and browse dashboards (US data region). Listed under Analytics.

- **Connects with:** sign in.
- **Risk:** medium. Reads analytics data, and can also create, edit and delete dashboards, tags and event definitions in the person's project. This address is for projects in the US region; Mixpanel lists other addresses for the EU and India.
- **Address:** `https://mcp.mixpanel.com/mcp`
- **Sign in:** OAuth.

[Documentation](https://docs.mixpanel.com/docs/mcp). Checked on 2026-11-26.

### Buffer

`buffer`. Read channels and queue, schedule and edit posts, capture ideas and pull post analytics. Listed under Social Media.

- **Connects with:** sign in or token.
- **Risk:** high. Can schedule, edit and delete posts that go out to the connected social channels. Use a test channel first.
- **Address:** `https://mcp.buffer.com/mcp`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `BUFFER_API_KEY`, only for mcp.buffer.com. A Buffer API key made in Settings, API at publish.buffer.com/settings/api. It reaches every organization and channel in the account.

[Documentation](https://developers.buffer.com/guides/integrations/mcp.md). Checked on 2026-11-26.

### Metricool

`metricool`. Manage brands, read social analytics and schedule posts. Listed under Social Media.

- **Connects with:** sign in.
- **Risk:** high. Can schedule and publish posts to the connected social accounts and change brand settings. Plan limits still apply.
- **Address:** `https://ai.metricool.com/mcp`
- **Sign in:** OAuth with the scopes `mcp:read`, `mcp:write`.

[Documentation](https://help.metricool.com/how-to-connect-metricools-mcp-with-claude-0l84v.md). Checked on 2026-11-26.

### Wix

`wix`. Search Wix documentation and make API calls on your Wix sites. Listed under Apps.

- **Connects with:** sign in.
- **Risk:** high. Can change site content, store data and other settings through the Wix APIs, including on a live site.
- **Address:** `https://mcp.wix.com/mcp`
- **Sign in:** OAuth with the scopes `offline_access`.

[Documentation](https://dev.wix.com/docs/sdk/articles/use-the-wix-mcp/about-the-wix-mcp.md). Checked on 2026-11-26.

### Zapier

`zapier`. Run actions in the apps connected to your Zapier account. Listed under Apps.

- **Connects with:** sign in or token.
- **Risk:** high. Can run any action you enable in Zapier, such as sending email and messages or changing records in other apps. Enable only the actions you need.
- **Address:** `https://mcp.zapier.com/api/v1/connect`
- **Sign in:** OAuth.
- **Token:** sealed in the vault as `ZAPIER_MCP_TOKEN`, only for mcp.zapier.com. A connection token. Create a server at mcp.zapier.com, then generate its token. It is shown once and stays valid until you regenerate it.

[Documentation](https://docs.zapier.com/mcp/overview/how-connections-work.md). Checked on 2026-11-26.
