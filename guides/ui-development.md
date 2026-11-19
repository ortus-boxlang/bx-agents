---
title: "Guide: Work on the Web App"
icon: phosphor-duotone:code
summary: How the web app is built, how to run it with a scripted agent, its conventions, and how to add a page with its tests.
description: The bxagentsui ColdBox module and the ui/ folder, npm run dev, stack and build, the dev agent and its scripted model, the conventions, the building blocks, adding a page, linters, tests and proof media.
tags: [guides, web-ui, contributing]
---

# Guide: Work on the Web App

This guide is for people who change the [web app](../conventions/web-ui.md) itself, in this repository. To use the app in an agent you need none of it: `bxAgents build` installs it, already built.

The app is a ColdBox module, `bxagentsui`, built the cbGenesis way: handlers, views and partials in BoxLang, and the scripts and styles (Alpine.js and Sass) built by Vite. It is a client of the [agent API](agent-api.md): a handler picks a view, and the page's Alpine component reads its data from `/__bxagents`.

The rules and the full tables of building blocks are in [`ui/AGENTS.md`](https://github.com/ortus-boxlang/bx-agents/blob/development/ui/AGENTS.md). Read it before you change the app. This guide is the tour.

## Where things are

| Part | Path |
|---|---|
| The module: `ModuleConfig.bx`, `config/Router.bx`, `handlers/`, `layouts/`, `views/`, `models/` | `src/main/bx/bxagentsui/` |
| Partials | `src/main/bx/bxagentsui/views/_components/{app,ui}/` |
| Sass: tokens, base, layouts, components, views, in that order | `ui/resources/assets/scss/` |
| Alpine: `App.js`, `stores/`, `components/<domain>/`, `utils/` | `ui/resources/assets/js/` |
| The Vite build, committed | `src/main/bx/bxagentsui/includes/build/` |
| The dev agent and its scripted model | `ui/dev/agent/`, `ui/dev/model.json` |
| Project shapes (other paths, a password, no accounts) | `ui/dev/shapes/` |
| Browser tests | `ui/tests/e2e/`, `ui/tests/shapes/` |
| Tours for screenshots and video | `ui/tests/media/` |

## How an agent gets it

For each `gateways/*.bx` entry with `exposes: "webui"`, the build (`WebAppModule`) copies the module to `<app>/modules/bxagentsui` and writes `config/bxagentsui.json`: where the app is mounted (`basePath`, the entry's `path`), where the agent API is (`apiBase`), the branding, the theme, and the files of the project's extensions. `ModuleConfig.bx` reads that file when ColdBox registers the module, so the module answers at the entry's path.

The build of the scripts and styles is committed in `includes/build`. An agent build never runs Node, so a change to a script or a style ships only once `npm run build` has run and its output is committed.

With `BXAGENTS_UI_LINK=true` the build links the module instead of copying it, so a change to a view shows on the next request. `npm run stack` sets it. Only a linked module serves `<path>/_kit`, a page with every partial and magic working; a built agent answers 404 there.

## Set it up once

From the repository root:

```bash
./gradlew downloadBoxLang downloadMiniServer shadowJar
cd ui && npm install
npx playwright install chromium     # if you have no Playwright browser yet
```

## Run it

```bash
npm run dev        # the dev agent, its model and the Vite dev server
npm run stack      # the dev agent and its model only, with the committed build
```

The app is at http://127.0.0.1:8780/chat. Sign in as `ada` (an admin) or `bob` (a member), password `demo-pass`.

In `npm run dev` a change to a view or a layout shows on reload, and a change to the Sass or a script reloads the page by itself. A change to a handler, a model or `ModuleConfig.bx` needs the stack restarted (Ctrl+C, then `npm run dev` again). `npm run dev -- --no-build` starts without building the agent again.

### The dev agent and its scripted model

The dev agent is `ui/dev/agent`, built and served by this repository's own bxAgents. Its model is scripted: `ui/dev/model.json`, served by `tools/demo/fakellm.bxs`. Nothing needs a key or the network.

| Ask | You get |
|---|---|
| "what time is it" | a call to the `now` tool, then the answer |
| "give me a list" | Markdown: a numbered list and a code block |
| anything else | a plain answer that names the model |

The agent has two profiles (`fast`, `planner`), notes, a vault, routines and one folder extension, `panel` (see [extensions](../conventions/extensions.md#a-worked-example-the-panel-extension)). It keeps its data in `ui/.stack/home`: delete that folder to start fresh. `UI_AGENT_PORT` and `UI_LLM_PORT` move the ports (8780 and 8080).

## Build

```bash
npm run build      # writes src/main/bx/bxagentsui/includes/build
```

Commit the build with the change that needs it.

## Conventions

The full list is in `ui/AGENTS.md`. In short:

- **Handlers are thin.** They pick the layout and the view and check who may see the page. The data comes from the agent API through the page's Alpine component. No business logic in a handler.
- **Partials document their args** in a header comment and declare each one with `<bx:param name="args.x" default="..."/>`. Call one with `view( view = "_components/ui/name", module = "bxagentsui", args = { ... } )`.
- **Escape what the server writes** with `encodeForHTML()`. Data for the scripts goes through `PageData.json()` into a `<script type="application/json">` block, never into a script.
- **No server value inside `x-`, `:` or `@` attributes.** They run as code. Put the value in a `data-` attribute and read it in the expression (`$el.dataset.x`) or in `init()`.
- **Every colour is a token** in `abstracts/_tokens.scss`, so the dark theme and the gateway's `theme` block work.
- **One Alpine factory per file**, registered in `App.js` with `Alpine.data( "name", factory )`, with JSDoc on every function, getter and store member.
- **Bind boolean attributes to a real boolean** (`:disabled="!!t.locked"`), never to a value that can be `undefined` or `null`.
- **Accessible by default:** a skip link, a visible focus ring, dialogs that hold and give back the focus, and an `aria-label` on an icon-only button that starts with its visible text, if it has any.
- **A change needs a test:** a browser test for what a person sees, a TestBox spec for BoxLang code.

## The building blocks

Use these before you write markup or logic of your own. `ui/AGENTS.md` has each one with its args.

| Partial (`views/_components/ui/`) | What it is |
|---|---|
| `page-head` | A page's title, a line under it and its actions |
| `tabs` | A row of tabs (an ARIA tablist) bound to a component variable |
| `search` | A search box with a debounce |
| `chip` | A state or a count (`ok`, `warn`, `bad`) |
| `card` | A box that holds another view |
| `field` | Label, control, help line and error line |
| `switch` | An on and off toggle, a real checkbox |
| `modal`, `drawer` | A native `<dialog>`, centred or at the side, that holds another view |
| `table` | A table that scrolls on a phone, rows from Alpine |
| `empty` | What a list shows when it has nothing |
| `icon` | One icon of the set |
| `toasts`, `confirm` | In the layout once: the message region and the question dialog |

| Magic or store | What it does |
|---|---|
| `$api.get( path )`, `$api.post( path, body )` | Calls the agent API. Answers `{ ok, status, data, error }`, never throws |
| `$sse( path, { body, onEvent, signal } )` | A stream of the agent API |
| `$confirm( { title, body, danger } )`, `$prompt( { title, label, value } )` | The app's own dialogs; never `window.confirm` or `window.prompt` |
| `$toast.success( text )`, `$toast.error( text )` | A short message |
| `$md( text )` | Markdown as safe HTML, the only input `x-html` takes |
| `$fmt` | Dates, sizes and counts, the same everywhere |
| `$tabKeys( $event )` | The arrow, Home and End keys of a tab row |
| `$store.session` | What this person may use: `can( capability )`, `agentName`, `agents`; `await loaded()` first in `init()` |
| `$store.theme`, `$store.appearance`, `$store.nav` | Light or dark; accent, text size and density; the folded menu and the phone drawer |
| `$store.password` | The password of an agent without accounts, sent with every call |

`window.bxagents` is the extensions' contract, see [extensions](../conventions/extensions.md#the-bxagents-object).

## Add a page

A page is a route, a menu entry, a handler, a view and an Alpine component. Say the page is `reports`.

1. **The route.** In `config/Router.bx`, add `route( "/reports" ).to( "Reports.index" )` above the last route. The last route sends every other address to `Main.missing`, which answers 404.
2. **The menu.** In `models/Menu.bx`, add the page to `PAGES`: `{ id : "reports", title : "Reports", icon : "chart-line", group : "main", capability : "" }`. The left menu draws itself from that list. `capability` is the capability of `GET /agent` the page needs (`""` for everybody, `"a|b"` for either, `"~a"` for "unless `a` is false"). A page in the `admin` group answers 403 to a member who is signed in.
3. **The handler.** `handlers/Reports.bx` extends `BaseHandler` and has one `index()`:

    ```text
    class extends="BaseHandler" {

    	function index( event, rc, prc ) {
    		showPage( event, prc, "reports", "reports/index" )
    	}

    }
    ```

    `showPage()` answers 404 for a page that is not in the menu and 403 for an admin page to anybody else, so every page follows the same rule.

4. **The view.** `views/reports/index.bxm` starts with `<div class="pg" x-data="reportsPage">` and the `page-head` partial. A value the component needs from the server goes in a `data-` attribute, escaped with `encodeForHTML()`.
5. **The component.** `ui/resources/assets/js/components/reports/ReportsPage.js` exports one factory, `reportsPage()`, registered in `App.js` with `Alpine.data( "reportsPage", reportsPage )`. It reads its data with `$api` in `init()`. A tab or a filter the address should keep goes through `keepInAddress()` (`utils/address.js`).
6. **The styles**, if the partials are not enough: a file under `scss/views/`, used in `app.scss`, with tokens for every colour.
7. **The tests.** Add `"reports"` to `PAGES` in `ui/tests/e2e/a11y.spec.js` (and to `MEMBER_PAGES` when a member sees it), and write a browser test in `ui/tests/e2e` for what a person does on the page. Run `npm run e2e:shapes` too: a change to routes, paths or the frame must work under every project shape.
8. **The build.** `npm run build`, and commit `includes/build` with the change.

A change to the router, the menu or a handler needs the stack restarted.

## Lint

```bash
npm run lint       # ESLint, the scripts (lint:fix fixes what it can)
npm run lint:scss  # Stylelint, the Sass (lint:scss:fix)
npm run lint:md    # markdownlint: docs/, changelog.md, readme.md and the notes in ui/
```

The rules are cbGenesis': `eslint.config.mjs`, `.stylelintrc.json`, and `.markdownlint.json` and `.bxlint.json` at the repository root. CI fails on any finding.

## Test

```bash
npm test             # the unit tests of the scripts (Vitest)
npm run e2e          # every browser test, against a stack it starts (or the one already running)
npm run e2e:headed   # the same, with the browser on screen
npm run e2e:shapes   # every page under other project shapes
```

The browser tests sign in once as each account, start every chat test on a new conversation, and fail on any error the page throws. Two of them check the whole app:

- `a11y.spec.js` runs axe-core (WCAG 2.2 AA) on every page, as an admin and a member, light and dark, desktop and phone, and with the dialogs open. A serious or critical finding fails.
- `keyboard.spec.js` checks the skip link, a visible focus ring on every Tab stop, dialogs that hold and give back the focus, and reduced motion.

`npm run e2e:shapes` builds the dev agent again for each folder of `ui/dev/shapes`, serves them side by side on ports 8791 and up, and checks that every page answers, draws its frame, links its files and extensions under its path, and talks to its API:

| Shape | Path | Sign in |
|---|---|---|
| `open-support` | `/support` | none, an open API, a Phosphor icon and a theme accent |
| `password` | `/chat` | the API's shared secret, with the password dialog |
| `nested-api` | `/team/assistant` | none, with the agent API at `/team/api` |

Add a folder to `ui/dev/shapes` (a `gateways/chat.bx` and a `shape.json`) to test another shape.

## Proof on a pull request

Each pull request that changes the app carries screenshots and a short video of the change. Write a tour in `ui/tests/media/<name>.tour.js` that walks the flow and calls `shot( "what-it-shows" )` at each step. Then, with the stack running:

```bash
npm run media -- <name>      # .stack/media/<name>/: NN-*.png, tour.mp4, tour.gif
```

Publish the folder on the `pr-media` branch, never on a code branch, under `<pr-number>/`, and link the files in the pull request: the GIF and the screenshots show inline, the MP4 is a link.
