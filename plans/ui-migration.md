# Plan: the web app as a real ColdBox app with Vite, Sass and Alpine

Status: all decisions taken by the owner. Ready to start phase 0 on a new branch when approved. No code yet.
Inputs: the cbGenesis analysis (`genesis-analysis.md`) and the UI review (`review-ui.md`), both in the session scratchpad.

## 1. Decisions taken

| # | Decision | Taken |
|---|---|---|
| D1 | Delivery | **A real ColdBox app, not one index.html.** Handlers, Router, layouts, views, partials and components, like cbGenesis |
| D2 | Old dialogs in `index.html` | **Delete them** (Logs, Gateways, Routines, Tokens, Notes, Vault). Menu items become links to the pages |
| D4 | CSS | **Port our `shell.css` to Sass, no Bootstrap.** cbGenesis import order, CSS custom properties for themes |
| D5 | Shipping | **One PR at the end.** Mitigation in section 9 |
| D6 | Navigation | **Full page loads, like cbGenesis.** When a turn is streaming, ask "the answer will stop, leave?" before leaving the chat |
| D7 | Packaging | **A ColdBox module** (`bxagents-ui`) that the dev host app and the generated agent both mount |
| (earlier) | JS | **Full Alpine reactivity**, no vanilla `h()` pages |

## 2. Why

- The UI is vanilla JS (`shell.js`, 12 page files, a 4,568 line `index.html`), built into one file by string replacement of `__TOKENS__`.
- It carries a second copy of six pages, three API result shapes, 16 `window.confirm` calls, no shared toast, 81 inline styles, and chips, cards and tables rebuilt by hand.
- A developer cannot start the UI on its own. A change means building and serving an agent.

## 3. What cbGenesis does (what we copy)

| Area | cbGenesis | Here |
|---|---|---|
| Dev loop | `server start` (:8080) plus `npm run dev` (Vite HMR) | same |
| Assets | `coldbox-vite-plugin`, inputs `scss/app.scss` and `js/App.js`, a `vite()` helper that uses the dev server or the built manifest | same |
| Sass | one `app.scss` importing variables, mixins, base, layouts, components, views in a fixed order | same, our CSS ported |
| JS | one `App.js`: Alpine, plugins (collapse, focus, mask, persist), stores, components, `Alpine.start()` | same |
| Components | one factory per file, `Alpine.data( "name", factory )`, `components/<domain>/Name.js`, JSDoc on everything | same |
| Shared logic | `utils/` and magics (`$toast`, `$progress`, `$focus`, `$copy`, `$countLabel`) | same, plus `$api` and `$confirm` |
| Server | handlers, `Router.bx`, 4 layouts, 21 partials under `views/_components/{app,auth,ui}` called with `view( view:"...", args:{} )` | same |
| Quality | ESLint, Stylelint, `AGENTS.md` with custom skills | same, plus tests (cbGenesis has none for JS) |

Gaps not to repeat: no JS or UI tests, CI skips lint, two different theme storage keys.

## 4. Shape: the UI is a ColdBox module

Because the generated agent is already a ColdBox app, the UI becomes a **ColdBox module**, `bxagents-ui`:

- **In development** it is mounted by a small host app in `ui/` (this is the "app you start and iterate on", like cbGenesis).
- **In a built agent** the generator copies the module into `modules_app/` and mounts it at the gateway's `path` (today `/chat`). The settings the generator replaces as `__TOKENS__` today (title, subtitle, icon, welcome, suggestions, placeholder, footer, theme, custom CSS, API base, login URL, reasoning and tool toggles) become **module settings** that the layouts and views read with `getSetting()`. No string replacement.
- The Vite output (`public/includes/build/` with `manifest.json`) is **committed** in the bx-agents repo (like `libs.min.js` is today), so building an agent never needs Node. CI checks the committed output is fresh.
- **Offline stays true:** no CDN, no runtime network, assets served by the agent itself.
- **Extensions** keep working: `window.bxagents`, the slots, and their `web/` folders. The layout renders the slots and links the extension assets.

## 5. Layout of the repo

```
ui/                                   the dev host app and the module
  package.json  vite.config.mjs  eslint.config.mjs  .stylelintrc.json  box.json  server.json
  AGENTS.md  .agents/skills-custom/    alpine-components, partials, api-fetch
  config/ColdBox.bx  config/Router.bx
  modules_app/bxagents-ui/
    ModuleConfig.bx                    settings, mount, router
    handlers/    Chat Conversations Routines Registry Connectors Memory Vault Settings Agent Gateways Logs Access Data Auth
    layouts/     App.bxm (menu, header, slots)  Login.bxm
    views/
      <page>/index.bxm                 one view per page
      _components/ app/{sidebar,topbar,slots}  ui/{page-head,tabs,card,chip,empty,modal,drawer,confirm,field,switch,toast,status}
  resources/assets/
    scss/   app.scss  _variables  _mixins  _base  layouts/  components/  views/
    js/     App.js  components/<domain>/*.js  stores/{session,nav,theme}.js  utils/{api,format}.js  magics.js
  fixtures/  api/*.json  model.json     canned /__bxagents answers for development
  tests/     e2e/ (Playwright)  unit/ (Vitest)  specs/ (TestBox for handlers)
```

## 6. API shape (before any code)

- **Handlers** are thin: one per page, `index()` renders `layout + view` with the page title and the capability check (admin only pages answer 403). No business logic and no copy of the agent API: all data comes from `/__bxagents`, which does not change.
- **Routes** are real: `/chat`, `/chat/connectors`, `/chat/vault`, and so on, explicit like cbGenesis (`route( "/connectors" ).to( "Connectors.index" )`). `Auth` handles `/login` and `/logout` with the existing session behaviour.
- **`$api`** magic, one wrapper: `await $api.get( "/connectors" )` returns `{ ok, status, data, error }`, never throws for HTTP errors, adds the CSRF header, aborts on `destroy()`. Replaces `apiGet`, `apiPost`, `routinesCall` and the six `failedText` copies.
- **`$confirm( { title, body, danger } )`** returns a promise (one native `<dialog>`). Replaces the 16 `window.confirm`.
- **`$toast.success|error( text )`** replaces `say()` and the hand made status lines.
- **Stores:** `session` (caller, admin, `/info` capabilities), `nav` (fold state, badges, `$persist`), `theme`.
- **Partials** have a documented `args` header like cbGenesis; dialogs use native `<dialog>` with an `x-dialog` directive (focus trap and return).
- **Page components:** `Alpine.data( "connectorsPage", factory )`, one per page, with `init()`, `destroy()`, JSDoc on every member. Server data that must be in the first paint is passed with `forAttribute`; the rest is fetched in `init()`.
- **Security rules:** no handler or setting value inside `x-`, `:` or `@` attributes (they run as code); `x-html` only through a `$md` magic (marked plus DOMPurify). A spec enforces both. The chat transcript and the extension slots use `x-ignore`.
- **Extension contract:** `window.bxagents` and the slots are frozen by a spec in phase 0, before anything moves.

## 7. Dev workflow (target)

```
cd ui
box install && npm install
box server start          # ColdBox host app on :8080 with the fixture API
npm run dev               # Vite HMR on :5173
npm run lint && npm run lint:scss && npm test && npm run e2e
npm run build             # writes the committed public/includes/build/
```

`UI_API=http://127.0.0.1:8730` points the host app at a real running agent instead of the fixtures.

## 8. Phases

| # | Phase | Exit criteria | Days |
|---|---|---|---|
| 0 | **Safety net and cleanup.** Playwright smoke suite against today's UI (every page, dialogs, focus, console errors, XSS probes, the extension contract). Delete the six legacy dialogs. | Suite green. About 1,100 lines gone from `index.html`. | 3 |
| 1 | **Host app and module skeleton.** `ui/`, Router, layouts, `vite()` helper, Sass order, ESLint, Stylelint, fixture API, `AGENTS.md`, skills. | `server start` plus `npm run dev` shows the empty shell with menu and theme. | 4 |
| 2 | **Foundation.** Stores, `$api`, `$confirm`, `$toast`, `$md`, `x-icon`, `x-dialog`, the partials, unit tests, and a `/_kit` page that shows every partial. | Each partial has a spec and is on `/_kit`. | 5 |
| 3 | **Small pages:** data, logs, gateways, settings. | Behaviour as today, Playwright passes. | 3 |
| 4 | **Medium pages:** access, vault, registry, conversations. | as above | 4 |
| 5 | **Large pages:** memory, routines, agent, connectors. | as above | 6 |
| 6 | **Chat.** Sidebar, header, composer and panels reactive. The streaming transcript stays imperative inside an `x-ignore` island. | Streaming, approvals, attachments, talk-to, recording pass e2e. | 7 to 9 |
| 7 | **Generator.** Copy the module into the built agent, write module settings instead of tokens, mount at the gateway path, link extension assets. Rewrite the 232 fragment assertions in `WebUiGeneratorSpec` toward a contract. | A built agent serves the new UI; the extension spec passes. | 4 |
| 8 | **Remove the old UI, docs, release.** Delete `shell.js`, `pages/*.js`, the old `index.html`. Update `web-ui.md` (says "no AlpineJS"), add `docs/guides/ui-development.md`, changelog, re-record screenshots and the trailer. | CI green. | 3 |

About 40 to 45 working days. Phases 0 to 2 (about 12 days) give you the local dev setup.

## 9. Risks

- **One PR at the end** is the largest risk of this plan. Mitigation: work on a long lived branch, one commit group per phase, CI on every push, and a written checkpoint report at the end of each phase (what runs, what is left, screenshots). If you change your mind, phases 0 to 2 can be split out at no cost.
- **Full page loads end a streaming chat.** Taken as decided (D6): the chat asks before it is left. A turn that was running is not resumed on return; the conversation is in the chat database, so nothing already answered is lost.
- **Size of the chat (phase 6).** Mitigation: islands, and Playwright first.
- **Bundle size.** Alpine plus plugins is about 55 KB (to measure). A size budget check in CI.
- **Offline promise.** A spec greps the built output for `http` references.
- **Extension authors.** The contract is frozen by a spec in phase 0.
- **Generator coupling.** Phase 7 changes how every agent is built; it needs a test that builds each fixture project and requests every UI route.

## 10. Open questions

None. The chat's leave warning is a small `beforeunload` plus a menu click guard in `Chat` (phase 6).
