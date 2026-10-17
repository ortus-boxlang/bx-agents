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

## 2. Decisions (agreed)

1. **Declare in `configure()` of the class, namespaced by module.** Every name is `item@module`, the same key bx-ai already uses in its registry. The module part tells you what must be installed:
   ```javascript
   class extends="bxModules.bxai.models.runnables.AiAgent" {
   	function configure() {
   		return {
   			tools : [
   				"now@bxai",            // one bx-ai built-in
   				"filesystem@bxai",     // a bx-ai pack (not registered by default)
   				"*@bxplaywright"       // every bx-playwright tool
   			]
   		}
   	}
   }
   ```
   - `name@module`: one tool or pack from that module.
   - `*@module` (or just `@module`): everything that module provides.
   - A bare name (`"now"`) is an error with a hint: `did you mean now@bxai?`. No guessing.
2. **Default = only the agent's own `tools/`.** bx-ai built-ins (`now@bxai`, `httpGet@bxai`, `sendEmail@bxai`, `webSearch@bxai`, ...) must be named. Fixes the finding in section 1.
3. **The module part drives the include.** Naming anything `@bxplaywright` makes the build validate the bundled module, wire its tools for **that agent only**, and warn in `doctor` if the browser is not installed. The error for a missing module names it: `tools lists "*@bxplaywright" but module bxplaywright is not available`.
4. **Dangerous packs are sandboxed by default.** `filesystem@bxai` is limited to a `workspace/` folder in the project; `*@bxplaywright` to the app's own host. Widen with options, keyed by the same module name:
   ```javascript
   tools : [ "filesystem@bxai", "*@bxplaywright" ],
   moduleOptions : {
   	bxai         : { filesystem : { roots : [ "/data/reports" ] } },
   	bxplaywright : { allow : [ "docs.example.com" ] }
   }
   ```

### What a name can be

| Name | Is | Example |
|---|---|---|
| `tool@module` | One tool already in the registry | `"now@bxai"`, `"httpGet@bxai"` |
| `pack@module` | A group of tools the module ships but does **not** register on load; BX Agents builds it on demand, scoped to this agent | `"filesystem@bxai"` (the 20 `FileSystemTools`: read, write, delete, move, search, zip, ...) |
| `*@module` | Everything the module provides, via a small adapter | `"*@bxplaywright"` |
| Your own tool | Anything in `tools/` | always on, never named |

Packs and modules never go into the global registry for every agent. They are built per agent, which is what keeps the browser and filesystem off agents that did not ask for them.

Build effects for each name: validate the module is available (bundled or installed), apply sandbox defaults and `moduleOptions`, attach only to this agent, record the required modules in the manifest (so `package`/`deploy`/`doctor` know), and `doctor` reports missing prerequisites.

### What "all the bx-playwright tools" means

- **Native tools (default path)**: the 10 bx-playwright tools: `browser_visit`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_select`, `browser_press`, `browser_back`, `browser_text`, `browser_screenshot`, `browser_close`. In-process, no extra server.
- **MCP server (second path)**: `bxplaywright mcp` is Playwright's own MCP server, with a larger tool set. BX Agents' `mcpServers` accepts **URLs only**, but bx-ai already has a `StdioTransport`. Two ways:
  1. `bxplaywright mcp --port 8931` as a sidecar process, consumed as `http://localhost:8931/mcp`: works today, but the author must run the sidecar.
  2. Extend `mcpServers` to accept `{ command : [ "bxplaywright", "mcp", "--headless" ], name : "browser" }` and have bx-ai spawn it over stdio. Cleaner; needs a small BX Agents change and a check that bx-ai's client can be handed a stdio command.
  Naming `*@bxplaywright` can later also mean "and its MCP server" through the option `mcp : true`.

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
- [ ] `tools` / `moduleOptions` in the config resolver, validator, and docs; name resolution (key, pack, module).
- [ ] `filesystem` pack with a `workspace/` sandbox.
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

## 6. Still open

1. **Isolation:** wrapper in BX Agents, or a session key upstream in bx-playwright?
2. **Snapshot dependency:** OK to depend on `1.0.0-snapshot`, or wait for a stable?
3. **MCP:** stdio entries in `mcpServers` (preferred), or sidecar only at first?
4. **Testing scope first:** our own CI browser specs, `test --browser`, or both?
