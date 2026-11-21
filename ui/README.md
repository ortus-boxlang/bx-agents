# The BX Agents web app: development and tests

Everything here runs offline: the agent is `dev/agent`, built and served by this repository's own bxAgents, and its model
is scripted (`dev/model.json`, served by `tools/demo/fakellm.bxs`). No key, no network.

## Once

From the repository root:

```bash
./gradlew downloadBoxLang shadowJar
cd ui && npm install
```

`npx playwright install chromium` if you do not have a Playwright browser yet.

## Run it

```bash
npm run dev        # the agent, its model and the Vite dev server: edit, save, see it
npm run stack      # the agent and its model only, with the committed build of the scripts and styles
```

The web app is at http://127.0.0.1:8780/chat (ada or bob, password demo-pass). It is a ColdBox module; its source is `src/main/bx/bxagentsui` (handlers, views,
partials) and `resources/assets` here (Sass and Alpine); `AGENTS.md` has the conventions. In `npm run dev` a view, a
Sass or a JS change shows on save; a handler or model change needs a restart.

`ada` is an admin, `bob` a member. Ask "what time is it" for a tool call, "give me a list" for Markdown, anything else
for a plain answer. The agent keeps its data in `.stack/home`: delete it to start fresh. `UI_AGENT_PORT` and
`UI_LLM_PORT` move the ports (8780 and 8080).

## Build and lint

```bash
npm run build      # writes src/main/bx/bxagentsui/includes/build, which is committed
npm run lint       # ESLint, the scripts (lint:fix fixes what it can)
npm run lint:scss  # Stylelint, the Sass (lint:scss:fix)
npm run lint:md    # markdownlint, docs/, changelog.md, readme.md and these notes
```

The rules are cbGenesis': `eslint.config.mjs` (its rules as they are), `.stylelintrc.json`, and `.markdownlint.json` and
`.bxlint.json` at the repository root. CI runs all three linters.

## Test it

```bash
npm run e2e          # every browser test, against a stack it starts (or the one you already started)
npm run e2e:headed   # the same, with the browser on screen
npm run e2e:shapes   # every page over a real server for other project shapes (below)
```

The tests are in `tests/e2e`. They sign in once as each account (`global-setup.js`), start every chat test on a new
conversation, and fail on any error the page throws. CI runs the same suite.

`npm run e2e:shapes` builds the dev agent again for each folder of `dev/shapes` (another web path and gateway icon, an
API password and no accounts, the agent API under a path of its own), serves them side by side on ports 8791 and up,
and checks every page of each: it answers, draws its frame with no error, links its files and extensions under that
path, and talks to that API. `scripts/shapes.mjs --no-build` serves them again without building. Add a folder to
`dev/shapes` (a `gateways/chat.bx` and a `shape.json`, see its README) to test another shape.
