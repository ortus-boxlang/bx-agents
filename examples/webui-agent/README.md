# webui-agent

An agent reachable through BxAgents' web app: a left menu with thirteen pages (chat, conversations, routines, registry, connectors, memory, vault, settings and, for admins, agent, gateways, logs, access, data), generated for free from a `gateways/*` entry with `exposes: "webui"`.

```bash
bxAgents build
bxAgents serve --port=8080
```

Open **http://localhost:8080/chat** in a browser and start chatting. Replies stream in token by token via the agent API's `/__bxagents/stream` SSE route. `serve` stays in the foreground; press Ctrl+C in its terminal to stop the server.

`gateways/chat.bx` can also set `suggestions` (up to four buttons on an empty conversation) and an `icon`, as an emoji, an image or `phosphor:<name>`.

## How it's wired

- `path: "/chat"` is where the app is served. The page itself calls the agent API at `/__bxagents`, the same one the terminal chat and the gateways use, which derives the visitor's identity server-side only rather than trusting a caller-supplied `userId` the way `toAi()` does - see [Conversation identity](../../docs/conventions/web-ui.md#conversation-identity).
- `apiKeyEnvVar` is **optional** - it is the agent API's shared secret, not a full login system. This example ships it **set** (`CHAT_UI_API_KEY`), so every call to `/__bxagents` requires a matching `x-bxagents-token` header. The app's pages stay reachable regardless, since a browser's plain page navigation can't send a custom header, and the page is what prompts you for the key. Delete the `apiKeyEnvVar` line entirely to leave the UI open instead (fine for local dev, not for a public deployment). **If the variable is named but not set, every API call is refused with a 401**, so export it before `serve`.

```bash
export CHAT_UI_API_KEY="a-real-secret"
bxAgents build
bxAgents serve --port=8080
```

A call without the matching key gets a 401 and the page opens its **Password** form by itself. Type `a-real-secret` and choose **Save**; the browser keeps it in `localStorage` until you choose **Forget it**. The form is also behind the key button in the header. For people with their own accounts, declare `users` on the entry instead.

The app is a full client: a conversation sidebar backed by a real SQLite store, streaming with reasoning and tool-call disclosures, human-in-the-loop approvals, steer-while-streaming, compaction, and server-side theming. See [The web app](../../docs/conventions/web-ui.md) for the full picture, and its [What is not here yet](../../docs/conventions/web-ui.md#what-is-not-here-yet) section for the real gaps.
