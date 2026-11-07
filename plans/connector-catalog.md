# Plan: the connector catalog

Status: for review. No code in this pull request.

## What and why

BX Agents ships a **registry of known connectors**: plain data describing remote MCP servers (and one program) that an agent can use. Nothing in it is active. A person has to **connect** a connector before the agent gets its tools. We ship data only and never connect to anything ourselves.

It replaces the private list the wizard keeps today (`src/main/bx/models/wizard/catalog/mcp-servers.json`: GitHub, Stripe, Notion, Atlassian, Cloudflare, Supabase, Git). The same files feed the wizard, the build, the CLI, the web and terminal chat, the docs and the home page, and anyone can send a pull request to add one.

## Decisions already made

- Lives in this repo. We manage it and refresh it every release.
- First set: the 7 the wizard has. Each is re-verified before it ships; an entry that cannot be verified is marked unverified, as `atlassian` is today.
- One file per connector. Generic icons, no brand logos.
- CI checks schema and safety only. No live URL calls in the pull request gate.
- Everything in the catalog is available by default. An admin narrows it with `only`, `exclude` and `override`.
- Available is not connected. A connector with no credential does nothing: no tools, no network call.
- Token connectors support **both** a shared token set by an admin and a token each person connects for themselves. The person's wins.
- Risk is shown before connecting. It is a warning with a confirm, not an admin gate.

## Catalog files

`catalog/connectors/<id>.yaml`. Illustrative; the exact fields are fixed in task 1.

```yaml
id: github
name: GitHub
icon: phosphor-duotone:github-logo
summary: Repositories, issues, pull requests, Actions and code search
transport: http
url: https://api.githubcopilot.com/mcp/
auth:
  type: bearer                       # bearer | oauth | none
  envVar: GITHUB_PERSONAL_ACCESS_TOKEN
  help: A personal access token. Give it only what the agent needs.
risk: high                           # low | medium | high
riskNote: Can create pull requests, push files, merge and trigger Actions.
docs: https://github.com/github/github-mcp-server
verified: true
verifiedOn: 2026-11-07
```

An OAuth connector has `auth: { type: oauth, scopes: [ ... ] }` and reuses the connect flow that already exists. The Git entry has `transport: stdio`, a `command` and a `requires.program`.

## Agent.yaml

Default: write nothing. Every connector is available.

```yaml
connectors:
  only: [ github, notion ]            # just these
  exclude: [ stripe, cloudflare ]     # everything except these
  override:                           # change fields of what remains
    github:
      token: ${vault.GITHUB_TOKEN}    # shared token for the whole agent
    notion:
      timeout: 20000

connectors: none                      # turn the catalog off
```

Rules:

- Evaluated in order: `only`, then `exclude`, then `override`.
- `override` can only name a connector still in the set. An unknown name is a build error that suggests the closest id.
- A secret is always a `${env.X}` or `${vault.X}` placeholder, as now.
- `mcpServers` is untouched and still holds your own servers. A name in both is a build error.
- Nothing is expanded into the running agent until a credential exists (see states).

## States and where they show

| State | Meaning |
|---|---|
| Available | In the registry. Not connected. No tools. |
| Connected | A credential exists: the admin's shared token, or the person's own token or sign in |
| Needs attention | A sign in expired or a token was rejected. Offer Reconnect |

Shown the same way in:

- the web **Connections** panel: a card per connector with name, icon, summary, risk badge, state and a Connect or Disconnect button;
- the terminal chat: `/connect` lists them with state, `/connect <id>` connects, `/connect <id> remove` disconnects;
- `bxAgents connect` and a new `bxAgents connectors` (list, `--json`);
- chat platforms: `/connect` as today;
- `GET /connect` on the agent API, which gains `risk`, `riskNote`, `verified` and `auth` for each row.

**Connect** is one verb. An OAuth connector starts the sign in that exists today. A token connector opens the vault's secure form (web), a masked prompt (terminal) or a one-time link (chat platform). A high or medium risk connector shows its `riskNote` first and asks the person to confirm.

## Token scope: both

- **Shared:** the admin sets `${env.X}` or `${vault.X}` (agent scope). Everyone's calls use it. Shown as Connected for all.
- **Personal:** a person connects their own token. It is stored in the vault in user scope, sealed, and used for that person's calls instead of the shared one.

**Dependency on bx-ai.** Today the bearer token and headers of an MCP client are fixed when the client is made. Only the OAuth path picks credentials per person (`subject`, resolved at call time). Personal tokens need bx-ai to accept a per-call token (`withBearerToken` taking a function of the call context, falling back to the static value). Task 3 confirms this and opens a bx-ai pull request. If bx-ai cannot take it, personal tokens wait and the shared token ships alone.

## Contributing

A page under conventions explains how to add a connector: copy the template, fill in the fields, run `bxAgents connectors check`, open a pull request. CI runs the same check.

CI rules (schema and safety only):

- required fields present, `id` matches the file name;
- `url` is https, or `transport` is stdio with a `command`;
- `auth.type` is one of the known values and `envVar` looks like an environment variable name;
- no secret or token value anywhere in the file;
- `risk` and `riskNote` set, `docs` is an https link, `verified` and `verifiedOn` present;
- an unverified entry must say why in `unverifiedNote`.

## Visual catalog

- A docs page generated from the files at build time: cards with icon, name, summary, risk, auth type, a copy button for the `connectors:` snippet and a link to the provider's docs.
- A home page section showing the same cards with a "browse the catalog" link and an "add yours" link.
- Screenshots of the web panel states and the terminal `/connect` list, as for the connect feature.

## Tasks

1. **Verify and fix the data.** Re-check the 7 entries against provider docs (URL, auth, scopes, risk, env var). Decide which can offer OAuth now that Connect exists (Notion and Atlassian are the likely ones). Atlassian must be fully verified so it ships without a badge. Fix the schema.
2. **Move the data.** `catalog/connectors/*.yaml`, a loader, a validator and `bxAgents connectors check`; CI job; the wizard and `add` read from it. `--mcp` keeps working.
3. **bx-ai spike.** Per-call token. Pull request there if needed.
4. **Build support.** `connectors:` key: only, exclude, override, none; errors; expansion into `mcpServers`; dormant until a credential exists; specs and a fixture.
5. **Connection service.** Rows for every connector with state, risk and auth. Token connect through the vault, shared versus personal, confirm step. Web panel, `/connect`, CLI, `GET /connect`, gateways.
6. **Docs.** Catalog page generated from the data, connectors reference, contributor guide, updates to connect, mcp, vault, agent-yaml, new-wizard, cli-reference and web-ui. Each with its `docs/versions/1.0.x` copy.
7. **Home page and tour.** Catalog section, a connectors tile, a Connections tab update, screenshots and the narrated video re-recorded with `af_heart`.
8. **Changelog,** including the connect and MCP OAuth entries that are missing today, and a note on `discoverySubject` in the connect page.

## Open questions

1. Does the person's own token replace the shared one for that person only, or also for people they share a thread with? Proposed: that person only.
2. Name of the key: `connectors` (proposed).

Decided: Atlassian ships in the first release, with no "unverified" badge. Task 1 verifies it properly (the header an API token goes in, and whether it can use OAuth through Connect). If something cannot be confirmed, we say so here before release; we do not label it verified.
