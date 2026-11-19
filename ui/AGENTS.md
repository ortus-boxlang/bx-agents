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
| Tours for screenshots and video | `ui/tests/media/` |

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

## The building blocks

Use these before writing markup or logic of your own; `/chat/_kit` (a dev build) shows each one working.

| Partial (`views/_components/ui/`) | What it is | Main args |
|---|---|---|
| `page-head` | A page's title, a line under it, actions | `title`, `note`, `actions` |
| `tabs` | A row of tabs bound to a component variable | `label`, `model`, `tabs: [ { id, label, icon, count } ]` |
| `search` | A search box with a debounce | `label`, `model`, `debounce` |
| `chip` | A state or a count | `text`, `kind` (ok, warn, bad), `icon` |
| `card` | A box holding another view | `title`, `contentView`, `contentArgs` |
| `field` | Label, control, help line, error line | `id`, `label`, `type`, `model`, `help`, `error`, `options` |
| `switch` | An on and off toggle (a real checkbox) | `label`, `model`, `disabled` |
| `modal` | A native `<dialog>` holding another view | `title`, `open`, `contentView`, `contentArgs`, `icon` |
| `drawer` | A side panel `<dialog>` holding another view | `title`, `open`, `contentView`, `contentArgs` |
| `table` | A table that scrolls on a phone, rows from Alpine | `caption`, `columns`, `rows`, `rowView` |
| `empty` | What a list shows when it has nothing | `icon`, `title`, `text` |
| `icon` | One icon of the set | `name` |
| `toasts`, `confirm` | In the layout once: the message region and the question dialog | none |

The app partials (`views/_components/app/`) are `includes`, `sprite`, `sidebar` and `topbar`.

| Magic and store | What it does |
|---|---|
| `$api.get( path )`, `$api.post( path, body )` | `{ ok, status, data, error }`, never throws |
| `$sse( path, { body, onEvent, signal } )` | A stream of the agent API (`/stream`, `/events`, `/resume`) |
| `$confirm( { title, body, danger } )` | `Promise<boolean>`; never `window.confirm` |
| `$prompt( { title, label, value } )` | `Promise<string|null>` (null on Cancel); never `window.prompt` |
| `$toast.success( text )`, `$toast.error( text )` | A short message |
| `$md( text )` | Markdown as safe HTML: the only input `x-html` takes |
| `$fmt.stampText`, `dayText`, `bytesText`, `countLabel` | Dates, sizes and counts, the same everywhere |
| `$store.session` | `can( capability )`, `capabilities`, `agentName`, `agents`, `ready`; `await loaded()` before deciding by a capability in `init()` |
| `$store.theme`, `$store.nav` | Light or dark; the folded menu and the phone drawer |
| `$store.appearance` | Accent, text size, density (kept in this browser) |
| `$store.password` | The password of an agent without accounts: sent with every call (`utils/api.js`); a refusal asks once |
| `window.bxagents` | The extensions' contract (`utils/extensions.js`): made at load, before their deferred scripts run |

| Page | Handler | View | Component |
|---|---|---|---|
| Chat (the conversations, the transcript, the composer) | `Main.index` | `views/main/index`, `views/chat/` | `components/chat/ChatPage.js`, `utils/turn.js` |
| Data and backups | `Data.index` | `views/data/` | `components/admin/DataPage.js` |
| Logs (`/logs/:area?q=`) | `Logs.index` | `views/logs/` | `components/admin/LogsPage.js` |
| Gateways | `Gateways.index` | `views/gateways/` | `components/admin/GatewaysPage.js` |
| Settings | `Settings.index` | `views/settings/` | `components/settings/SettingsPage.js` |
| Access (`/access/:tab`) | `Access.index` | `views/access/` | `components/admin/AccessPage.js` |
| Registry (`/registry/:tab`) | `Registry.index` | `views/registry/` | `components/registry/RegistryPage.js` |
| Vault (`?ask=&scope=&why=`) | `Vault.index` | `views/vault/` | `components/vault/VaultPage.js` |
| Conversations (`?q=&agent=&source=`) | `Conversations.index` | `views/conversations/` | `components/conversations/ConversationsPage.js` |
| Memory | `Memory.index` | `views/memory/` | `components/memory/MemoryPage.js` |
| Agent (`/agent/:tab`) | `Agent.index` | `views/agent/` | `components/admin/AgentPage.js` |
| Routines (editor and reports in `modal`) | `Routines.index` | `views/routines/` | `components/routines/RoutinesPage.js` |
| Connectors (`/connectors/:tab`, connect in `modal`, tools in `drawer`) | `Connectors.index` | `views/connectors/` | `components/connectors/ConnectorsPage.js` |

A page handler is one `index()` that calls `showPage( event, prc, id, view )` (BaseHandler): 404 for an unknown page,
403 for an admin page to anybody else. Server values a component needs go in `data-*` attributes, read in `init()`.
A tab or filter the address should keep: `keepInAddress( path, query )` (`utils/address.js`). A file from the API:
`downloadFile( $api, path, name )` (`utils/download.js`). To open a conversation or talk to an agent in the chat, use
`openInChat` or `talkTo` (`utils/chat.js`), which use `config.chatUrl`.

Bind `:disabled`, `:checked` and other boolean attributes to a real boolean (`!!t.locked`), never to a value that can be
`undefined` or `null`: in a list rendered by `x-for` that once disabled every switch.

## Proof on every pull request

Each pull request carries screenshots and a short video of what it changes. Write a tour in `tests/media/<name>.tour.js`
(walk the flows, call `shot( "what-it-shows" )` at each step), then with the stack running:

```
npm run media -- <name>          # .stack/media/<name>/: NN-*.png, tour.mp4, tour.gif
```

Publish the folder on the `pr-media` branch (never on a code branch) under `<pr-number>/`, and link the files in the
pull request: the GIF and the screenshots show inline, the MP4 is a link.

## Commands (from `ui/`)

`npm run dev` (agent, model and Vite), `npm run stack` (agent and model only), `npm run build`, `npm run lint`,
`npm test` (unit), `npm run e2e` (browser). A change to a handler, a model or `ModuleConfig.bx` needs the stack restarted; views, Sass and JS do not.
