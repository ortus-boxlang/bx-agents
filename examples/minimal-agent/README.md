# minimal-agent

The smallest complete BxAgents project, with enough commands for a live demo:

- [Agent.yml](Agent.yml) selects the model.
- [instructions.md](instructions.md) tells the agent how to behave.
- [tools/Greeter.bx](tools/Greeter.bx) exposes the `sayHello` tool.
- [skills/greeting/SKILL.md](skills/greeting/SKILL.md) describes the greeting style.

**Demo story:** inspect a folder, build it, talk to a local model, watch it call a BoxLang function, manage the conversation, and expose the same agent over HTTP.

## Before the demo

Run the shell commands below from this folder:

```bash
cd examples/minimal-agent
bxAgents --version
```

You need BoxLang and BxAgents installed. The HTTP and browser sections also need `boxlang-miniserver` on your `PATH`. Start LM Studio's local server and load a tool-capable model before starting the demo.

### Connect to LM Studio

Check the server and copy the exact model `id`:

```bash
curl -sS http://127.0.0.1:1234/v1/models
```

This example uses an explicit profile. Keep `baseURL` under that profile's `options`, including `/v1`:

```yaml
name: minimal-agent
description: "The smallest complete BX Agents project: one tool, one skill."
defaultProfile: local

profiles:
  local:
    provider: openai-compatible
    model: lfm3-1.7b
    options:
      baseURL: http://127.0.0.1:1234/v1
      timeout: 300
```

Replace `lfm3-1.7b` if your loaded model has another ID. The provider appends `/chat/completions`. No API key is needed when LM Studio's authentication is disabled. Port `1234` is LM Studio; port `8080` later is the BxAgents application.

If you instead set `model: mock/mock-model`, remove `defaultProfile` so it does not override that choice. Mock returns a canned answer: it is useful for smoke tests, not for demonstrating reasoning or tool selection.

> **Shell vs. chat:** `bxAgents ...` runs in your shell; `/...` runs inside the chat. Always use `--flag=value`. The BoxLang 1.19.0 launcher can split shell arguments containing spaces even when quoted, so the shell examples use single-word values. Multiword prompts and names work normally inside chat.

## 1. Show that the folder is the configuration

**Say:** "No registration code: tools and skills are discovered by convention."

```bash
ls
cat Agent.yml
cat instructions.md
cat tools/Greeter.bx
cat skills/greeting/SKILL.md

bxAgents --help
bxAgents help chat
bxAgents inspect --help
bxAgents doctor
bxAgents inspect
bxAgents inspect --section=agents,tools,skills,ai
bxAgents inspect --section=env,checks
bxAgents inspect --json
bxAgents inspect --md
```

Point out `sayHello`, the `greeting` skill, and the `local` profile. `inspect` reads source, so no build is needed. `doctor` checks configuration and prerequisites; it does not ask the model a question.

## 2. Build, check the connection, invoke

**Say:** "Inspect describes the source; build turns it into a runnable application."

```bash
bxAgents build --verbose
bxAgents inspect --section=build
bxAgents models list
bxAgents models list --json
bxAgents models test
bxAgents models test --profile=local
bxAgents models test --all --json
bxAgents invoke --message=Hello
bxAgents invoke --message=Hola --json
```

The model test should report `ok`; JSON invocation wraps the answer in a `response` field. The model's wording varies.

**Rebuild after editing source or configuration**, then restart the chat or server. A running process does not automatically pick up a new profile.

## 3. Show the tool and skill in a live conversation

```bash
bxAgents chat
```

Run these **inside chat**, one at a time:

```text
/help
/info
/model
/ping
/tools
/skills
/volumes
/context
```

Then send:

```text
My name is Ada. Please greet me using the sayHello tool.
Load the greeting skill and greet Ada in Spanish using sayHello.
What is my name?
```

**Show:** a `sayHello` tool call with `name=Ada`, its result, and the streamed answer. The first prompt follows the instruction file; the second demonstrates loading the skill and asking for a language. The final prompt demonstrates conversation memory, not a new greeting function.

A small model may answer without calling a tool or loading a skill. Ask explicitly, watch the tool rows rather than trusting its claim, and use a stronger tool-capable model if necessary. The function itself returns `Hello, <name>!`; the model controls the surrounding response.

## 4. Name, fork, resume, and export the conversation

Stay **inside the same chat**:

```text
/name Greeting demo
/sessions
/fork Spanish version
Please greet Ada in Spanish.
/sessions
/export greeting-demo.md
/export greeting-demo.html
/new
/sessions
```

Use `/resume` followed by the number or ID shown in `/sessions` to reopen the original or the fork:

```text
/resume 1
/info
/context
/exit
```

The number is an example: choose the actual row in your list. Export before clearing a conversation if you want to keep its contents.

Back in the **shell**:

```bash
bxAgents sessions list
bxAgents sessions list --json
bxAgents chat --continue
```

Use `/exit` to leave again. To reopen a particular row instead:

```bash
bxAgents chat --session=1
```

The default conversation memory is backed by the chat database. If you explicitly switch to `memory: cache`, messages will not survive process exit.

## 5. Show the terminal UI

Start another chat, or use these in one already open:

```text
/keys
/prompt
/prompt box
/prompt top agent profile clock
/prompt bottom folder ctx
/prompt bars
```

Ask for formatted output:

```text
Show a Markdown table with three greetings and their languages.
Show a tiny BoxLang function in a fenced code block.
```

Useful live-demo shortcuts:

| Action | Key or command |
|---|---|
| Discover commands | Type `/` |
| Discover keyboard shortcuts | `?` alone or `/keys` |
| Enter a multiline message | Alt+Enter |
| Recall a previous message | Up / Down |
| Request a stop | Esc; takes effect at the next run checkpoint |
| Steer a running answer | Type another message and press Enter |
| Copy the last answer | `/copy` (terminal clipboard support required) |
| Leave | `/exit` |

Prompt appearance changes last for this chat. They do not rewrite the project's YAML.

## 6. Record the demo

From the **shell**:

```bash
bxAgents chat --record=greeting-demo.cast
```

Or, **inside a terminal chat**:

```text
/record greeting-demo.cast
My name is Ada. Please use sayHello.
/record stop
```

Choose one recording method. With asciinema installed separately, replay it:

```bash
asciinema play greeting-demo.cast
```

Recordings and exported conversations include what was displayed, including prompts and tool arguments. Use fictional demo content, not credentials or private data. Recording requires the terminal UI, not `--no-tui`.

## 7. Optional: switch between two local models

Load a second tool-capable model in LM Studio. Add a sibling profile under the **existing** `profiles:` mapping in [Agent.yml](Agent.yml); do not add a second top-level `profiles:` key:

```yaml
  larger:
    provider: openai-compatible
    model: qwen/qwen3.6-35b-a3b
    options:
      baseURL: http://127.0.0.1:1234/v1
      timeout: 300
```

Use an ID your server actually lists. Each profile carries its own endpoint options; do not assume it inherits `local`'s URL.

```bash
bxAgents build
bxAgents models list
bxAgents models test --profile=larger
bxAgents chat
```

**Inside chat:**

```text
/profile
/profile larger
/model
/ping larger
My name is Ada. Use sayHello and greet me in French.
/default
/model
/exit
```

**Say:** "Same conversation and tools; a different model. `/default` returns to the `local` profile."

## 8. Optional: turn on usage statistics

This changes [Agent.yml](Agent.yml) by enabling `usage: true`:

```bash
bxAgents stats --enable
bxAgents build
bxAgents invoke --message=Hello
bxAgents stats
bxAgents stats --days=1 --by=model
bxAgents stats --days=1 --by=provider --json
```

Inside a restarted chat, `/stats` and `/stats 1 --by=day` show the same usage record. Only calls made after enabling recording are counted, and only when the provider reports usage. Token counts are not a cost estimate.

## 9. Optional: persistent notes, distinct from conversation memory

Add this at the top level of [Agent.yml](Agent.yml), then rebuild:

```yaml
notes: {}
```

```bash
bxAgents build
bxAgents chat
```

**Inside chat:**

```text
/remember Use concise bullet points.
/notes list
/notes stats
/new
My name is Ada. Please greet me.
/exit
```

**Back in the shell:**

```bash
bxAgents notes list
bxAgents notes stats
```

Notes survive `/new` and are included from the next conversation. Without `notes: {}`, this example has conversation memory but no notes provider.

## 10. Serve the same agent as an HTTP API

This section needs `boxlang-miniserver`. No gateway file is required for the built-in agent API.

**Terminal A:**

```bash
bxAgents build
bxAgents serve --port=8080
```

Leave it running. **Terminal B**, from this project folder:

```bash
curl -sS http://127.0.0.1:8080/__bxagents/health
curl -sS http://127.0.0.1:8080/__bxagents/info
curl -sS http://127.0.0.1:8080/__bxagents/tools
curl -sS http://127.0.0.1:8080/__bxagents/skills
curl -sS http://127.0.0.1:8080/__bxagents/openapi
```

Make a real model call:

```bash
curl -sS http://127.0.0.1:8080/__bxagents/invoke \
  -H 'Content-Type: application/json' \
  --data '{"input":"My name is Ada. Please use sayHello."}'
```

Show the native server-sent event stream; `-N` disables curl's output buffering:

```bash
curl -sS -N http://127.0.0.1:8080/__bxagents/stream \
  -H 'Content-Type: application/json' \
  --data '{"input":"Greet Ada using sayHello, then explain the greeting briefly."}'
```

Connect the terminal chat to that running app:

```bash
bxAgents chat --connect=http://127.0.0.1:8080
```

Leave with `/exit`. Stop Terminal A with Ctrl+C when finished.

For a one-off HTTP invocation without manually managing a server:

```bash
bxAgents invoke --message=Hello --server --json
```

Or let chat manage its own temporary server:

```bash
bxAgents chat --server
```

These are alternatives, not prerequisites for each other. The development API is open by default and binds to loopback; configure authentication before exposing it beyond your machine.

## 11. Optional: add the browser UI live

Stop any server first. This writes a new gateway file:

```bash
bxAgents add gateway web --auth=open --path=/chat --yes
bxAgents inspect --section=gateways
bxAgents build
bxAgents serve --port=8080
```

Open <http://127.0.0.1:8080/chat>.

**Say:** "A new way into the same agent, not another agent implementation."

`--auth=open` is only for this loopback demo. For a protected UI, use `--auth=key` instead and follow the generated sign-in instructions. Adding the gateway is a one-time step; a second run is refused rather than overwriting it.

## 12. Show scaffolding without changing the demo

`--dry-run` previews generated files without writing them:

```bash
bxAgents add tool Wave --function=wave --description=Wave-by-name --args=name --dry-run --yes
bxAgents add skill farewell --dry-run --yes
bxAgents add gateway web --auth=key --dry-run --yes
```

Run the gateway preview before actually adding `web` in the previous section, or choose another name with `--name=previewWeb`. A generated skill with no description is a scaffold to finish, not a complete skill.

Explore installed capabilities without signing in to external services:

```bash
bxAgents connectors list
bxAgents connectors show github
bxAgents skills list
bxAgents extensions list
```

Listing a connector does not connect it or grant the model access.

## 13. Inspect data, logs, and ship an artifact

```bash
bxAgents data
bxAgents data --json
bxAgents logs
bxAgents logs agent --tail=20
bxAgents logs agent --tail=100 --level=error
bxAgents package --version=1.0.0
ls dist
```

Packaging writes `dist/minimal-agent-1.0.0.bxa`, its checksum, and a manifest. This is the built application, not an export of your conversations.

Optional: make a backup of the agent's data home:

```bash
bxAgents backup --to=greeting-demo-backup.zip
```

The backup may contain conversation history, notes, saved skills, and files. Keep it private; it is different from the application package.

This intentionally small example has no project test suite. To demonstrate `bxAgents test`, first add tests and install TestBox as described in [Testing](../../docs/conventions/testing.md), or use a project generated by `bxAgents new`.

## Troubleshooting on stage

| Symptom | Check |
|---|---|
| Every answer is `Mock response` | Select the real `local` profile, rebuild, and restart chat. |
| Connection failure | Run the LM Studio `/v1/models` curl first, then `bxAgents models test`. Check the actual endpoint in the error. |
| Error shows port `8080` for the model | Keep `baseURL` inside the explicit profile's `options`, as above. LM Studio is on `1234`, not the app's `8080`. |
| Unknown model | Copy the exact `id` from LM Studio; do not add or remove a prefix. |
| Model is slow or times out | Load it before the talk, use a smaller model, and check the profile's timeout. |
| Answer appears, but no tool row | The model did not necessarily call the tool. Ask explicitly for `sayHello`, or switch to a stronger tool-capable model. |
| A changed setting seems ignored | Rebuild and restart. Also check `/info` for personal settings that override the project's configuration. |
| Server cannot start | Check `boxlang-miniserver`, port availability, and avoid project paths containing spaces. |
| Notes or statistics are disabled | Complete the optional setup above; those features are not enabled in the minimal configuration. |

Local errors include available exception details, causes, source locations, and the actual provider endpoint; credentials are redacted. `/logs agent` inside chat and `bxAgents logs agent` in the shell help inspect failures.

## A short route through the longer demo

For a roughly ten-minute presentation:

1. Show the four source files and `inspect`.
2. Build, run `models test`, and `invoke`.
3. Chat: `/tools`, `/skills`, greet Ada, `/context`.
4. Name and fork the conversation; export it.
5. Change the prompt style and show `/keys`.
6. Serve the API, invoke it with curl, and connect the terminal chat.
7. Package the application.

Keep the second model, notes, statistics, and browser UI as extensions if there is time. Rehearsals leave conversations and exports behind; do not clear shared data or remove the data home just to reset the stage.

More: [CLI reference](../../docs/cli-reference.md), [slash commands](../../docs/guides/slash-commands.md), [tools](../../docs/conventions/tools.md), [skills](../../docs/conventions/skills.md), [models and profiles](../../docs/conventions/models.md), and the [multi-example demo script](../demo.md).
