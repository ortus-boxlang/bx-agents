# embed-agent

A docs agent on **another website**. An admin defines an [embed](../../docs/conventions/embeds.md) in the web app, pastes one script tag on the docs site, and visitors (not signed in) chat with the agent there. A visitor can only ask questions and can only use the tools the embed lists: here, the stand-in `docs_search` tool in [`tools/DocsSearch.bx`](tools/DocsSearch.bx), which reads the markdown files in [`docs/`](docs).

```bash
export EMBED_ADMIN_TOKEN=change-me
bxAgents build
bxAgents serve                    # http://127.0.0.1:8080 , the web app is at /chat
```

## Show it (about three minutes)

1. Open <http://127.0.0.1:8080/chat/embeds>. The page asks for the key once: type `change-me`. **New embed**.
2. Name it `Docs helper`. Under **Look and text** set a title and a welcome message and watch the preview change as you type. Under **What visitors can use** tick only `docs_search`. Under **Allowed websites** add `http://127.0.0.1:9100` (try `https://*.example.com` first: it is refused). **Save**.
3. In the **Snippet** panel pick **HTML** and **Copy**. Put the embed's id in [`site/index.html`](site/index.html), then serve that folder as the "other website": `python3 -m http.server 9100 --directory site`, and open <http://127.0.0.1:9100>.
4. Click the bubble, ask `How do I install it?`. The answer streams in; the tool row shows `docs_search` running.
5. Back on the Embeds page the **Last 7 days** panel shows the messages. Ask from a website that is not listed (`python3 -m http.server 9200 --directory site`, open it): no bubble appears.
6. **Rotate key** and **Disable** both ask first.

The same from a terminal: `bxAgents embed create --name="Docs helper" --origin=http://127.0.0.1:9100 --tools=docs_search`.

The `mock` model answers with canned text. To see real answers put a `provider/model` slug in `Agent.yml`, or run the scripted model of the talk kit (`tools/demo/fakellm.bxs`) and point the `openai-compatible` provider at it, as [`examples/demo.md`](../demo.md) shows. The Origin check keeps other websites' pages out of the chat; it is **not** authentication (a script can send any `Origin`), so what protects the agent is the tool list and the limits: do not tick a tool you would not let a stranger run.
