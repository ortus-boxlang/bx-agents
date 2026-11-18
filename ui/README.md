# The BX Agents web app: development and tests

Everything here runs offline: the agent is `dev/agent`, built and served by this repository's own bxAgents, and its model
is scripted (`dev/model.json`, served by `tools/demo/fakellm.bxs`). No key, no network.

## Once

From the repository root:

```bash
./gradlew downloadBoxLang downloadMiniServer shadowJar
cd ui && npm install
```

`npx playwright install chromium` if you do not have a Playwright browser yet.

## Run it

```bash
npm run stack      # builds dev/agent and serves it at http://127.0.0.1:8780/chat (ada or bob, password demo-pass)
```

`ada` is an admin, `bob` a member. Ask "what time is it" for a tool call, "give me a list" for Markdown, anything else
for a plain answer. The agent keeps its data in `.stack/home`: delete it to start fresh. `UI_AGENT_PORT` and
`UI_LLM_PORT` move the ports (8780 and 8080).

## Test it

```bash
npm run e2e          # every browser test, against a stack it starts (or the one you already started)
npm run e2e:headed   # the same, with the browser on screen
```

The tests are in `tests/e2e`. They sign in once as each account (`global-setup.js`), start every chat test on a new
conversation, and fail on any error the page throws. CI runs the same suite.
