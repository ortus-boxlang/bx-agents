# Plan: the connector catalog

Status: approved plan. No code in this pull request. Implementation waits for the update in flight to merge first.

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
- Connectors are personal. An agent is run by one person or by many, and each person, an admin included, connects their own. There is no shared connector token. One fixed account for everyone stays a plain `mcpServers` entry with `token: ${env.X}`, which is unchanged.
- Risk is shown before connecting. It is a warning with a confirm, not an admin gate.
- Ortus validates every catalog pull request by hand. There is no extra supply-chain machinery.
- Git is available like every other connector, served or not. Running a program on the server is the developer's design choice, and the docs say plainly what that means.
- Not in the first release: recording the catalog version at build, and an admin view of who is connected with audit rows.

## Catalog files

`src/main/bx/catalog/connectors/<id>.yaml`, shipped inside the module (it moved from the top level `catalog/` so the build packages it with everything else the module reads). The exact fields are fixed in task 1 and written down in `connector-catalog-verification.md`; the example below is the first version, and the real files and `ConnectorCatalog` are the truth.

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
      timeout: 30000
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
| Connected | This person has connected it: their own token or their own sign in |
| Needs attention | A sign in expired or a token was rejected. Offer Reconnect |

Shown the same way in:

- the web **Connections** panel: a card per connector with name, icon, summary, risk badge, state and a Connect or Disconnect button;
- the terminal chat: `/connect` lists them with state, `/connect <id>` connects, `/connect <id> remove` disconnects;
- `bxAgents connect` and a new `bxAgents connectors` (list, `--json`);
- chat platforms: `/connect` as today;
- `GET /connect` on the agent API, which gains `risk`, `riskNote`, `verified` and `auth` for each row.

**Connect** is one verb. An OAuth connector starts the sign in that exists today. A token connector opens the vault's secure form (web), a masked prompt (terminal) or a one-time link (chat platform). A high or medium risk connector shows its `riskNote` first and asks the person to confirm.

## Personal connections, one client per person

A connection belongs to one person. A token connector stores the person's own token in the vault in user scope, sealed. A sign in connector stores that person's tokens the same way Connect does today.

**One MCP client per person per connector.** A `ConnectorClients` registry, a singleton for the application, creates a client the first time a person needs a connector and keeps it. The client holds that person's credential and that person's MCP session, so nobody shares state with anyone else. Clients are cheap. The registry:

- is keyed by connector and person;
- drops a person's client when they disconnect or their credential is rejected;
- evicts clients idle for a while, so the table cannot grow without bound;
- routes each tool call to the caller's client. A caller with no connection gets none of that connector's tools.

On a single-person agent the person is the local user, so nothing changes for them.

**No shared token.** A fixed account for everyone (a support bot with a read-only key, for example) is a normal `mcpServers` entry with `token: ${env.X}` or `${vault.X}`. It is not a connector, needs nothing from the catalog, and works as it does today. The docs say so in one line on the connectors page.

This needs no bx-ai change. Every client is built with its own fixed token, and routing needs no wrapping of tools either: `withMCPServer()` accepts any object that implements bx-ai's `IMCPClient`, builds the tools from its `listTools()`, and each `MCPTool` call hands `send()` the chat request, which says who is asking. `PerPersonMcpClient` is that object (a router); it looks up the caller's client in `ConnectorClients`. Task 3 proved it (below).

The OAuth connectors keep bx-ai's own way: one client, each person's tokens in the token store, chosen per call by `subject`. `ConnectorClients` is for the token connectors.

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

## Routines and schedules

- **Routines** (the person-owned ones in the Routines page) already run as their owner: the runner builds its `Caller` from the routine's `ownerId`. So a routine uses its owner's connected credentials and clients with no new key. Task 6 pins this with a spec, and with a routine whose owner has not connected (the run gets none of that connector's tools and records why).
- **File schedules** (`schedules/*.bx`) have no person. They can say who to run as:

```yaml
runAs: ada                 # a person who has already connected
```

  The schedule's author sets it and it must name a person who exists. Without `runAs` a file schedule gets no connector tools.
- `docs/conventions/connect.md` says a run with nobody behind it finds no tokens. That stays true for file schedules and is corrected for routines.

## Wizard

The wizard shows every connector as available and asks which to leave out, or lets the developer pick only some. It writes `connectors.exclude` or `connectors.only` accordingly. `--mcp` keeps working.

## In the new web page

Checked against `development` as of e8ff1ae (the revamp). Today the connect feature survives as a small dialog (`#connectPanel`) opened from a Connections button in Settings, under Account. It lists only the OAuth servers of this agent. It does not fit the new shell, so connectors become a page.

Mock-ups, drawn inside the real shell and styles: `plans/connector-catalog-mockups/` (the page, the token connect dialog, the sign in dialog, the tools drawer, the phone width).

- **A new Main page, Connectors**, between Registry and Vault, for everyone. Cards for every catalog connector (icon, name, summary, state, risk, auth kind, who the credential belongs to, tools on), tabs *All*, *Connected*, *Needs attention*, a search box, and a banner for the catalog policy (available, excluded, overridden) and the tool count. Registered like the other pages (`registerPage`, `group: "main"`), gated on a `connectors` capability that replaces `connections`.
- **Connect dialog:** risk warning with a confirm, the connector's options, the token field for token connectors (masked, sealed in the vault) or "Continue to Atlassian" for a sign in. The same fields as the terminal and gateways. It is always personal.
- **Tools drawer:** a switch per tool, all on, all off, read only, search, a lock and "Turned off by your admin" for tools an admin fixed, "Asks first" marks, and the over 100 warning.
- **Settings, Account:** the Connections button becomes a link to the Connectors page. Nothing is removed: the control moves, as the revamp's "Nothing removed" rule requires.
- **Registry, Tools:** tools already group by the word before the first underscore. Connector tools carry the connector's name as that group and a "from a connector" chip, so they stay findable in both places.
- **Agent, Composition (admin):** connectors appear under outgoing, with their state and the catalog policy.
- **Vault:** unchanged. A token connected for a person is a vault secret in the user scope, and the Vault page already has the Yours and The agent's tabs.
- **Icons:** the sprite has none for brands. Cards use generic Phosphor icons from the set the revamp already pulls in; the few missing ones (a card, a kanban board) are added the same way.
- **Accessibility:** the same rules as every page (44 px targets, state in words and icons, focus trap in dialogs, `aria-current`, reduced motion). Toggles are real checkboxes styled as switches.

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

1. **Verify and fix the data.** (done, see `connector-catalog-verification.md`) Re-check the 7 entries against provider docs (URL, auth, options, scopes, risk, env var). Atlassian is OAuth first and ships verified. Decide which others can offer OAuth now that Connect exists. Fix the schema so it covers both web and local program connectors.
2. **Move the data.** (done) `src/main/bx/catalog/connectors/*.yaml`, `ConnectorCatalog` (loader and validator), `bxAgents connectors [list|show|check]`, a CI step, CODEOWNERS; the wizard and `add` read from it and `--mcp` keeps working.
3. **Spike: per-person clients.** (done) `ConnectorClients` and the `PerPersonMcpClient` router, proved with a fake server that two people never see each other's token or session. No bx-ai change.
4. **Build support.** (done) The `connectors:` key: only, exclude, override, none; errors that name the closest id; the resolved set stamped into the app; specs and fixtures. See Progress for two changes to the first plan.
5. **Connection service and surfaces.** Split into 5.1 to 5.8 in the section "Task 5 breakdown" below.
6. **Routines and schedules.** Pin that a routine runs with its owner's connections; `runAs` on file schedules, validation and specs.
7. **Wizard.** Show all connectors, exclude or pick, write the `connectors` block.
8. **Docs.** Catalog page generated from the data, connectors reference, contributor guide, Git note, updates to connect, mcp, vault, agent-yaml, schedules, new-wizard, cli-reference and web-ui. Each with its `docs/versions/1.0.x` copy.
9. **Home page and tour.** Catalog section, a connectors tile, a Connections tab update, screenshots and the narrated video re-recorded with `af_heart`.
10. **Changelog,** including the connect and MCP OAuth entries that are missing today, and a note on `discoverySubject` in the connect page.

## Decisions on the last questions

- A personal token applies to that person only, and there is no shared connector token (decided 2026-11-14).
- The key is `connectors`.
- `runAs` is set by the schedule's author and must name a person who exists.

No open questions remain. Implementation starts after the other update in flight is merged.

## Atlassian, checked on 2026-11-07

- OAuth is the main route. `POST https://mcp.atlassian.com/v2/mcp` without a token answers `401` with `WWW-Authenticate: Bearer resource_metadata=...`. The protected resource metadata names an authorization server at `auth.atlassian.com`, whose metadata offers PKCE `S256`, a dynamic registration endpoint and client ID metadata documents. That is the flow Connect already runs. Scopes it lists include the `*:jira:agent-interface` family, `read:confluence:agent-interface` and `offline_access`. The sign in itself was not run, because it needs an Atlassian account.
- API tokens are an optional route an admin must enable. A personal token goes in `Authorization: Basic base64(email:token)`, a service account key in `Authorization: Bearer <key>`. Tokens are not tied to a site, so `cloudId` must be passed, and some tools are missing.
- The wizard's current Atlassian entry sends the token as a Bearer, which is wrong for a personal token. The catalog entry is OAuth only. A service account key for a fixed account is a plain `mcpServers` entry with `Authorization: Bearer`.

Decided: Atlassian ships in the first release, with no "unverified" badge. Task 1 verifies it properly (the header an API token goes in, and whether it can use OAuth through Connect). If something cannot be confirmed, we say so here before release; we do not label it verified.

## Progress

- Task 1: done. Verification in `connector-catalog-verification.md`.
- Task 2: done. The seven entries are YAML files with an `auth` list (OAuth first, token as fallback), typed options and a `verifiedOn` date. `ConnectorCatalog.check()` enforces the rules above (required fields, id equals file name, https only, no query string or user name in the address, option targets that fit the kind of connector, no secret anywhere, a reason for anything unverified). The wizard and `add mcp` read a compatibility view that gives the same output as the old private list; Supabase still starts read only. The old `wizard/catalog/mcp-servers.json` is gone.
- Task 3: done. `ConnectorClients` (one MCP client per person per connector, a singleton for the application) and `PerPersonMcpClient` (the router an agent registers once with `withMCPServer()`). 12 specs run the real bx-ai `MCPTool` and a real `AiChatRequest` against a fake server that says which token and session each call used: tokens and sessions never cross, 24 calls at once from a cold start keep apart, a new token makes a new client and session, a refused or removed token leaves no client, `drop()` and `evictIdle()` forget clients, and `withMCPServer()` accepts the router. Findings the next tasks must handle:
  - **Make the client at Connect.** Creating a client does the MCP handshake and a `tools/list` (which also finds a token the server refuses). Two first calls of one person at the same time wait for each other, and bx-ai's `doHandshake` marks the handshake done before the server answers, so a second call on a fresh client would go without a session. On the runtime's common thread pool, which can be a single thread in a small container, those waiting calls starved the handshake's own HTTP call and the run hung. Making the client when the person connects, on a thread of its own, avoids all of it; a spec shows the common pool is safe once Connect has done that.
  - **Tools appear after the first Connect.** `withMCPServer()` reads the tool list once, so with nobody connected at start there are no tools. Task 5 registers the router again after a first Connect (as the OAuth path refreshes today) and must not register the same tools twice.
  - **A refused token needs its own signal.** `forPerson()` returns nothing for it, so the call says "not connected". Task 5 records the rejection so the page and `/connect` can say "Needs attention".
  - **Evict on a timer.** `evictIdle()` exists; task 5 calls it from the heartbeat.
- Task 4: done. `ConnectorSettings` reads the `connectors` key (`problems()` for the validator, `resolve()` for the build), the loader accepts it, `ProjectValidator` names every mistake (an unknown id comes with the closest one), and the build stamps the resolved set into `handlers/AgentApi.bx` as `connectors` for the connection service of task 5. `inspect` has a new `connectors` section. Override settings are `timeout`, `options` (checked against the catalog entry's options and their types), `scopes` (sign in connectors only) and `tools` (the allow list of the tools drawer); a token or secret is refused there. Two changes to the first plan:
  - **Resolving does not attach anything.** The plan said each connector expands into an `mcpServers` entry at build. With every connector offered by default that would contact seven servers (and start the Git program) on every start of every agent. Instead the build produces the set a person can connect to, and a connector is attached to the running agent only when someone connects it (task 5, on the router of task 3 for tokens and the existing OAuth path for sign in). Nothing contacts a server until then.
  - **An `mcpServers` name shadows a connector, with a warning.** The plan said a name in both is a build error. The wizard writes `mcpServers` entries named `github`, `notion` and so on, so with every connector offered by default that error would break projects that already build. An entry with a connector's name now replaces the catalog entry and the build warns.

## Task 5 breakdown

Task 5 is the largest. It is built in eight steps, each with its own specs and its own commit, so every step can be reviewed and run on its own.

### Design in one page

- **One service for every surface.** `ConnectorService` is what the web page, the API, `bxAgents connect`, the terminal `/connect` and the gateways all ask, as `ConnectionService` is today. It wraps the existing OAuth path (`ConnectionService`, unchanged for `mcpServers` entries with `oauth`) and adds the token and local program paths.
- **A row per connector, for one person.** `{ id, name, icon, summary, transport, risk, riskNote, docs, verifiedOn, ways, state, options, tools }`. `state` is one of `available`, `connected`, `needs_attention`, and for a local program `ready` or `needs_program`. Never a token, never a secret value.
- **Where things are kept.** A new table, `connector_settings ( owner, connector, settingKey, value, updatedAt )`, key `( owner, connector, settingKey )`, added by a new migration. `owner` is the person's id (the same form the vault uses, such as `slack:U01ADA` or `local`) or `*` for the agent itself. `settingKey` is `options` (the person's option values), `tools` (the tool switches, as `{ "off" : [ names ] }`), `status` (a note that a credential was refused, with when and why) or `enabled` (a local program switched on, owner `*`). `value` is JSON. It is separate from the web page's `preferences` table on purpose: that table can be written by the page's own preferences route, and this one can be written only by the connector service. A secret never goes in it. A personal token is a vault secret in the user scope named by the catalog's `envVar`, with its `hosts` set to the connector's host, so the vault itself refuses to send it anywhere else. A sign in keeps its tokens in the sealed OAuth records, as now.
- **Connect, by way in.**
  - *Sign in:* the existing flow (`start()`, the callback, `complete()`), reached through the connector's id.
  - *Token:* the token is sent once, checked by making the person's client (`ConnectorClients.forPerson()`: the handshake and a `tools/list`, so a refused token is found at Connect), sealed into the vault, and the connector is attached to the running agent. The value never comes back.
  - *Local program:* enabling it checks the program is on the PATH, writes the options, and starts the one shared process.
  - A high or medium risk connector needs `confirm: true` in the request; the surfaces show the `riskNote` first.
- **Attaching to the running agent.** Nothing is attached at start. The first Connect of a connector registers it once (the router of task 3 for a token, `withMCPServer( url, options )` as today for a sign in, a command entry for a program), and never twice. The agent gets the tools with no restart. `ConnectorClients.evictIdle()` runs from the heartbeat.
- **Tool switches.** Per person and connector (the `tools` setting above), under the admin's `override.tools` allow list as a ceiling. A switched off tool is refused at call time inside the router (certain). Keeping it out of what the model is offered is a spike (5.3): bx-ai's `beforeLLMCall` middleware gets the chat request, and may be able to drop tools per call.
- **The tool count warning** counts the tools a person has on across connectors. The limit is `connectors.toolWarning` (default 100), a new key of `ConnectorSettings`.
- **Routines.** A routine runs as its owner, so it already uses the owner's connections. A file schedule with `runAs` is task 6.

### API shape (the agent API, all for the caller; the caller is never named in a request)

| Route | Does |
|---|---|
| `GET /connectors` | The rows for the caller, the catalog policy (mode, left out, replaced by `mcpServers`), and `{ toolsOn, toolWarning, over }` |
| `POST /connectors/connect` | `{ id, method : "oauth" | "token" | "program", token?, options?, confirm }`. A sign in answers `{ authorizationUrl }`; a token or program answers the new row |
| `POST /connectors/disconnect` | `{ id }`: forgets the caller's token or sign in, drops their client |
| `POST /connectors/options` | `{ id, options }`: changes the caller's option values |
| `GET /connectors/tools?id=` | The connector's tools as the caller's client lists them, with each one's switch, `asksFirst` and whether the admin turned it off |
| `POST /connectors/tools` | `{ id, tool | all | none | readonly, on }` |
| `GET /connect`, `POST /connect`, `POST /connect/remove`, `GET /connect/callback` | Stay as they are, so what was built for sign in keeps working. The callback stays the one public route |

Errors use the existing `Outcome` codes (`not_found`, `bad_request`, `forbidden`, `conflict`). Risk confirmation missing is `bad_request` with the `riskNote` in the reason.

### The steps

1. **5.1 Settings table and rows.** The `connector_settings` migration and `ConnectorSettingsStore` (options, tool switches, status, enabled), and `ConnectorService.list()` building the rows and states from the resolved set, the vault, the OAuth tokens and the PATH check. Specs for every state, and that the web preferences table never touches it.
2. **5.2 Connect and disconnect.** Token connect through the vault and `ConnectorClients`, sign in through the existing service, the risk confirmation, the refused token becoming `needs_attention`, disconnect. Specs against the fake bearer server and the fake OAuth server.
3. **5.3 Attach and tool switches.** Attach on first Connect without duplicates, tool switches and the admin ceiling enforced in the router, `evictIdle()` on the heartbeat, the spike on offering only a person's tools to the model, the tool count and `connectors.toolWarning`. Specs, including two people.
4. **5.4 The API.** Routes, `AgentService` methods, the contract and OpenAPI, `AgentApiClient`, handler coverage, and the real HTTP integration test. Specs for every route and every refusal.
5. **5.5 The web page.** The Connectors page on the new shell: cards, tabs, the connect dialogs, the tools drawer; the Settings link replaces the old Connections dialog; the Registry chip and the Composition lines. Checked in a real browser at 1280, 768 and 390 wide against a served app, as an admin and as a member; screenshots.
6. **5.6 The terminal.** `/connect` lists every connector with its state, `/connect <id>` connects (a masked prompt for a token, never an argument), `/connect <id> tools`, and `bxAgents connect` and `connectors` in a project show the same rows. Local, remote and served modes.
7. **5.7 Gateways.** `/connect` lists the rows; `/connect <id>` answers with the one-time sign in link; for a token connector it says the token should not be typed in the chat and sends the address of the web app, with the identity note above. A token pasted anyway is caught before the model, saved under the chat identity and the person is told to delete the message (decision 5). The gateway docs follow.
8. **5.8 Hardening.** A token never appears in any response, log, audit row or error, and a pasted token never reaches the model, the conversation memory or the logs; the vault secret is host locked; two people through the API never see each other's state; a connect without confirmation is refused; limits on how many connectors and options a request carries.

### Decisions taken before 5.2

1. **Storage:** the new `connector_settings` table (decided 2026-11-15), not `preferences`.
2. **A local program (Git) on a served agent:** only an admin can switch it on. In the terminal, where there is one person, anyone can. Switching it on starts one shared process, so one person's choice would otherwise decide for everyone. The state is `connector_settings` owner `*`, key `enabled`.
3. **Switched off tools:** the call is always refused inside the router. Keeping the tool out of what the model is offered is tried in a spike in 5.3 and shipped only if it works; if it does not, the release ships the refusal alone.
4. **A token connector from a gateway chat (decided 2026-11-16):** a token is never typed into a chat, because the chat platform keeps the message, the model provider receives it and the conversation memory stores and replays it. The bot tells the person they need to register the connector in the web app and sends the address of the web app to log in (the agent's public address, the web page path). There is no form page for chats in the first release. One consequence is written into the bot's message and the docs: the web app knows a person as its own account (`ada`) and the chat platform as another (`slack:U01ADA`), so a token connected in the web app is for the web identity. Until accounts can be linked (the follow-up, which would help the vault and notes too) the bot says a token connector is used from the web app chat. A sign in connector is not affected: its one-time link already carries the chat identity.
5. **A secret pasted into a chat anyway (decided 2026-11-16):** people will sometimes ignore the advice and paste the token. It is saved, and the person is told to delete the message. Details:
   - **What is caught:** in a gateway chat first, a message that is the answer to a `/connect <id>` for a token connector (for ten minutes), or that matches the token format of a connector whose catalog entry has a `tokenPattern` (added only where the provider documents the format, for example GitHub's `ghp_` and `github_pat_`).
   - **Before the model:** the message is taken out before it reaches the model, the conversation memory or the logs. What is kept in the conversation is a note that a token was pasted and saved, not the token.
   - **Saved as the chat person:** the token is checked (a refused one is not saved, and the person is told), then sealed in the vault under the chat identity (`slack:U01ADA`) with its host locked, and the connector is attached. So this path works from Slack even though the web app knows the person by another id.
   - **The reply says what happened and what to do:** "I saved your GitHub token. It is still in this chat's history: please delete your message, and think about making a new token in GitHub, because this one passed through Slack."
   - **The web app link stays the recommended path.** Pasting is a fallback that is made safe, not an invitation.
   - **Not in 5.1 to 5.6.** It lands in 5.7 (gateways), with its leak tests in 5.8.

### Progress on task 5

- **5.1 done.** Migration 14 adds `connector_settings`; `ConnectorSettingsStore` keeps options, tool switches, status and the agent's `enabled` flag as JSON per owner and connector; `ConnectorService` builds the rows and states (`available`, `connected`, `needs_attention`, `needs_program`) from the build's resolved set, the vault's user scope, an OAuth check and the PATH. An agent scope vault secret of the same name is the developer's own token and does not count as a person's connection. The build now stamps the whole resolved set (`mode`, `available`, `excluded`, `shadowed`) so the page can show the catalog policy. `ProgramFinder` is shared with `doctor`.
- **5.2 done.** `ConnectorActions` connects, disconnects, changes options and marks a refused token; `ConnectorEndpoint` makes a person's address and headers from the option values and the sign in entries; `ConnectorClients.probe()` tries a token without keeping a client. Behaviour:
  - A medium or high risk connector is connected only with `confirm: true`; the refusal carries the risk note.
  - A token is tried first. A refused token and an unreachable server each store nothing and say which it was. A good token is sealed in the vault in the person's scope with the connector's host as its only allowed host. A new token replaces the old one and drops the old client.
  - A sign in is started and the address handed back. Options of a person's own are refused for a sign in connector, because its client is shared by everyone: its address uses the admin's `override.options`. (A per person sign in client is possible later, in the style of `ConnectorClients`.)
  - A local program on a served agent is switched on or off by an admin only. Its options belong to the agent (owner `*`).
  - Disconnecting removes the token (or the sign in) and a note that it was refused, and keeps the person's tool switches and options.
  - No message, result or error carries a token; specs check this for each refusal.

**5.3 (done).** `ConnectorTools` (list, switch one/all/read only, admin ceiling, gate at call time, tool count against `toolWarning`), `ConnectorRuntime` (attaches a connector once, after the first Connect or at restart), `ConnectorToolMiddleware` (the model is offered only the tools that person may use; OpenAI and Claude formats) and `ConnectorEndpoint::command` for local programs. Two changes to the plan: idle clients are swept lazily on the next use instead of by a heartbeat, and the tool offering spike worked, so switched off tools are hidden as well as refused. Not done: stopping a local program when it is disabled (its calls are refused instead).
