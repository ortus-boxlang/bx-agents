# Demo script: four live demos with a local model

The presenter's script for showing BxAgents on stage with a model running on your own machine, through [LM Studio](https://lmstudio.ai). Every demo is a project from this folder, so there is nothing to write live: you copy an example, point it at LM Studio, and talk over what it does.

| # | Demo | Example | Model | Shows | Plan for |
|---|---|---|---|---|---|
| 1 | The smallest agent | [`minimal-agent`](minimal-agent) | `lfm3-1.7b` | One folder is an agent: a tool and a skill, in the terminal chat | 5 min |
| 2 | A team and two models | [`multi-agent-team`](multi-agent-team) | `qwen/qwen3.6-35b-a3b` and `lfm3-1.7b` | Subagents, a model per agent, profiles switched in the middle of a conversation | 6 min |
| 3 | The web app | the team of demo 2 | `qwen/qwen3.6-35b-a3b` | Thirteen pages, notes, an approval before the agent saves a skill, one memory for every door | 8 min |
| 4 | A platform | [`api-agent`](api-agent), optionally [`mcp-agent`](mcp-agent) | `qwen/qwen3.6-35b-a3b` | Access tokens, the HTTP API, the OpenAPI document, a BoxLang client, a hosted MCP server | 7 min |

Why these four, in this order: demo 1 is the whole idea in one screen and works with the smallest model; demo 2 adds composition, which is where a bigger model earns its keep; demo 3 shows the same agent as a product people can use; demo 4 shows it is a service other programs call. Each one builds on the one before without needing it to have worked (every folder is made in the setup below).

**Which model, and why.** Tool calling is the whole of every demo, so use models marked for tool use.

- `lfm3-1.7b` for demo 1 (tool use, reasoning) and as the researcher of demo 2: tiny, so the first answer is quick. If it does not call the tool, use `liquid/lfm2.5-1.2b` (tool use) or go straight to `qwen/qwen3.6-35b-a3b`.
- `qwen/qwen3.6-35b-a3b` for demos 2, 3 and 4: the multi-step work (delegating, saving a note, calling `skill_save` with three arguments) wants the bigger model. `google/gemma-4-26b-a4b-qat` is the first alternative. The names suggest that both are mixture-of-experts models with a few billion active parameters, which would make them quick for their size; check the first answer on your machine.
- `recursivesi/flint` (40B) and `meta/muse-glimmer` (28B) are in the screenshot of loaded models too, but models of that size are likely to be slower on stage. Keep them for questions from the room.
- Keep only these two loaded in LM Studio during the talk (`lfm3-1.7b` and `qwen/qwen3.6-35b-a3b`), so no demo waits for a model to load.

What was and was not tested for this script is at the end, in [What was tested](#what-was-tested). In short: every command here was run against a scripted stand-in for LM Studio, not against LM Studio itself, so the model-dependent parts below say what to expect loosely.

## What you need

| Need | Check |
|---|---|
| BoxLang 1.18.0 or later | `boxlang --version` |
| The BxAgents module | `bxAgents --version` prints `bxAgents v1.0.0-snapshot` or the release you installed (install with `install-bx-module bx-agents`) |
| `boxlang-miniserver` on the `PATH` (demos 3 and 4 use `serve`) | `boxlang-miniserver --help`, or `which boxlang-miniserver` |
| LM Studio, a model loaded, and its local server started | the pre-flight `curl` below |
| This repository checked out (for the examples) | `ls "$BXA_REPO/examples"` |
| Free ports `8080`, `8081` and `8082` (the demos' servers) | nothing else listening there |
| `perl`, `curl`, and a terminal font of 20 points or more | `perl -v` |

LM Studio listens on port `1234`, and it serves the OpenAI protocol under `http://127.0.0.1:1234/v1`.

`perl` is only for the one-line edits of the setup (macOS and Linux have it; on Windows edit the lines by hand). Nothing here has been tried on Windows or macOS.

## How BxAgents is pointed at LM Studio

LM Studio speaks the OpenAI chat protocol, so the provider is `openai-compatible` and the model is the id LM Studio lists, written as a slug: `openai-compatible/<id>`. The id may itself contain a slash (`qwen/qwen3.6-35b-a3b`): the slug is split on the first slash only.

The provider's default address is `http://localhost:8080/v1`, **not** LM Studio's `1234`, so without more lines the agent calls whatever is on port 8080 (or nothing: `Connection Failure`). Say where LM Studio is under `providers:` in `Agent.yml`, which applies to every agent and profile that uses that provider:

```yaml
name: minimal-agent
model: openai-compatible/lfm3-1.7b

providers:
  openai-compatible:
    options:
      baseURL: http://127.0.0.1:1234/v1
      timeout: 300
```

- `baseURL` is the address up to and including `/v1`. The provider adds `/chat/completions`.
- `timeout` is in seconds and is how long a streamed answer may stay silent before the call is given up (the default is 90). A model that has to be loaded first can be silent for longer, so 300 is a safe stage value. It was measured: with `timeout: 2` and a model that waits 6 seconds, the chat stops with `The stream was idle for more than 2 second(s) without receiving data`.
- A top-level `options:` with the same keys also works, but it only applies to the default provider. `providers:` is the one to use.
- There is no environment variable for it. `baseURL: ${env.LMSTUDIO_URL:...}` is **not** expanded here (it fails with `Input [URL] for component [HTTP] must start with 'http://' or 'https://'`), so write the address out.
- No key is needed: with none set, no `Authorization` header is sent.
- After editing `Agent.yml`, run `bxAgents build` again.

The model id must be exactly one LM Studio lists, so copy it from the pre-flight check below.

## Before the day: make the four projects

Once, at your desk. It takes about a minute (three builds). Change the first four lines to your paths and models.

```bash
export BXA_REPO=~/src/bx-agents                  # this repository
export DEMO=~/bxagents-demo                      # where the demo projects go
export LMS=http://127.0.0.1:1234/v1              # LM Studio
export SMALL=lfm3-1.7b BIG=qwen/qwen3.6-35b-a3b  # the model ids, exactly as LM Studio lists them

mkdir -p "$DEMO"

# the lines that point a project at LM Studio
lmstudio() {
  printf '\nproviders:\n  openai-compatible:\n    options:\n      baseURL: %s\n      timeout: 300\n' "$LMS" >> "$1/Agent.yml"
}

# demo 1: the smallest agent
cp -R "$BXA_REPO/examples/minimal-agent" "$DEMO/hello"
perl -pi -e "s#mock/mock-model#openai-compatible/$SMALL#" "$DEMO/hello/Agent.yml"
lmstudio "$DEMO/hello"

# demos 2 and 3: the team (root and writer on the big model, researcher on the small one)
cp -R "$BXA_REPO/examples/multi-agent-team" "$DEMO/team"
perl -pi -e "s#mock/mock-model#openai-compatible/$BIG#" "$DEMO/team/Agent.yml" "$DEMO/team/subagents/writer/Agent.yml"
perl -pi -e "s#mock/mock-model#openai-compatible/$SMALL#" "$DEMO/team/subagents/researcher/Agent.yml"
lmstudio "$DEMO/team"

# demo 4: the API agent (the big model)
cp -R "$BXA_REPO/examples/api-agent" "$DEMO/api"
perl -pi -e "s#mock/mock-model#openai-compatible/$BIG#" "$DEMO/api/Agent.yml"
lmstudio "$DEMO/api"

# build them (the first build is the slowest)
for p in hello team api; do (cd "$DEMO/$p" && bxAgents build); done
```

Do not use a quoted value with spaces in a flag (`--description="two words"`) when you run `bxAgents` yourself: the BoxLang 1.19.0 launcher splits it at the space. Single words are fine, and so is anything you type inside the chat.

## Pre-flight: two minutes before you go on

Run these in order. Each says what OK looks like.

1. LM Studio's server answers, and lists your models:

   ```bash
   curl -s http://127.0.0.1:1234/v1/models
   ```

   OK: JSON with a `data` array whose `id` values include the two you set (`lfm3-1.7b`, `qwen/qwen3.6-35b-a3b`). Nothing printed or `Connection refused`: start the server in LM Studio and load the models. A list without your id: fix `SMALL` and `BIG` and the `model:` lines.

2. The project is healthy:

   ```bash
   cd "$DEMO/hello"
   bxAgents doctor
   ```

   OK: every line `[ OK ]` and `Everything checks out.` Doctor checks the project and the runtime. It does not call the model.

3. The model answers, through BxAgents, for the default model and for each profile:

   ```bash
   bxAgents models test
   cd "$DEMO/team" && bxAgents models test --all
   ```

   OK: a row per model ending in `ok` and a time, for example `default  OpenAICompatible/lfm3-1.7b  ok  396 ms` (a long id such as `qwen/qwen3.6-35b-a3b` is cut short and runs into the next column, which is only cosmetic). `FAILED ... Connection Failure` means nothing answers at the `baseURL` (wrong port, server off). Any other text is the reason the call failed: read it. Only bare `bxAgents models` is an error: it needs `list` or `test`.

4. Warm the big model once, so the first answer on stage is not the slow one:

   ```bash
   cd "$DEMO/api" && bxAgents invoke --message=hello
   ```

   OK: a short answer. The first call after loading a model can take a while. Nothing else needs warming: the chat in demo 1 uses the small model, which loads quickly.

5. Ports: `curl -s http://127.0.0.1:8080/__bxagents/health` must print nothing now (curl exits with 7, connection refused). If it answers, something is already serving there: use another port in the demo (`--port=8083`) or stop it.

6. Stage setup: font at 20 points or more, dark theme, notifications off, three terminal tabs (one for the chat, one to serve, one for curl), a browser window on a blank tab, and the [fallback](#if-everything-breaks) written down.

A rehearsal leaves data behind. The conversations and notes of an agent live in `~/.bxagents/<agent name>`, so a second run shows the first run's conversations. [Clean up](#clean-up) clears them, and you should do it after the dress rehearsal.

## Demo 1: the smallest agent (5 minutes)

**Goal.** One folder is an agent. A tool is a class in `tools/`, a skill is a folder in `skills/`, and the chat finds both with nothing registered anywhere. **Features.** `Agent.yml`, `tools/`, `skills/`, `bxAgents inspect`, `bxAgents chat`. **Model.** `lfm3-1.7b`.

**Say.** "This is the smallest complete agent: one file that says which model, one that says how to behave, one tool and one skill."

1. (0:45) Show the folder and the tool:

   ```bash
   cd "$DEMO/hello"
   ls
   cat Agent.yml
   cat tools/Greeter.bx
   cat skills/greeting/SKILL.md
   ```

   Point out: the tool is a plain class with one `@AITool` function, and the skill is a markdown file with a name and a description. Nothing lists them anywhere.

2. (0:30) Ask the project what it is made of:

   ```bash
   bxAgents inspect --section=agents,tools,skills
   ```

   Expect: one agent on `openai-compatible/lfm3-1.7b`, the tool `sayHello`, the skill `greeting`.

3. (0:30) Start the chat:

   ```bash
   bxAgents chat
   ```

   It takes a few seconds to draw the header (about 5 seconds in testing), so keep talking. The header has the agent's name and model, and a `skills` line that reads `greeting, 6 from bxAgents`: your skill and the six the framework ships.

4. (1:00) Type: `My name is Ada, please greet me.` The model decides to call the tool: a row appears, `sayHello name=Ada`, then the answer streams. Say: "The model chose to call my function, with the argument it pulled out of the sentence."

5. (0:45) Type `/tools`, then `/skills`. The tools line lists `sayHello` and the two the framework adds (`loadSkill`, `skill_save`). The skills list shows `greeting` as `project` and the six as `bxagents`, with the names lined up in a column.

6. (0:30) Type `/model`, then `/ping`. Say "that is the local model, and this is a one-token health check". Leave with `/exit`.

**Expect.** The tool row, a streamed answer that greets Ada, the list of tools and skills. The wording of the answer is the model's own and changes every time.

**If the tool is not called.** A small model sometimes answers without calling it. Ask again more plainly: `Use the sayHello tool for Ada.` If it still does not, say so ("that is a 1.7 billion parameter model, which is the point of the next demo"), and switch the demo to the big model: `perl -pi -e 's#openai-compatible/lfm3-1.7b#openai-compatible/qwen/qwen3.6-35b-a3b#' Agent.yml && bxAgents build`. If the first answer is slow, the model was loading: say so and wait, up to the `timeout` you set (300 seconds). If the chat says `HTTP Error ... idle for more than ...` then the timeout was too short or the server stopped.

## Demo 2: a team and two models (6 minutes)

**Goal.** Composition. A root agent hands work to subagents that are folders of their own, each can run on a different model, and you can switch the model of the whole conversation with one command. **Features.** `subagents/`, a model per agent, `profiles`, `/profile`. **Models.** `qwen/qwen3.6-35b-a3b` for the root and the writer, `lfm3-1.7b` for the researcher.

**Say.** "One agent is a folder. A team is folders inside the folder."

1. (0:45) Show the shape and who uses which model:

   ```bash
   cd "$DEMO/team"
   ls subagents
   cat Agent.yml
   cat subagents/researcher/Agent.yml
   bxAgents inspect --section=agents
   ```

   `inspect` draws the tree: the root and its two subagents, each with its model. The root lists them in `subAgents: [ researcher, writer ]`.

2. (0:45) Add a named model live. A profile is a name for a model, so it can be switched by name later:

   ```bash
   bxAgents add profile quick --provider=openai-compatible --model=lfm3-1.7b
   bxAgents build
   bxAgents models test --all
   ```

   Expect: `add profile` writes the `profiles:` block into `Agent.yml` and prints `Use it in an agent: profile: quick`; `models test --all` prints a row for `default` and one for `quick`, both `ok`. (Run `add profile` once only: a second run is refused because `quick` exists.)

3. (2:00) Start the chat and give it a task that needs both subagents:

   ```bash
   bxAgents chat
   ```

   Type: `Ask the researcher for three facts about BoxLang, then ask the writer to draft a two sentence summary of them.` Expect rows such as `delegate_to_researcher task=...` and `delegate_to_writer task=...`, each with a time, and then the root's answer. Say: "Each subagent is a tool on the root agent. The researcher ran on the small model, the writer on the big one."

4. (1:30) Switch the model in the same conversation: type `/profile quick`. It says `Now using quick (OpenAICompatible/lfm3-1.7b). The conversation carries on.` Ask something short that refers to the answer above ("Make it shorter."). Type `/model` to show the profile and the model, then `/default` to go back to the big one. Say: "Same conversation, same tools, only the model changed."

5. (0:30) Leave with `/exit`. Do not tidy the folder: demo 3 continues in it.

**Expect.** The researcher's call finishes quickly; the writer's call takes the longest. With the small model alone as researcher the facts may be thin or wrong: that is the model, and a good moment to say why you would put a bigger model on that subagent.

**If it does not delegate.** The root model answered by itself. Ask again by name: `Use the researcher tool to find three facts about BoxLang.` A subagent tool is called `delegate_to_<name>`. If the 35B model still answers alone, try `google/gemma-4-26b-a4b-qat` (change the three `model:` lines and `bxAgents build`). If a call fails with `Required argument task is missing`, the model called the subagent tool without its `task` argument: ask again.

## Demo 3: the web app (8 minutes)

**Goal.** The same agent as a product people open in a browser. **Features.** `gateways/` with `exposes: webui`, the thirteen pages, notes, human approval, one memory for the terminal and the web. **Model.** `qwen/qwen3.6-35b-a3b` (root).

**Say.** "One more file and the same folder is a web app."

1. (1:00) In the team folder, add the web app and the agent's notes, and serve it. Use a second terminal tab for the server:

   ```bash
   cd "$DEMO/team"
   bxAgents add gateway web --auth=open --yes
   printf '\nnotes: {}\n' >> Agent.yml
   bxAgents build
   bxAgents serve --port=8080
   ```

   `add gateway` writes `gateways/web.bx` (`exposes: "webui"`, `path: "/chat"`). The first line `serve` prints names the address and says it is bound to `127.0.0.1` only. **The command returns to the prompt after a second or two and the server keeps running**, and its start-up lines then print over the prompt. Wait 10 to 20 seconds for it to be ready (`curl -s http://127.0.0.1:8080/__bxagents/health` answers `{"success":true,"status":"ok"}`), and open the browser before anything else, because the first request is the slow one.

2. (1:30) Open `http://127.0.0.1:8080/chat` (the root address redirects there). Ask: `Ask the researcher for three facts about BoxLang.` Point at the left menu (Main: Chat, Conversations, Routines, Registry, Connectors, Memory, Vault, Settings; Admin: Agent, Gateways, Logs, Access, Data) and at the tool call under the message. Use the **Talk to** menu to pick the researcher and talk to it directly.

3. (1:30) Memory. Type: `Remember that I prefer short answers.` The agent calls `note_remember`. Open **Memory**: the note is under "About you". Say: "It will be in the prompt of every later conversation."

4. (2:00) Approval. Type: `Save a skill called short-answers that tells you to answer in at most two sentences.` The agent calls `skill_save`, which asks first: an approval card appears with Approve and Reject. Approve it, then open **Registry**, **Skills**: the new skill is listed as saved by the agent. Say: "It wrote a skill for itself, and nothing happened until a person said yes."

5. (1:00) Open **Conversations**. The conversation from demo 2 is there too, with its source `terminal`: the terminal and the web share one store. Then open **Agent** (an admin page) to show the agent, its model and its subagents.

6. (1:00) Stop here, or take a question. To stop the server: `pkill -f "$DEMO/team/.build"`.

**Expect.** Every menu entry opens (all thirteen pages were requested over HTTP and answered, but the page contents were not looked at in a browser). Replies stream as they are written. The approval card shows the action and Approve and Reject.

**Be straight with the room.** Open access (`--auth=open`) is for your own machine: anyone who can reach the port shares one workspace. For a team you declare `users` on the gateway, or a shared key (`apiKeyEnvVar`), see [`webui-agent`](webui-agent).

**If something goes wrong.** `Address already in use` (a stack trace after the prompt came back): something holds 8080, so `bxAgents serve --port=8083` and use that port in the browser. The page loads but the chat shows an error: the model is not answering, run `bxAgents models test` in the other tab. The model never calls `note_remember` or `skill_save`: say "this one needs a sturdier model", type `/remember I prefer short answers` in the terminal chat (the notes screen), or move on to the next step. `serve` printed `Press Ctrl+C to stop the server` but Ctrl+C does nothing, because the server runs on its own after the command returned: use the `pkill` line above.

## Demo 4: a platform (7 minutes)

**Goal.** The agent is also a service other programs call, safely. **Features.** Access tokens, the HTTP API, the OpenAPI document, `AgentApiClient` from BoxLang, the terminal chat against a served agent, and (optionally) a hosted MCP server. **Model.** `qwen/qwen3.6-35b-a3b`.

**Say.** "Everything you saw in the web app is an API. Here is the same agent behind a token."

1. (0:45) Show the whole configuration, then serve it. The admin secret comes from an environment variable, never from a file:

   ```bash
   cd "$DEMO/api"
   cat Agent.yml
   export TOKEN_FOR_ADMIN=change-me
   bxAgents serve --port=8081
   ```

   Read out `agentApi:` (`tokenEnvVar`, `tokens: true`, `manageTokens: true`). Wait 10 to 20 seconds for it to start (same note as in demo 3).

2. (1:15) In the curl tab, without and with the token:

   ```bash
   curl -s http://127.0.0.1:8081/__bxagents/whoami
   curl -s -H "x-bxagents-token: $TOKEN_FOR_ADMIN" http://127.0.0.1:8081/__bxagents/whoami
   ```

   Expect `Missing or invalid x-bxagents-token header` with `unauthorized`, then `"scope":"admin"`.

3. (1:15) Ask the agent a question over the API, then watch an answer stream:

   ```bash
   curl -s -H "x-bxagents-token: $TOKEN_FOR_ADMIN" -H "Content-Type: application/json" \
        -d '{"input":"In one sentence, what can you do?"}' http://127.0.0.1:8081/__bxagents/invoke
   curl -sN -H "x-bxagents-token: $TOKEN_FOR_ADMIN" -H "Content-Type: application/json" \
        -d '{"input":"Say it again, shorter."}' http://127.0.0.1:8081/__bxagents/stream
   ```

   The first answers one JSON object with `output`, `threadId` and `success`. The second is a server-sent event stream: a `thread` event, then a `chunk` event for each piece of the answer.

4. (1:15) The API describes itself:

   ```bash
   curl -s -H "x-bxagents-token: $TOKEN_FOR_ADMIN" http://127.0.0.1:8081/__bxagents/openapi | head -c 600
   ```

   Expect an OpenAPI 3 document that opens with `"openapi":"3.0.3"` and the title `api-agent agent API`. Say: "Point a code generator at it and you have a client." It describes every route of the agent API, dozens of them.

5. (1:30) Tokens: an admin makes one for another program over the API, and revokes it. Run the BoxLang client, which does exactly that:

   ```bash
   cd "$DEMO/api"
   AGENT_URL=http://127.0.0.1:8081 boxlang client.bxs
   ```

   Expect `Server is up: ok`, `Calling as: admin`, an answer, the streamed answer, a conversation count, `New token: bxa_... (shown once ...)` and `Revoked it.` Run it twice if you like: every run makes a token with a new name (`example-` and the time). Then show what is stored: `bxAgents token list`, which lists the revoked ones too.

6. (0:45) The terminal chat can talk to a served agent too:

   ```bash
   BXAGENTS_TOKEN=$TOKEN_FOR_ADMIN bxAgents chat --connect=http://127.0.0.1:8081
   ```

   Type a question, then `/exit`.

Optional, 2 minutes: hosting MCP. The `mcp-agent` example re-exposes its tool to any MCP client. It needs one gateway file to be reachable over HTTP, and it needs no model, so it works even when LM Studio does not:

```bash
cp -R "$BXA_REPO/examples/mcp-agent" "$DEMO/mcp" && cd "$DEMO/mcp"
mkdir -p gateways
cat > gateways/expose-mcp.bx <<'EOF'
class {
	function configure() {
		return { exposes: "mcp", path: "/mcp/tools", target: "localServer" };
	}
}
EOF
bxAgents build && bxAgents serve --port=8082
curl -s -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' http://127.0.0.1:8082/mcp/tools
```

Expect an `event: message` whose data lists the tool `search`. Say: "Any MCP client can use the agent's tools." Wait for the server as before: the `curl` fails while it is still starting, so run it again after a few seconds.

**If something goes wrong.** A `401` where you expected an answer: `TOKEN_FOR_ADMIN` is not set in the tab that started the server, so stop it (`pkill -f "$DEMO/api/.build"`), export the variable and serve again. `Address already in use`: change `--port` in the serve line and in every address after it. `HTTP 409` from `client.bxs`: you are on an old copy of the script that used a fixed token name, use the one from this repository. The API answers slowly the first time: the model is loading, say so.

## If everything breaks

The scripted model stands in for LM Studio for the whole show. It answers instantly with canned text, and calls the tools of these demos (`sayHello`, the researcher, `note_remember`, `skill_save`), so every demo still runs end to end. Say that it is scripted.

1. In a spare tab, start it on its own port so LM Studio is untouched (the script is `demo-model.json`, in this folder):

   ```bash
   boxlang "$BXA_REPO/tools/demo/fakellm.bxs" --port=1235 --script="$BXA_REPO/examples/demo-model.json"
   ```

   It prints `fakellm listening on http://127.0.0.1:1235/v1`, and the pre-flight `curl http://127.0.0.1:1235/v1/models` answers with one scripted model. Use an absolute path for `--script`.

2. Point the demo projects at it and rebuild:

   ```bash
   perl -pi -e 's#127.0.0.1:1234#127.0.0.1:1235#' "$DEMO"/hello/Agent.yml "$DEMO"/team/Agent.yml "$DEMO"/api/Agent.yml
   for p in hello team api; do (cd "$DEMO/$p" && bxAgents build); done
   ```

3. Run the demos as written. The scripted answers are fixed, so the prompts that work are: `My name is Ada, please greet me.` (demo 1), `Ask the researcher for three facts about BoxLang.` (demos 2 and 3), `Remember that I prefer short answers.` and `Save a skill called short-answers ...` (demo 3). Any other prompt gets the stand-in's one-line default answer. It does not use the model name to decide anything, but it prints it back (`The model asked for: ...`), so `/profile quick` visibly changes that line.

4. To go back to LM Studio, run the `perl` line with the ports swapped and build again, then stop the stand-in with `curl -s -X POST http://127.0.0.1:1235/__stop`.

If BoxLang itself will not start, there are recordings of the terminal chat and the web app under `tools/demo/talk/fallback/` and `docs/assets/video/`, made with a scripted model, which look older than the current screens.

## Clean up

```bash
pkill -f "$DEMO/team/.build"; pkill -f "$DEMO/api/.build"; pkill -f "$DEMO/mcp/.build"
rm -rf ~/.bxagents/minimal-agent ~/.bxagents/multi-agent-team ~/.bxagents/api-agent ~/.bxagents/mcp-agent
rm -rf "$DEMO"
```

The first line stops the servers (there is no stop verb: `serve` leaves the server running on its own). The second removes what the demos stored, which is named after each agent: conversations, notes, issued tokens and the skill saved in demo 3. It deletes only those four folders, not the rest of `~/.bxagents`. The third removes the projects. If you used the stand-in, stop it too. LM Studio is not touched by any of this.

## How this relates to the talk kit

[`tools/demo/talk`](../tools/demo/talk) is the earlier presentation kit for a 25 minute talk: three demos (create an agent with the wizard, teach it a tool and a skill, serve it), built by `prepare.sh` on Ollama by default, with fallback clips. This script is a different cut of the same ground, built from the shipped examples and aimed at LM Studio, with the composition and platform demos added. Its lessons carry over: a local model needs a warm-up before the first answer, a small model may skip a tool, `serve` returns to the prompt while the server runs on, and the scripted model is the safety net.

Two things in the talk kit's `prepare.sh` matter with LM Studio. It writes no address for the `openai-compatible` provider (so the agent would call port 8080): add the `providers:` lines from [above](#how-bxagents-is-pointed-at-lm-studio) to the `Agent.yml` it makes. And the pre-flight line "`bxAgents models` lists your models" should read `bxAgents models list`, then `bxAgents models test --all`.

## What was tested

- Every command of the four demos was run end to end, in the order of this file, with `tools/demo/fakellm.bxs` serving on port `1234` in place of LM Studio and `examples/demo-model.json` as its script: the setup block, the pre-flight (`doctor`, `models test`, the `/v1/models` check), the chat in demos 1 and 2 (tool rows, `/tools`, `/skills`, `/model`, `/ping`, `/profile quick`, `/default`, a delegation to the researcher), the served web app (the page and all thirteen routes answer, a note is saved, `skill_save` pauses for approval and resumes when approved, the terminal conversation is listed by the web app's API), the API (401 and 200, `invoke`, `stream`, `openapi`, issuing and revoking a token, `client.bxs`, `chat --connect`) and the MCP `tools/list` and `tools/call`.
- **Not tested: LM Studio itself.** The stand-in speaks the same protocol, but it is canned, so none of this shows how a real model behaves.
- **Not tested: real model behaviour.** Whether each model calls the tools, how long the first answer takes, whether `qwen/qwen3.6-35b-a3b` delegates to both subagents or calls `skill_save` with sensible arguments, and what loading a model costs on your machine. The "if it does not" notes are the plan for that, not a measurement.
- **Not tested: the web app in a browser.** The pages and the approval route were exercised over HTTP; what they look like was not looked at.
- Not tested on Windows or macOS.
