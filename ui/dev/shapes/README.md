# Project shapes

Each folder is the dev agent (`ui/dev/agent`) with a few files changed, built and served by `scripts/shapes.mjs` so that
`npm run e2e:shapes` can open every page of the web app over a real server, in each way a project can mount it:

| Shape | Path | Sign in | What else |
|---|---|---|---|
| `open-support` | `/support` | none, open API | a Phosphor icon, a theme accent, no users |
| `password` | `/chat` | the API's shared secret (`apiKeyEnvVar`) | the password dialog |
| `nested-api` | `/team/assistant` | none | the agent API at `/team/api` instead of `/__bxagents` |

The dev agent itself (accounts, at `/chat`) is what `npm run e2e` drives. A shape's `shape.json` says which lines of
`Agent.yml` it changes and which environment variables its server gets.
