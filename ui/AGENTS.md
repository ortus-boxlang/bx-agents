# The web app: conventions

The web app is a ColdBox module, `bxagentsui`, built the cbGenesis way. Read this before changing it.

## Where things are

| Part | Path |
|---|---|
| The module: `ModuleConfig.bx`, `config/Router.bx`, `handlers/`, `layouts/`, `views/`, `models/` | `src/main/bx/bxagentsui/` |
| Partials (cbGenesis `_components`) | `src/main/bx/bxagentsui/views/_components/{app,ui}/` |
| Sass (tokens, base, layouts, components, views, in that order) | `ui/resources/assets/scss/` |
| Alpine (one `App.js`, `stores/`, `components/<domain>/`, `utils/`) | `ui/resources/assets/js/` |
| Vite output, committed so an agent build needs no Node | `src/main/bx/bxagentsui/includes/build/` |
| The dev agent and its scripted model | `ui/dev/` |
| Browser tests | `ui/tests/e2e/` |

A built agent copies the module to `modules/bxagentsui` and writes `config/bxagentsui.json` (see
`src/main/bx/models/build/generators/WebAppModule.bx`). The module mounts itself at `basePath` from that file.

## Rules

- **Handlers are thin.** They pick the layout and the view and check who may see the page. Data comes from the agent
  API (`/__bxagents`) through the page's Alpine component. No business logic in a handler.
- **Partials document their args** in a header comment and declare each with `<bx:param name="args.x" default="..."/>`,
  as in cbGenesis. Call them with `view( view = "_components/ui/name", module = "bxagentsui", args = { ... } )`.
- **Escape everything the server writes:** `encodeForHTML()` in views (BoxLang has no `encodeForHTMLAttribute`).
  Data for the scripts goes through `PageData.json()` into a `<script type="application/json">` block, never into a
  script or an Alpine attribute.
- **No server value inside `x-`, `:` or `@` attributes.** They run as code. Put the value in a `data-` attribute and
  read it from the expression (`$el.dataset.x`), as the menu does.
- **One Alpine factory per file**, registered in `App.js` with `Alpine.data( "name", factory )`. JSDoc on every function,
  getter and store member.
- **Every colour is a token** in `abstracts/_tokens.scss`, so the dark theme and the gateway's theme block work.
- **A change needs a test:** a browser test in `ui/tests/e2e` for what a person sees, a TestBox spec for BoxLang code.

## Commands (from `ui/`)

`npm run dev` (agent, model and Vite), `npm run stack` (agent and model only), `npm run build`, `npm run lint`,
`npm run e2e`. A change to a handler, a model or `ModuleConfig.bx` needs the stack restarted; views, Sass and JS do not.
