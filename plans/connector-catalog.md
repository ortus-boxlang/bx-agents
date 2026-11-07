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
- Ortus validates every catalog pull request by hand. There is no extra supply-chain machinery.
- Git is available like every other connector, served or not. Running a program on the server is the developer's design choice, and the docs say plainly what that means.
- Not in the first release: recording the catalog version at build, and an admin view of who is connected with audit rows.

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

## Token scope: both, one client per person

- **Shared:** the admin sets `${env.X}` or `${vault.X}` (agent scope). Everyone's calls use it.
- **Personal:** a person connects their own token. It is stored in the vault in user scope, sealed, and used for that person's calls instead of the shared one.

**One MCP client per person per connector.** A `ConnectorClients` registry, a singleton for the application, creates a client the first time a person needs a connector and keeps it. The client holds that person's credential and that person's MCP session, so nobody shares state with anyone else. Clients are cheap. The registry:

- is keyed by connector and person, with the shared token as its own key;
- drops a person's client when they disconnect or their credential is rejected;
- evicts clients idle for a while, so the table cannot grow without bound;
- routes each tool call to the caller's client, falling back to the shared one.

This needs no bx-ai change for the credential itself, because every client is built with its own fixed token. The open part is routing: the agent builds its tool list once from one client, so bx-agents wraps each connector tool and looks up the caller's client at call time. Task 3 confirms that wrapping works with bx-ai's tool objects.

## Connector options

Every connector can declare options the person (or the admin, in `override`) fills in when connecting. Examples to check in task 1: Supabase `project_ref` and `read_only`, Atlassian `cloudId`, GitHub toolsets.

```yaml
options:
  - key: project_ref
    label: Project
    help: Limit the connector to one project.
    required: false
```

The connect step in every surface asks for them. A value becomes part of the client's address or headers, so it is per person like the credential.

## Local programs (stdio)

An agent can use any number of MCP servers that run as programs on its own machine: Git, a file system server, a database, anything local. What it uses is the designer's choice, so the catalog treats them as a first class kind next to web servers.

```yaml
id: git
transport: stdio
command: [ uvx, mcp-server-git ]
requires:
  program: uvx
  help: Install uv so the agent can start this server.
options:
  - key: repository
    label: Repository folder
    required: false
```

- **No sign in.** Connecting a local connector means enabling it and filling its options (a folder, a path). Its states are *Available*, *Ready* (the program is found) and *Needs program* (it is not, with the `help` text).
- **One process, shared.** It is started once for the agent, on the machine the agent runs on. It does not get a client per person, because there is no credential to isolate. The docs say so.
- **Options matter more here.** A file system server needs the folders it may touch. Options become arguments or environment values of the command, never shell text.
- **Same controls.** `only`, `exclude`, `override`, the tool switches and the 100 tool warning all apply.
- **Open, by design.** `mcpServers` with `command` still works for anything the catalog does not list. The first release keeps to the 7 entries; more local servers (a file system one is the obvious next) join through the same pull request flow once verified.

## Tools

Connecting a connector can add many tools, so the person using it decides which ones the agent may use.

- The web Connections panel lists a connector's tools with an on or off switch for each, and "all" or "none" per connector.
- The terminal gets the same: `/connect <id> tools` lists them and toggles them.
- An admin can fix the list in `Agent.yaml` with `override: { github: { tools: [ ... ] } }`; a person can then only turn off what the admin allows.
- The choice is kept per person and connector.
- A warning shows in the panel, in `/connect` and in `bxAgents connectors` when the tools an agent holds pass 100. The number is a setting.

## Schedules

A schedule has no person. It can say who to run as:

```yaml
runAs: ada                 # a person who has already connected
```

A scheduled run then uses that person's connected credentials and clients. If they have not connected a connector, the run gets none of its tools and records why. Without `runAs`, a schedule uses only shared tokens.

## Wizard

The wizard shows every connector as available and asks which to leave out, or lets the developer pick only some. It writes `connectors.exclude` or `connectors.only` accordingly. `--mcp` keeps working.

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

1. **Verify and fix the data.** Re-check the 7 entries against provider docs (URL, auth, options, scopes, risk, env var). Atlassian is OAuth first and ships verified. Decide which others can offer OAuth now that Connect exists. Fix the schema so it covers both web and local program connectors.
2. **Move the data.** `catalog/connectors/*.yaml`, a loader, a validator and `bxAgents connectors check`; CI job; the wizard and `add` read from it. `--mcp` keeps working.
3. **Spike: per-person clients.** Build `ConnectorClients`, wrap a connector's tools so a call goes to the caller's client, and prove with the fake server that two people never see each other's token or session. A bx-ai pull request only if the wrapping cannot be done from bx-agents.
4. **Build support.** `connectors:` key: only, exclude, override, none; errors; expansion into `mcpServers`; dormant until a credential exists; specs and a fixture.
5. **Connection service.** Rows for every connector with state, risk, auth and options. Token connect through the vault, shared versus personal, confirm step, tool switches and the 100 tool warning. Web panel, `/connect`, CLI, `GET /connect`, gateways.
6. **Schedules.** `runAs` on a schedule, discovery, validation and specs.
7. **Wizard.** Show all connectors, exclude or pick, write the `connectors` block.
8. **Docs.** Catalog page generated from the data, connectors reference, contributor guide, Git note, updates to connect, mcp, vault, agent-yaml, schedules, new-wizard, cli-reference and web-ui. Each with its `docs/versions/1.0.x` copy.
9. **Home page and tour.** Catalog section, a connectors tile, a Connections tab update, screenshots and the narrated video re-recorded with `af_heart`.
10. **Changelog,** including the connect and MCP OAuth entries that are missing today, and a note on `discoverySubject` in the connect page.

## Open questions

1. Does a personal token apply to that person only? Proposed: yes.
2. Name of the key: `connectors` (proposed).
3. Who may set `runAs`? Proposed: the schedule's author, and it must name a person who exists.

## Atlassian, checked on 2026-11-07

- OAuth is the main route. `POST https://mcp.atlassian.com/v2/mcp` without a token answers `401` with `WWW-Authenticate: Bearer resource_metadata=...`. The protected resource metadata names an authorization server at `auth.atlassian.com`, whose metadata offers PKCE `S256`, a dynamic registration endpoint and client ID metadata documents. That is the flow Connect already runs. Scopes it lists include the `*:jira:agent-interface` family, `read:confluence:agent-interface` and `offline_access`. The sign in itself was not run, because it needs an Atlassian account.
- API tokens are an optional route an admin must enable. A personal token goes in `Authorization: Basic base64(email:token)`, a service account key in `Authorization: Bearer <key>`. Tokens are not tied to a site, so `cloudId` must be passed, and some tools are missing.
- The wizard's current Atlassian entry sends the token as a Bearer, which is wrong for a personal token. The catalog entry is OAuth first, with the service account key as the only token option.

Decided: Atlassian ships in the first release, with no "unverified" badge. Task 1 verifies it properly (the header an API token goes in, and whether it can use OAuth through Connect). If something cannot be confirmed, we say so here before release; we do not label it verified.
