# Plan: bx-playwright in BX Agents

Status: design agreed, no code yet. Written against bx-playwright `1.0.0-snapshot` and bx-ai 3.5.0. bx-playwright now registers its 10 tools with bx-ai when both are loaded ([bx-playwright#36](https://github.com/ortus-boxlang/bx-playwright/pull/36), merged).

**Principle: the registry is a catalog, not an attachment.** A tool being in `aiToolRegistry()` only means it is *available*. An agent gets a tool only when it names it (or it is in the agent's own `tools/`).

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

This is a bug in the factory, not in registering. Registering only makes a tool available; attaching the whole registry to every agent is what turns "available" into "everyone has it".

Since bx-playwright#36, bx-playwright registers `browser_*@bxplaywright` whenever bx-ai is loaded. In a project that has both modules, the factory above now gives **every agent a browser** until it is fixed. So Phase 1 (per-agent selection, replacing `getAll()`) lands before anything else, and before a BX Agents release that bundles bx-playwright.

Related: bx-ai's `aiTool()` registers under the bare name by default (`autoRegister`), which would leak tools into the registry unnamespaced. bx-playwright#36 passes `false`; BX Agents must do the same for anything it builds.

## 2. Decisions (agreed)

0. **`Agent.yaml` is the default way to define an agent; `Agent.bx` is the advanced option.** Most agents are configuration, and YAML is more readable. A class is only needed for very specific behavior (hooks, dynamic instructions). YAML mirrors the same keys as the class's `configure()` struct. If an agent folder has both, that is an error unless the class says it extends the YAML (hybrid, to be specified). This brings bx-yaml back as a bundled module (it was dropped in #90), versioned in `gradle.properties`.
   ```yaml
   name: support
   model: claude-sonnet-5-5
   instructions: |
     You help customers with orders.
   tools:
     - now@bxai
     - "*@bxplaywright"
   toolOptions:
     bxplaywright:
       allow: [ docs.example.com ]
   ```
1. **Declare `tools` (in `Agent.yaml`, or in `configure()` of the class), namespaced by module.** Every name is `item@module`, the same key bx-ai already uses in its registry. The module part tells you what must be installed. The class form:
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
4. **Dangerous packs are sandboxed by default.** `filesystem@bxai` is limited to a `workspace/` folder in the project; `*@bxplaywright` to the app's own host. Widen with `toolOptions`, keyed by **module** (defaults for every tool from it) or by **tool** (`item@module`, overrides the module key):
   ```javascript
   tools : [ "filesystem@bxai", "*@bxplaywright" ],
   toolOptions : {
   	bxai         : { filesystem : { roots : [ "/data/reports" ] } },
   	bxplaywright : { allow : [ "docs.example.com" ] }
   }
   ```
5. **`*@bxplaywright` works without `toolOptions`.** The defaults above apply; widening them is the developer's responsibility.
6. **Name conflicts: the agent's own tool wins, with a logged warning.** If `tools/Search.bx` and `search@bxai` are both in play, the own tool is used and a warning names both.
7. **Browser isolation: a fresh tool set per agent (option A).** BX Agents does not use the shared `browser_*@bxplaywright` registry tools. For each agent that names `@bxplaywright`, it calls `playwright().aiTools()`, which returns tools bound to their own browser and page, so two agents never share a tab. No upstream change is needed. Per-conversation isolation within one agent (the singleton serving many users) is still to be designed.
8. **MCP is a separate `mcp` key and is general, not just for Playwright.** Entries can name a module that ships an MCP server (`bxplaywright`), a remote URL, or a local stdio command. Tools say *which* tools; `mcp` says *where the tools run* (another process or service). Today `mcpServers` accepts URLs only; stdio entries use bx-ai's `StdioTransport`.
   ```yaml
   mcp:
     - bxplaywright
     - url: https://mcp.acme.com/crm
     - command: [ npx, some-mcp-server ]
   ```
9. **bx-playwright dependency: the `1.0.0-snapshot` build for now**, until bx-playwright is released. Switch to the released version before a BX Agents release that bundles it.

### A `box.json` at the agent's root (agreed)

So users can add their own dependencies, `new` scaffolds a `box.json` in the project root, laid out like the ColdBox templates:

```json
{
	"name": "support-bot",
	"dependencies": { "cbvalidation": "^4" },
	"devDependencies": { "testbox": "*" },
	"installPathConventions": { "modules": "lib/modules" },
	"installPaths": { "testbox": "lib/testbox/" }
}
```

- `box.json` declares; the project's `lib/` holds what was installed (gitignored). `build` already copies the project `lib/` over the bundled libraries, so a project can add or override any library.
- **Installer: both.** `bxAgents install` reads `box.json` and installs natively from ForgeBox (BX Agents already has a ForgeBox client), and `build` runs it when `box.json` changed. Plain `box install` gives the same result because the layout is the same.
- **One manifest per project.** The scaffolded `tests/box.json` is merged into the root `box.json` (TestBox as a devDependency), the same rule applied to this repo. `bxAgents test` then finds TestBox in `lib/testbox`.
- Modules named in `tools` (for example `*@bxplaywright`) that are bundled need no entry. One that is not bundled is added to `box.json`, and the build error for a missing module says so.
- BoxLang modules install into `boxlang_modules/` (the BoxLang convention), and BoxLang loads them when a command runs from the project root. So nothing extra is needed to find them. ColdBox libraries stay in `lib/`.

### What a name can be

| Name | Is | Example |
|---|---|---|
| `tool@module` | One tool already in the registry | `"now@bxai"`, `"httpGet@bxai"` |
| `pack@module` | A group of tools the module ships but does **not** register on load; BX Agents builds it on demand, scoped to this agent | `"filesystem@bxai"` (the 20 `FileSystemTools`: read, write, delete, move, search, zip, ...) |
| `*@module` | Everything the module provides, via a small adapter | `"*@bxplaywright"` |
| Your own tool | Anything in `tools/` | always on, never named |

Packs and modules never go into the global registry for every agent. They are built per agent, which is what keeps the browser and filesystem off agents that did not ask for them.

Build effects for each name: validate the module is available (bundled or installed), apply sandbox defaults and `toolOptions`, attach only to this agent, record the required modules in the manifest (so `package`/`deploy`/`doctor` know), and `doctor` reports missing prerequisites.

### What "all the bx-playwright tools" means

- **Native tools (default path)**: the 10 bx-playwright tools: `browser_visit`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_select`, `browser_press`, `browser_back`, `browser_text`, `browser_screenshot`, `browser_close`. In-process, no extra server.
- **MCP server (second path)**: `bxplaywright mcp` is Playwright's own MCP server, with a larger tool set. BX Agents' `mcpServers` accepts **URLs only**, but bx-ai already has a `StdioTransport`. Two ways:
  1. `bxplaywright mcp --port 8931` as a sidecar process, consumed as `http://localhost:8931/mcp`: works today, but the author must run the sidecar.
  2. Extend `mcpServers` to accept `{ command : [ "bxplaywright", "mcp", "--headless" ], name : "browser" }` and have bx-ai spawn it over stdio. Cleaner; needs a small BX Agents change and a check that bx-ai's client can be handed a stdio command.
  Naming `*@bxplaywright` can later also mean "and its MCP server" through the option `mcp : true`.

### Problems this must solve

1. **Isolation.** Decided: a wrapper in BX Agents (decision 7), one tool set per agent. Still open: the agent is a singleton serving many users, and `AiBrowser` keeps one page per `aiTools()` call, so two users of the same agent would still drive one tab. Needs one page (ideally one browser context) per `(userId, conversationId)`, closed when idle.
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

**Phase 0: `Agent.yaml`**
- [ ] Bring back bx-yaml as a bundled module (`gradle.properties`, `boxlangModules`).
- [ ] Load `Agent.yaml` as the agent definition; `Agent.bx` stays as the advanced option; error on both for the same agent.
- [ ] `new` scaffolds `Agent.yaml`; docs, specs, schema validation.

**Phase 1: per-agent tool selection (needed first; also fixes the finding above)**
- [ ] `tools` / `toolOptions` in the config resolver, validator, and docs; name resolution (key, pack, module); own tool wins with a warning.
- [ ] `filesystem` pack with a `workspace/` sandbox.
- [ ] Factory attaches a filtered list instead of `getAll()`; specs.
- [ ] Migration note in the changelog.

**Phase 1b: project `box.json`**
- [ ] `new` scaffolds root `box.json` (replaces `tests/box.json`), `.gitignore` gets `lib/`.
- [ ] `bxAgents install` verb (native ForgeBox install into `lib/`), `build` runs it when `box.json` changed.
- [ ] `test` finds TestBox in `lib/testbox`; docs and specs.

**Phase 2: bx-playwright as a bundled module + native tools**
- [ ] Bundle `bx-playwright` (`gradle.properties`).
- [ ] Module adapter interface and the bx-playwright adapter.
- [ ] Isolation, allowlist, masking, approval.
- [ ] `doctor` and `bxAgents browser install|doctor`.
- [ ] Example project and docs.

**Phase 3: MCP**
- [ ] A separate `mcp` key accepting module names, URLs and stdio commands (bx-ai `StdioTransport`).

**Phase 4: testing**
- [ ] CI browser specs, `test --browser`, `BaseAgentSpec.browser()`.

## 5. Risks

- bx-playwright is `1.0.0-snapshot` only. Depend on it for now (decision 9); switch to the released version before a BX Agents release that bundles it.
- Until Phase 1 lands, a project with bx-ai and bx-playwright gives every agent a browser through the factory's `getAll()`.
- Browser download in restricted networks: proxy settings, an offline path.
- CI time and disk for browsers: cache them.
- A model with a browser can act on the web: defaults must be conservative.

## 6. Still open

1. **Per-conversation browser isolation** inside one agent (see Problems, item 1).
2. **Hybrid `Agent.yaml` plus `Agent.bx`:** can the class extend the YAML and override parts? Not decided; for now it is an error to have both.
3. **Testing scope first:** our own CI browser specs, `test --browser`, or both?
4. **Stdio `command:` entries:** check that bx-ai's MCP client can be handed a stdio command (BX Agents only passes URLs today).
