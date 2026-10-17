# Plan: integrate bx-playwright into BX Agents

Status: proposal, no code yet. Written against bx-playwright `1.0.0-snapshot` (ortus-boxlang/bx-playwright, docs at bxplaywright.boxlang.io).

## 1. What bx-playwright gives us (verified in its source and docs)

- BoxLang module `bxplaywright`, CLI `bxplaywright`. Needs BoxLang 1.17+ and Java 21+. We already meet both (1.18, JDK 21).
- Two distributions: `bx-playwright` (about 4 MB, downloads Node.js on `bxplaywright install`) and `bx-playwright-full` (about 206 MB, Node.js bundled for every platform). Browsers are always downloaded from Playwright's CDN, never shipped in a zip.
- **Agent tools already exist.** `playwright( opts ).aiTools()` returns 10 bx-ai tools: `browser_visit`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_select`, `browser_press`, `browser_back`, `browser_text`, `browser_screenshot`, `browser_close`. `aiToolDefinitions()` returns the same as plain structs. Each action returns URL, title and an accessibility snapshot with element refs (`e12`); errors come back as text so the model can recover. Backed by `models/AiBrowser.bx`.
- **One page per `aiTools()` call.** `AiBrowser` keeps a single page in `variables.page`, opened lazily.
- `bxplaywright mcp` starts Playwright's own MCP server (stdio, or `--port`).
- **TestBox 7.2+ and ColdBox 8.3+ have first-class browser specs**: `@browser`, `@browserProfile`, `@baseURL`, `browse( ( page ) => ... )`, matchers (`toSee`, `toHavePath`, ...), failure artifacts (screenshot, trace). TestBox provisions the browser on first use via `playwrightEnsureBrowser()`.
- Profiles (`ci`, `mobile`, `dark`, `headed`, custom) via `modules.bxplaywright.settings.profiles`.
- Only `1.0.0-snapshot` is published on ForgeBox so far.

## 2. What BX Agents has today that this plugs into

- `Agent.bx` extends bx-ai's `AiAgent`; `withTools()` appends, so an author can already write `withTools( playwright().aiTools() )` in `init()` with zero framework changes.
- `tools/` is scanned by `aiToolRegistry().scan( "tools" )` (annotation-based, not programmatic), and the generated `GeneratedAgentFactory` attaches `aiToolRegistry().getAll()` to every agent node.
- `GeneratedAgent` is a **singleton**; the web UI and gateways serve many users through it.
- `bxAgents test` runs project specs in a child BoxLang process with `modulesDirectory` pointing at the installed module (nested modules included), TestBox from the project's `tests/testbox`.
- The module now bundles its BoxLang modules as nested modules (PR #90), so adding one is a `gradle.properties` line.

## 3. Proposal

### A. Bundle it, provision browsers on demand

1. Add `bx-playwright` (slim) as a bundled nested module: `bxPlaywrightVersion` in `gradle.properties`, one entry in `boxlangModules`.
2. Do **not** bundle `bx-playwright-full`: 206 MB on every install for a feature most agents will not use.
3. Browsers: provision lazily with `playwrightEnsureBrowser( "chromium" )` the first time a browser tool or browser spec runs, plus an explicit path: `bxAgents doctor` reports "browser installed / not installed" and the fix.
4. `bxAgents browser install|doctor` verb that delegates to the bundled module's installer. A nested module's own CLI executable is probably not on `PATH`, so this verb is how users reach `bxplaywright install` (to verify).

### B. Browser tools for agents (opt-in)

API shape, in `Agent.bx` config (descriptor and class forms):

```javascript
configure() {
	return {
		name  : "support-bot",
		model : "openai/gpt-5",
		browser : {
			profile : "ci",                    // bx-playwright profile(s), default "default"
			baseURL : "http://localhost:8080", // relative visit() targets resolve here
			allow   : [ "localhost", "docs.example.com" ],  // host allowlist, default: baseURL host only
			approve : [ "fill", "click" ]      // tools that pause for human approval, default none
		}
	}
}
```

- `browser: true` is shorthand for the defaults. Absent means no browser, no module load cost.
- Build wires `playwright( opts ).aiTools()` into the agent node's tool list in `GeneratedAgentFactory`, next to `aiToolRegistry().getAll()`.
- Documented escape hatch for anything custom: `withTools( playwright( ... ).aiTools() )` in a class `Agent.bx`. No framework code needed for that path.

Problems this must solve (these are why it is more than one line):

1. **Isolation.** The agent is a singleton and `aiTools()` shares one page, so two users would drive the same browser tab. Needs one page (ideally one browser context) per `(userId, conversationId)`, closed on idle/after the turn. Preferred: a small BX Agents wrapper that builds an `AiBrowser` per conversation and hands the tools a context-aware handler. If bx-playwright can take a "session key" in `aiToolDefinitions()`, upstream is cleaner; open question below.
2. **Navigation safety (SSRF and data exfiltration).** The model chooses URLs. Enforce `allow` at the tool layer (reject `visit` outside the allowlist, also on redirects), block `file:`/`chrome:`/cloud metadata addresses always.
3. **Secrets.** `browser_fill` puts model-chosen text into forms and the value appears in tool traces and logs. Mask values for password-type fields, and keep `fill` out of the default allowlist for approval-free runs when credentials are involved.
4. **Human-in-the-loop.** bx-ai already has HITL approvals and the web UI renders them. `approve: [ ... ]` maps to the same mechanism.
5. **Cost and size.** A snapshot per action can be large. Cap snapshot length (config `maxSnapshotChars`) and say so in the tool result.
6. **Deploy.** `docker` target must install the browser and Linux system libraries (`bxplaywright install --with-deps chromium`) in the image; `.bxa`/local targets need the install step documented. Headless is forced when there is no display.

Alternative considered: the MCP route (`bxplaywright mcp` registered through the existing `mcp/` convention). Richer Playwright tool set and separate process, but needs Node on the box, a second process lifecycle, and no per-conversation isolation by default. Keep it documented as an option, not the default.

### C. Testing

1. **User-facing, `bxAgents test --browser`**: starts the built app with `serve` on a free port, exports it as the `@baseURL`, runs specs with TestBox browser support, stops the server. Scaffolded `tests/` gets an optional browser spec example. `TestRunnerService` already passes `modulesDirectory`, so `bxplaywright` loads from the nested module.
2. **Agent-assisted checks**: `BaseAgentSpec` gets a `browser()` helper that returns a page against the served app, so a spec can assert on what the agent *did* in the UI (not only on its text).
3. **This repo's own CI**: add browser specs for the generated web chat (the sidebar, streaming, 401 message, phone layout) using bx-playwright instead of the ad-hoc Playwright scripts used for the site videos. Needs `bxplaywright install --with-deps chromium` in the workflow, cached.
4. **Docs and demo videos**: re-record the walkthrough videos with bx-playwright so the repo stops depending on a separate Python/Node Playwright setup.

## 4. Phases and tasks

**Phase 1: module and browser provisioning** (small)
- [ ] `bxPlaywrightVersion` in `gradle.properties`, add to `boxlangModules`.
- [ ] `doctor`: check module loaded, driver installed, browser installed.
- [ ] `bxAgents browser install|doctor` verb (+ completions regenerate, spec).
- [ ] Decide snapshot-release policy (see questions).

**Phase 2: agent tools**
- [ ] Settle the `browser` config shape (this document's sketch) and validate it in `ProjectValidator`.
- [ ] Per-conversation browser wrapper + idle cleanup (or upstream change).
- [ ] Allowlist, redirect check, scheme blocklist.
- [ ] Secret masking in traces.
- [ ] HITL mapping for `approve`.
- [ ] Generator change in `GeneratedAgentFactory`; generator specs; one mock-provider integration spec that drives a real page.
- [ ] Docs: new `conventions` section or `Agent.bx` option table, example project `examples/browser-agent`.
- [ ] Deploy docs and Docker target support.

**Phase 3: testing**
- [ ] `test --browser`, `serve` lifecycle inside it.
- [ ] `BaseAgentSpec.browser()`.
- [ ] CI job for browser specs; replace ad-hoc video capture.

## 5. Risks

- bx-playwright is `1.0.0-snapshot` only; API may move. Pin the snapshot in `gradle.properties` and wait for a stable release before we ship a BX Agents release that depends on it.
- Browser download in restricted networks (proxy, air-gapped): needs `HTTPS_PROXY` guidance and a documented offline path (`bx-playwright-full` plus pre-seeded browsers).
- CI time and disk: browser install is hundreds of MB; cache it.
- A model with a browser can act on the web. Defaults must be conservative (allowlist, headless, no auto-approve for writes).

## 6. Questions for you

1. Opt-in via `browser:` in `Agent.bx` (above), or only documentation for `withTools( playwright().aiTools() )` at first?
2. Per-conversation isolation: ship the wrapper in BX Agents, or ask bx-playwright to support a session key upstream (you own both)?
3. OK to depend on a `1.0.0-snapshot` while it is the only release, or wait for a stable?
4. Default allowlist: baseURL host only (safe) or open web (convenient)?
5. For testing, is `test --browser` plus repo CI the right first scope, or do you want the visual-verification-by-agent idea first?
