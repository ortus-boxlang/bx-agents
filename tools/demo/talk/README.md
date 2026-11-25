# The talk kit: three live demos

For the 25 minute talk "One folder is an agent". The three demos run on **your local models**. Nothing here needs the network once the models are pulled.

| File | What it is |
| --- | --- |
| `prepare.sh` | Makes the demo project the same way every time, and puts it back when you want to run the demos again |
| `demo-files/` | The one tool and the one skill that demo 2 copies in |
| `model.json` | A scripted stand-in for a model (`../fakellm.bxs`), for rehearsing without a model and as an emergency fallback |
| `fallback/` | Silent screen recordings to cut to if a demo stalls |

## What was tested, and what was not

Tested here, end to end, with the scripted model in place of a local one: `prepare.sh`; the tool and the skill being found after `bxAgents build`; the tool being called with its argument and its result coming back; `/profile planner` switching the model in the middle of a conversation (the answers changed from `fast-model` to `planner-model`, same conversation); the date tool; `bxAgents serve` with the web chat answering at `/chat`; and the API call below.

**Not tested here:** your actual local models. Rehearse all three demos twice with them, on the machine you will present from. Pay attention to whether your model really calls the tools (tool calling needs a model that supports it) and to how long the first answer takes.

## Once, before the day

1. BoxLang with the MiniServer on the PATH (`bxAgents serve` starts `boxlang-miniserver`), and the module: `install-bx-module bx-agents`. Check with `bxAgents --help`.
2. A local model server with two models you have pulled. `MODEL_A` should support tool calling; `MODEL_B` is the one you switch to in demo 1. With Ollama, `ollama list` shows them. Other servers: set `PROVIDER=openai-compatible` (any OpenAI-compatible server, such as LM Studio) or `PROVIDER=docker-model-runner`. Check with `bxAgents models list`, then `bxAgents models test --all`, that your models are known and answer. For LM Studio (or any `openai-compatible` server that is not on port 8080) the agent also needs the server's address: see [How BxAgents is pointed at LM Studio](../../../examples/demo.md#how-bxagents-is-pointed-at-lm-studio), and add those `providers:` lines to the `Agent.yml` that `prepare.sh` makes.
3. Make the demo project:

   ```bash
   cd tools/demo/talk
   MODEL_A=<first model> MODEL_B=<second model> ./prepare.sh
   ```

   It asks before it deletes anything, and then makes `~/talk/support-demo` (web chat, the date tool, two profiles `fast` and `planner`, usage recording on, built), `~/talk/demo-files` and `~/talk/live`. It deletes only `~/talk/support-demo` and that agent's data home (`~/.bxagents/support-demo`), never anything else.
4. Warm both models so the first answer is not slow. With Ollama: `ollama run <model> "hi"` for each.
5. Rehearse twice, with a timer. Target: 3:00, 2:50 and 2:50.

## Ten minutes before you go on

- Run `prepare.sh -y` again, then warm both models again. This resets conversations, notes and usage.
- Terminal font large (at least 20pt), dark theme, notifications off.
- Three terminal tabs: one in `~/talk/live`, one in `~/talk/support-demo`, one spare for the API call.
- A browser window open on a blank tab.
- Nothing else is using port 8080. (If something is, the scripted-model fallback below cannot start and a model address of `localhost:8080` reaches that other process instead, with no error.)
- The fallback clips in `fallback/` are open in a player on another screen, paused.

## Demo 1: Zero to chatting (3:00)

**Say:** "Here is an agent from nothing."

1. (1:00) In `~/talk/live` run `bxAgents new live-demo`. Answer the wizard briskly and say what you choose: a purpose such as "answers customer questions", a single agent, your local provider and `MODEL_A`, the date and time tool, memory on disk. Enter confirms each question, Esc goes back one. At the review, **Create the project**. Do not build it.
2. (0:10) Say "and here is one I made earlier", then in `~/talk/support-demo` run `bxAgents chat`.
3. (0:20) Point at the header: the icon, the agent's name, the line `skills  ... 6 from bxAgents`, and the box at the bottom.
4. (0:30) Ask: **What day is it today, and how should I greet a customer on that day?** It streams and calls the date tool; point at the tool row with its time.
5. (0:40) Type `/` to show the menu of commands, then `/profile planner`. Ask the same question again. Say: same conversation, same tools, only the model changed. `/model` shows which one is in use, and `/default` goes back.

**Expected:** the header with the skills line, a tool row (`now`), a streamed answer, then the message `Now using planner (<provider>/<model>). The conversation carries on.` (for example `Now using planner (openai-compatible/planner-model). The conversation carries on.`) and an answer from the other model.

## Demo 2: Teach it something (2:50)

**Say:** "Now I teach it two things, with two files."

1. (0:20) In `~/talk/support-demo` show the folder: `ls` and point out there is no `tools/` or `skills/` content yet.
2. (0:30) Copy the two files in and show them:

   ```bash
   cp -R ~/talk/demo-files/. ~/talk/support-demo/
   cat tools/Orders.bx
   cat skills/refund-policy/SKILL.md
   ```

   Say it plainly: that is the whole change, nothing is registered anywhere.
3. (0:30) `bxAgents build`, then `bxAgents chat`. The header's skills line now lists `refund-policy`.
4. (0:50) Ask: **Where is order 48213, and can I still return it?** The tool row shows `orderStatus` with its argument, and the answer uses the refund policy.
5. (0:20) `/skills` lists what the agent has, with where each skill came from: `project` for yours, `bxagents` for the six that ship with it.

**Be straight with the room:** the order data is a fixed answer from the tool, it is not a real order system. And the skill is only loaded when the model decides the question matches its description, so a small local model may skip it. If it does, ask: **What is the refund policy?**

## Demo 3: Serve it (2:50)

**Say:** "Same agent, now as a web app and an API."

1. (0:30) `bxAgents serve --port=8080`. Read out the first line (it prints the address and that it is bound to 127.0.0.1 only).
2. (0:40) Open `http://127.0.0.1:8080/chat` and ask a question. Point at the left menu.
3. (0:30) Open Conversations: the terminal conversations from demos 1 and 2 are there too. Same memory through every door.
4. (0:30) In the spare tab call the API:

   ```bash
   curl -s -H "Content-Type: application/json" \
        -d '{"input":"Where is order 48213?"}' \
        http://127.0.0.1:8080/__bxagents/invoke
   ```

   The answer is JSON with `output`, `threadId` and `success`.
5. (0:40) Open Logs, then the Agent page for usage. Say: five logs, and tokens by model, counts only, never what was said.

**Say if asked:** access is open here because it is your own machine. For a team you add a token or a login (`bxAgents token`, or `--auth=users` on the web chat).

## If something goes wrong

| What happens | Do this |
| --- | --- |
| The first answer takes a long time | Say "a local model loads on first use", wait up to 20 seconds, then cut to the fallback clip. Do not apologise twice. |
| The model does not call the tool | Ask again with the order number in the question. If it still does not, say so and cut to the clip. |
| The model gives a wrong or odd answer | Smile, say "that is a small local model", and go on. The point of the demo is the folder, not the answer. |
| `bxAgents` is not found or a build fails | Run `prepare.sh -y`. If that fails too, cut to the fallback clip. |
| Port 8080 is busy | `bxAgents serve --port=8791` and use that port in the browser and the curl command. |
| Everything is broken | Switch to the scripted model for a minute: `boxlang ../fakellm.bxs --port=8080 --script=model.json` and set the agent's provider to `openai-compatible`. It answers instantly with canned text, and it uses port 8080, so serve on another port (`bxAgents serve --port=8791`). Say that it is scripted. |

## Fallback clips

Silent screen recordings from the project's own trailer, in `fallback/`. Talk over them.

- `demo1-wizard.mp4`: the wizard creating a project.
- `demo1-chat.mp4`: the chat with streaming, a tool call and a code block.
- `demo2-tools.mp4`: a tool call and `/skills`. It is the closest recording; there is no recording of copying the two files.
- Demo 3: `docs/assets/video/web-trailer.mp4`, the web app tour.

## After the talk

The same journey as a hands-on course, with no account and no key: [Introduction to BxAgents](https://bxagents.ai/course/). It builds the same Acme support agent on the scripted model (`../fakellm.bxs`), and its checker replays every command (`tools/course/`).
