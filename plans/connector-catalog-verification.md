# Connector catalog: task 1, verifying the 7 entries

Checked on 2026-11-14. Method: an unauthenticated `initialize` call to each web endpoint (to read the `401` challenge), then the protected resource metadata and the authorization server metadata it points to, then the provider's own docs page. Nothing was signed in to, and no credential was used. Facts below are from those responses and pages; where something could not be confirmed it says so.

## Summary

| Connector | Web or local | OAuth for a person | Token route | Verified |
|---|---|---|---|---|
| GitHub | web | Challenge and metadata exist. Whether a third party client can register is **not confirmed** | Bearer token (the wizard's route) | Partly |
| Stripe | web | Yes: dynamic registration, S256, public clients | Agent API key as Bearer | Yes |
| Notion | web | Yes: dynamic registration, S256, client ID metadata documents | MCP token (Business or Enterprise, workspace owner makes it) | Yes, header name not stated |
| Atlassian | web | Yes: dynamic registration, S256 | Personal token as Basic, service account key as Bearer, only if an admin enables it | Yes |
| Cloudflare | web | Yes: dynamic registration, S256 | API token as Bearer | Yes |
| Supabase | web | Yes: dynamic registration, S256 | Personal access token as Bearer | Yes |
| Git | local program | not applicable | not applicable | Yes |

## What this changes

1. **Every web connector can sign a person in.** Five of six answer an unauthenticated call with a `401` and a discovery pointer, and five advertise a registration endpoint. That matches the personal-only model: Connect is the main route, and a token is the fallback. The catalog `auth` becomes a list of methods, OAuth first, instead of one token.
2. **Notion and Atlassian get OAuth** (the open item in task 1). The wizard's note that Notion's "sign-in flow cannot run without a person" no longer applies now that Connect exists.
3. **GitHub stays a token first.** Its challenge points at `github.com/login/oauth`, whose metadata was not reachable from the sandbox (blocked, not a GitHub answer), and GitHub's remote server page says nothing about OAuth. Until that is checked from a normal machine, GitHub is a token entry, and a person who has their own OAuth app can still use `oauth: { clientId }`.
4. **bx-ai's discovery order already reaches the two issuers with a path.** Stripe (`access.stripe.com/mcp`) answers only at the path-insert form, and Atlassian (`auth.atlassian.com/<id>`) answers at the path-insert form too. Both were fetched live; bx-ai tries that form first.
5. **Options are real and differ in kind**, so the schema needs a `target` for each: Supabase takes URL query values, GitHub takes a path or headers, Git takes a command argument.
6. **Cloudflare is three tools, not many.** `search`, `execute` and `docs` (Code Mode). Turning tools on and off does not limit what `execute` can reach. The only limits are the OAuth scopes or the token's permissions, so the risk note says that.
7. **A date to know.** Stripe stops accepting full-access secret keys and untagged restricted keys on 2026-11-30 (a `401` with an OAuth challenge after that). Only agent API keys and OAuth work after it. The wizard already names `STRIPE_AGENT_API_KEY`; the help text must say "agent API key".

## Per connector

### GitHub
- URL `https://api.githubcopilot.com/mcp/`. Unauthenticated call: `401`, challenge with `resource_metadata`. Resource metadata names `https://github.com/login/oauth` as its authorization server and lists scopes `repo, read:org, read:user, user:email, read:packages, write:packages, read:project, project, gist, notifications`.
- Authorization server metadata: not reachable from here, so dynamic registration is **unconfirmed**.
- Options (docs): toolsets by path `/x/{toolset}` (one) or the `X-MCP-Toolsets` header (a list); read only by the path suffix `/readonly` or the `X-MCP-Readonly` header; single tools only by the `X-MCP-Tools` header, and an invalid name stops the server from starting.
- Token: a personal access token as Bearer (kept from the wizard; the page does not name it).
- Risk: high. Unchanged.

### Stripe
- URL `https://mcp.stripe.com`. `401` with `resource_metadata`; authorization server `https://access.stripe.com/mcp`, metadata at the path-insert form: registration endpoint, `S256`, token endpoint auth `none`, one scope `mcp`.
- Docs: OAuth for interactive clients; an agent API key as Bearer for autonomous ones; sessions can be listed and revoked by the person or an admin; Stripe asks for human confirmation on refunds and money movement, separately from the client's own approvals.
- Option (docs): a `Stripe-Account` header acts as a connected account, platform keys only, no OAuth.
- Risk: high. Its write tool covers `POST`, `PATCH`, `PUT` and `DELETE`.

### Notion
- URL `https://mcp.notion.com/mcp`. `401` with `resource_metadata` and `scope="default"`; authorization server `https://mcp.notion.com`: registration endpoint, `S256`, client ID metadata documents supported, scopes `default` and `ema_issuer:manage`.
- Token: a workspace owner makes an MCP token under New MCP token in the developer portal; Business and Enterprise plans only. Sent as a bearer token; the docs do not name the header.
- Risk: medium.

### Atlassian
- URL `https://mcp.atlassian.com/v2/mcp`. Verified on 2026-11-07 and again here: OAuth with registration and `S256`; scopes of the `*:jira:agent-interface` family, Confluence, Jira Service Management, Bitbucket and `offline_access`.
- Token (docs): an admin must enable it. Personal token as `Authorization: Basic base64(email:token)`; service account key as `Bearer`. Not tied to a site, so `cloudId` must be passed; some tools are missing.
- Risk: medium.

### Cloudflare
- URL `https://mcp.cloudflare.com/mcp`. `401` with `scope="user:read account:read"`; authorization server `https://mcp.cloudflare.com`: registration endpoint, `S256`, public clients, 403 scopes listed.
- Token (docs): a user or account API token as Bearer.
- Exposes `search()`, `execute()` and `docs()`; "over 2,500 endpoints" behind them.
- No account option is documented.
- Risk: high.

### Supabase
- URL `https://mcp.supabase.com/mcp`. `401`; resource metadata names `https://api.supabase.com`: registration endpoint `/platform/oauth/apps/register`, `S256`; scopes `organizations:read, projects:read, projects:write, database:read, database:write, analytics:read, secrets:read, edge_functions:read, edge_functions:write, environment:read, environment:write, storage:read, storage:write`.
- Docs: OAuth with dynamic registration is the default; a personal access token as `Authorization: Bearer` is for CI.
- Options (docs, URL query): `project_ref` (limits to one project and turns off account tools), `read_only=true` (read only Postgres user), `features` (tool groups, comma separated).
- The docs warn against giving it to end users and about prompt injection through table data. Risk: high.
- The wizard bakes `?read_only=true` into the URL. In the catalog that becomes an option, default on.

### Git (local program)
- `uvx mcp-server-git`. One option, `--repository` (`-r`): any path inside a working tree, resolved to its root. Without it the server can read and write any repository the process can reach, each call naming its own `repo_path`. 14 tools: status, diffs, commit, add, reset, log, branch creation, checkout, merge, show, branch, remote. Described by its authors as in early development.
- The catalog entry makes `repository` an option that defaults to the folder the agent starts in.
- Risk: medium.

## Not verified, and why

- GitHub: whether a third party client can register for OAuth (metadata unreachable here).
- Notion's header name for an MCP token (the docs say bearer, not which header).
- That a full sign in completes with BX Agents for each provider. The challenge and metadata match what Connect needs; no account was used to run one. Task 5 runs one per provider that someone with an account can test, and the entry's `verified` records only what was shown.
- Tool counts. Only Cloudflare (3) and Git (14) are known from docs; the numbers in the mock-ups are sample data.

## Schema changes this implies (for task 2)

```yaml
auth:                          # a list, in the order the Connect step offers them
  - type: oauth
    scopes: [ ... ]            # defaults, shown to the person
    verified: true
  - type: bearer               # a token the person pastes
    envVar: SUPABASE_ACCESS_TOKEN
    header: Authorization      # default; Atlassian's personal token says Basic
    help: ...
options:
  - key: project_ref
    label: Project
    target: query              # query | header | path | arg | env
    name: project_ref
    default: ""
    required: false
risk: high
riskNote: ...
toolsNote: "Three tools. Scope it with the token or the sign in, not with the switches."   # optional
verifiedOn: 2026-11-14
```

An entry with no verified route is not shipped. `verified` is per auth method, so GitHub can say its token route is verified and its OAuth route is not.
