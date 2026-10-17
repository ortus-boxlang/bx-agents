# Plan: bx-playwright in BX Agents

Status: proposal, no code yet. Written against bx-playwright `1.0.0-snapshot` and bx-ai 3.5.0.

Two goals:

- **A. Test with it.** Use bx-playwright to test anything with a UI: the generated web chat, and agents' UIs in user projects.
- **B. Ship it as an agent capability.** An agent can say "give me all the bx-playwright tools" (and optionally its MCP server), and the build then includes bx-playwright in the built app. Off by default.

## 1. How tools reach an agent today (reviewed in bx-ai and BX Agents)

| Source | Mechanism | Selectable per agent? |
|---|---|---|
| Your `tools/` folder | `@AITool` functions; the app scans them into bx-ai's global tool registry at startup | No: all of them |
| bx-ai built-ins | bx-ai registers 10 tools in the registry when it loads, keyed `name@bxai` | **No: all of them** |
| Other modules | A module calls `aiToolRegistry().register( tool, module : "x" )`, keyed `name@x`. `getByModule( "x" )` lists them | No |
| Class `Agent.bx` code | `withTools( [ ... ] )`, anything: keys or `ITool` objects | Yes, by hand in code |
| Remote MCP servers | `mcpServers` on `Agent.bx`: a list of **URLs** | Yes |
| Sub-agents | `subagents/` | Yes |

**Finding.** The generated `GeneratedAgentFactory` builds every agent with `tools : aiToolRegistry().getAll()`. The registry is global, so **every BX Agents agent gets every registered tool**. With only bx-ai loaded that is:

`generateImage, httpGet, log, now, print, sendEmail, speak, transcribe, translate, webSearch` (all `@bxai`)

So today every agent can send email, fetch any URL (`httpGet`) and search the web, without the author asking. There is no way to say "only these". This was verified by listing the registry with only bx-ai loaded.

This matters for the playwright plan in two ways:
1. If bx-playwright ever registered its tools in the global registry, every agent would get a browser. It must not, and today it does not (`aiTools()` just returns tool objects).
2. "Which tools does this agent get" needs a real, per-agent answer anyway.

## 2. Proposal: a `tools` selection on the agent

Declared in `Agent.bx` (`configure()` / descriptor form), read by the build:

```javascript
configure() {
	return {
		name  : "support-bot",
		model : "openai/gpt-5",

		tools : {
			// registry keys, or whole modules, that this agent may use (in addition to its own tools/)
			include : [ "now@bxai", "webSearch@bxai" ],
			modules : [ "bxplaywright" ],        // "all the bx-playwright tools"
			exclude : [ "sendEmail@bxai" ]
		},

		// per-module options, passed to the module when the build wires it in
		moduleOptions : {
			bxplaywright : { profile : "ci", baseURL : "http://localhost:8080", allow : [ "localhost" ] }
		}
	}
}
```

Rules:
- `tools/` (your own functions) always apply.
- `include` adds registry keys. `modules` adds every tool of a module. `exclude` removes keys last.
- **Default when `tools` is absent**: open question 1 below.
- A module named in `modules` is **required**: the build validates it is installed or bundled, and `doctor` reports it. This is what "include bx-playwright in the agent once it builds" means.

What the build does for `modules : [ "bxplaywright" ]`:
1. **Validate**: the module exists (bundled nested module, or installed). Fail with a clear message if not.
2. **Wire**: a small per-module adapter registers that module's tools in the registry under `module : "bxplaywright"` at app start, using the options above. For bx-playwright the adapter is `playwright( options ).aiToolDefinitions()` turned into `ITool`s (what `aiTools()` already does). Other modules can get adapters later.
3. **Attach**: the factory passes this agent only `own tools/ + include + getByModule( modules ) - exclude`, instead of `getAll()`.
4. **Package and deploy**: the built `.bxa` and the app record the module requirement. `doctor` and the `docker`/`digitalocean` targets check the browser prerequisite (below).

### What "all the bx-playwright tools" means

- **Native tools (default path)**: the 10 bx-playwright tools: `browser_visit`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_select`, `browser_press`, `browser_back`, `browser_text`, `browser_screenshot`, `browser_close`. In-process, no extra server.
- **MCP server (second path)**: `bxplaywright mcp` is Playwright's own MCP server, with a larger tool set. BX Agents' `mcpServers` accepts **URLs only**, but bx-ai already has a `StdioTransport`. Two ways:
  1. `bxplaywright mcp --port 8931` as a sidecar process, consumed as `http://localhost:8931/mcp`: works today, but the author must run the sidecar.
  2. Extend `mcpServers` to accept `{ command : [ "bxplaywright", "mcp", "--headless" ], name : "browser" }` and have bx-ai spawn it over stdio. Cleaner; needs a small BX Agents change and a check that bx-ai's client can be handed a stdio command.
  `modules : [ "bxplaywright" ]` can later also mean "and its MCP server" through option `mcp : true`.

### Problems this must solve

1. **Isolation.** The agent is a singleton and bx-playwright's `AiBrowser` keeps one page per `aiTools()` call. Two users would drive one tab. Needs one page (ideally one browser context) per `(userId, conversationId)`, closed when idle. Either a wrapper in BX Agents' adapter, or a session-key option upstream in bx-playwright.
2. **Navigation safety.** The model picks URLs. Enforce the `allow` host list in the adapter (also on redirects) and always block `file:`, `chrome:` and cloud-metadata addresses. The same reasoning applies to `httpGet@bxai` today.
3. **Secrets.** `browser_fill` text appears in traces and logs; mask password fields.
4. **Human approval.** Map an `approve : [ "fill", "click" ]` option to bx-ai's existing human-in-the-loop, which the web UI already renders.
5. **Prerequisites.** The browser itself is downloaded (`bxplaywright install`), not shipped. Provision lazily with `playwrightEnsureBrowser()` on first use; `bxAgents doctor` reports installed/not; the Docker target runs `install --with-deps chromium` in the image.
6. **Size.** Cap snapshot length per action.

## 3. Goal A: testing with it

1. **Our own CI**: add browser specs for the generated web chat (sidebar, streaming, 401 message, phone layout) with TestBox's `@browser` support, replacing the ad-hoc scripts used for the site videos. Needs `bxplaywright install --with-deps chromium` in the workflow (cached).
2. **For users**: `bxAgents test --browser` starts the built app with `serve` on a free port, sets it as `@baseURL`, runs specs with browser support, stops the server.
3. **Agent-aware helper**: `BaseAgentSpec.browser()` returns a page against the served app, so a spec can assert on what the agent did in the UI, not only on its text.
4. **Bundling**: `bx-playwright` (slim, about 4 MB) is added as a bundled nested module once (`gradle.properties` plus `boxlangModules`). The full distribution (about 206 MB) is not bundled.

## 4. Phases

**Phase 1: per-agent tool selection (needed first; also fixes the finding above)**
- [ ] Decide the default (question 1).
- [ ] `tools` / `moduleOptions` in the config resolver, validator, and docs.
- [ ] Factory attaches a filtered list instead of `getAll()`; specs.
- [ ] Migration note in the changelog.

**Phase 2: bx-playwright as a bundled module + native tools**
- [ ] Bundle `bx-playwright` (`gradle.properties`).
- [ ] Module adapter interface and the bx-playwright adapter.
- [ ] Isolation, allowlist, masking, approval.
- [ ] `doctor` and `bxAgents browser install|doctor`.
- [ ] Example project and docs.

**Phase 3: MCP**
- [ ] Stdio MCP entries in `mcpServers`, or the sidecar docs.

**Phase 4: testing**
- [ ] CI browser specs, `test --browser`, `BaseAgentSpec.browser()`.

## 5. Risks

- bx-playwright is `1.0.0-snapshot` only. Pin it in `gradle.properties` and wait for a stable release before shipping a BX Agents release that depends on it.
- Browser download in restricted networks: proxy settings, an offline path.
- CI time and disk for browsers: cache them.
- A model with a browser can act on the web: defaults must be conservative.

## 6. Questions

1. **Default tools.** BX Agents is unreleased, so we can still change this. Option A: no `tools` key means **only your own `tools/`**, and bx-ai built-ins must be named (safe, small breaking change). Option B: keep today's "everything registered" (convenient, but every agent can email and fetch URLs). I recommend A.
2. **Isolation:** wrapper in BX Agents, or a session key upstream in bx-playwright?
3. **Snapshot dependency:** OK to depend on `1.0.0-snapshot`, or wait for a stable?
4. **Default allowlist** for navigation: the app's own host only, or the open web?
5. **MCP:** stdio entries in `mcpServers` (preferred), or sidecar only at first?
6. **Testing scope first:** our own CI browser specs, `test --browser`, or both?
