# Plan: the web app as a Vite, Sass and Alpine app

Status: draft for approval. No code yet. Inputs: the cbGenesis analysis (`genesis-analysis.md`) and the UI review (`review-ui.md`).

## 1. Why

- The UI is vanilla JS: `shell.js` (`h()`, `btn()`), 12 page files, and a 4,568 line `index.html` (the chat). The request is full Alpine reactivity.
- `index.html` still carries a second copy of six pages (about 1,130 script lines, 150 lines of markup, 87 CSS rules). The pages even call helpers that only exist in that copy.
- There are three API result shapes, 16 `window.confirm` calls, no shared toast, 81 inline style lines, and chips, cards, search boxes and tables rebuilt by hand in every page.
- A developer cannot start the UI on its own. Changing a page means building an agent and serving it.

## 2. What cbGenesis does (the part we copy)

| Area | cbGenesis | Copy as is |
|---|---|---|
| Dev loop | `server start` (port 8080) plus `npm run dev` (Vite HMR) in a second terminal | yes |
| Assets | `coldbox-vite-plugin`, inputs `scss/app.scss` and `js/App.js`, a `vite()` helper that picks the dev server or the built manifest | the pattern |
| Sass | one `app.scss` that imports variables, mixins, base, layouts, components, views in a fixed order. CSS custom properties for themes | yes |
| JS | one `App.js` entry: Alpine, plugins (collapse, focus, mask, persist), stores, components, then `Alpine.start()` | yes |
| Components | one factory per file, `Alpine.data( "name", factory )`, `components/<domain>/Name.js`, JSDoc on everything | yes |
| Shared logic | `utils/` (listing, csrf fetch, dates, counts) and magics (`$toast`, `$progress`, `$focus`, `$copy`, `$countLabel`) | yes |
| Server | handlers, `Router.bx`, 4 layouts, 21 view partials under `_components/{app,auth,ui}` called as `view( view:"_components/ui/modal", args:{} )` | adapt (section 4) |
| Quality | ESLint (tabs, `space-in-parens`, aligned colons), Stylelint, AGENTS.md with custom skills | yes |

Gaps to fix as we copy, not repeat: cbGenesis has no JS or UI tests, CI does not run lint, and its theme key is written two different ways.

## 3. Where BX Agents differs

- Today `WebUiGenerator` builds ONE offline HTML file by replacing tokens in `index.html`, inlining vendored libs and the icon sprite. Extensions use `window.bxagents` and slots. It is served by the agent, with no build step for the person who builds an agent.
- The UI only talks to the agent's JSON API (`/__bxagents`, 81 routes). There is no page server logic to port, so the cbGenesis handlers are thin.
- The generated agent is already a ColdBox app, so real views and layouts are possible.

## 4. Decisions I need from you (the shape)

**D1. How the UI reaches a built agent.**
- **A. Bake.** The dev app is a real ColdBox app. A build step renders layout plus views once and Vite inlines JS and CSS into the single file we ship today. The agent build stays unchanged. Deep links stay hash based.
- **B. Ship real views.** The built agent contains the ColdBox views, layouts and partials, and Vite's output as hashed assets served from the agent. Real URLs (`/chat/connectors`). Closest to cbGenesis. Changes the generator, the extension contract and offline packaging.
- Recommendation: **A first**, so a release never depends on a runtime change, and keep B open. The dev app is identical either way.

**D2. Where it lives.** `ui/` at the repo root: its own `package.json`, `box.json`, `server.json`. Output goes to `src/main/bx/models/build/generators/webui/dist/` (committed, like `libs.min.js` is today).

**D3. What the dev app talks to.** A fixture API: a small BoxLang server that implements the `/__bxagents` routes from `ApiContract` with canned data and a scripted model (we already have `tools/demo`). A second mode proxies to any running agent (`UI_API=http://127.0.0.1:8730`).

**D4. CSS base.** cbGenesis uses Bootstrap. Our `shell.css` is 351 lines of custom CSS plus tokens. Recommendation: keep our design, convert it to Sass partials with the cbGenesis order, no Bootstrap. Smaller file and no visual change.

**D5. Icons.** Keep the inlined SVG sprite behind an `x-icon` directive, not the Phosphor font (the font is a few hundred KB and a network habit).

**D6. Tests.** Playwright smoke suite (every page, dialogs, focus return, console errors, XSS probes) plus Vitest for stores and magics. Both run in CI. This is how we avoid what cbGenesis lacks.

## 5. Target layout

```
ui/
  package.json  vite.config.mjs  eslint.config.mjs  .stylelintrc.json  box.json  server.json
  AGENTS.md  (conventions)   .agents/skills-custom/  (alpine-components, partials, api-fetch)
  config/ColdBox.bx  config/Router.bx
  handlers/        Main.bx (shell), Pages.bx (one action per page), Api.bx (fixture routes, dev only)
  layouts/         App.bxm (shell with menu and header), Login.bxm
  views/
    pages/         chat.bxm conversations.bxm routines.bxm registry.bxm connectors.bxm memory.bxm vault.bxm settings.bxm
                   agent.bxm gateways.bxm logs.bxm access.bxm data.bxm
    _components/   app/{sidebar,topbar,slots}  ui/{page-head,tabs,card,chip,empty,modal,drawer,confirm,field,switch,toast,status}
  resources/assets/
    scss/          app.scss  _variables  _mixins  _base  layouts/  components/  views/
    js/            App.js  components/<domain>/*.js  stores/{session,nav,theme}.js  utils/{api,format,listing}.js  magics.js
  tests/           e2e/ (Playwright)  unit/ (Vitest)
  fixtures/        api/*.json  model.json
```

## 6. API shape (the contracts, before any code)

- **`$api`** magic, one wrapper for every call: `await $api.get( "/connectors" )` returns `{ ok, status, data, error }` and never throws for HTTP errors. Replaces `apiGet`, `apiPost`, `routinesCall` and the six copies of `failedText`. Attaches the CSRF header, aborts on `destroy()`.
- **`$confirm( { title, body, danger } )`** returns a promise. One native `<dialog>`. Replaces all 16 `window.confirm`.
- **`$toast.success|error( text )`** replaces `say()` and the hand made `.pg-status` lines.
- **Stores:** `route` (current page, hash router), `nav` (fold state, badges, `$persist`), `session` (caller, admin, caps, `/info`), `theme`.
- **Partials** are `x-data` free HTML with a documented args header, called from views as `view( view:"_components/ui/card", args:{...} )`; in the baked file they are expanded at bake time. Dialogs use `<dialog>` with an `x-dialog` directive (focus trap and return).
- **Page component** is `Alpine.data( "connectorsPage", factory )`, one per page, with `init()`, `destroy()` and JSDoc on every member.
- **Security rules:** no generator or server values inside `x-`, `:` or `@` attributes (they run as code). `x-html` only through `$md` (marked plus DOMPurify). A spec enforces both. The chat transcript and extension slots use `x-ignore`.
- **Extension contract:** `window.bxagents` and the slots keep working. We add a spec that loads a sample extension.

## 7. Dev workflow (target)

```
cd ui
box install && npm install
box server start          # ColdBox dev app on :8080, fixture API included
npm run dev               # Vite HMR on :5173
npm run lint && npm run lint:scss && npm test && npm run e2e
npm run build             # dist/ for the generator
```

One command alternative: `npm run dev:all`. `UI_API=...` switches to a real agent.

## 8. Phases and tasks

| # | Phase | Exit criteria | Days |
|---|---|---|---|
| 0 | **Safety net.** Playwright smoke suite against today's UI. Needs your OK to delete the six legacy dialogs in `index.html` (they become links to the pages). | Suite green on the current UI. Chat file 1,100 lines smaller. | 3 |
| 1 | **Dev app skeleton.** `ui/` with ColdBox, Router, layouts, Vite, Sass order, ESLint and Stylelint, fixture API, `AGENTS.md`, skills. | `server start` plus `npm run dev` shows an empty shell with menu and theme. | 4 |
| 2 | **Foundation.** Stores, `$api`, `$confirm`, `$toast`, `$md`, `x-icon`, `x-dialog`, partials (page-head, tabs, card, chip, empty, modal, drawer, field, switch, status). Unit tests. | Each partial has a spec and a storybook-style page `/_kit` in the dev app. | 5 |
| 3 | **Small pages:** data, logs, gateways, settings. | Same behaviour as today, Playwright passes. | 3 |
| 4 | **Medium pages:** access, vault, registry, conversations. | as above | 4 |
| 5 | **Large pages:** memory, routines, agent, connectors. | as above | 6 |
| 6 | **Chat.** Sidebar, header, composer and panels are reactive. The streaming transcript stays imperative inside an `x-ignore` island. | Streaming, approvals, attachments, talk-to, recording pass e2e. | 7 to 9 |
| 7 | **Generator.** `WebUiGenerator` takes `dist/` (option A: bake, tokens kept). Rewrite the 232 fragment assertions in `WebUiGeneratorSpec` toward a contract (ids, tokens, registered components, `x-html` allow list). | Built agent serves the new UI. Extension spec passes. | 4 |
| 8 | **Remove the old UI, docs, release.** Delete `shell.js`, `pages/*.js`, old `index.html`. Update `web-ui.md` (it says "no AlpineJS"), add `docs/guides/ui-development.md`, changelog, re-record screenshots and the trailer. | CI green. | 3 |

Total about 40 to 45 working days, in order. Phases 0 to 2 are the part that makes iterating pleasant, about 12 days, and can ship as their own PR before any page moves.

## 9. Risks

- **Size of the chat (phase 6).** Mitigation: islands, and Playwright first.
- **Bundle size.** Alpine plus plugins is about 55 KB (to measure), and no Bootstrap keeps us near today's size. A budget check in CI.
- **Offline promise.** No CDN, no network at runtime. The check is a spec that greps the built file for `http` references.
- **Two UIs during the move.** Pages move one by one behind the same router, so there is never a half converted page. The old shell is deleted only in phase 8.
- **Extension authors.** `window.bxagents` and slots are frozen in phase 0 by a spec before we touch them.

## 10. Questions

1. D1: A (bake) or B (real views)?
2. May I delete the legacy dialogs in `index.html` (phase 0)? It conflicts with "nothing removed" in the revamp plan.
3. Is the Bootstrap-free Sass port (D4) right, or do you want Bootstrap like cbGenesis?
4. Should phases 0 to 2 ship as their own PR first?
