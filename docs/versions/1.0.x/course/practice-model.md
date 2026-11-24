---
title: "A Model That Needs No Key"
icon: phosphor-duotone:plugs
summary: Start a scripted stand-in for an AI model and build your first agent against it, with no account and no key.
description: Start a scripted stand-in for an AI model and build your first agent against it, with no account and no key.
tags: [course, getting-started]
---

# A Model That Needs No Key

Every lesson from here on builds one agent, **Acme support**, an assistant that answers questions
about orders, returns and shipping. To follow along you do not need an OpenAI or Anthropic account.
You will run a small **scripted model** on your own machine: a server that speaks the same protocol as a
real model, but only replays answers the course wrote for it. Your agent cannot tell the difference, and
when you do have a key, swapping it in is a two-line change (the last section shows it).

!!! info "What you will have at the end"
    A running scripted model, a new project called `acme-support` that builds, and an answer from it in
    your terminal. About 15 minutes.

## 1. Get the course kit

The kit is a folder with the scripted model and its answers. Make a workspace and unpack it:

<!-- course: manual -->
```bash title="Terminal 2"
mkdir -p ~/bxagents-course
cd ~/bxagents-course
curl -LO https://bxagents.ai/assets/course/bxagents-course-kit.zip
unzip bxagents-course-kit.zip
```

If you cloned the BxAgents repository you can copy `tools/course/kit/` instead and call the copy `kit`.
On Windows, use WSL: the commands of this course are for a Unix shell.

```bash title="Terminal 2"
cd ~/bxagents-course
ls kit
```

```text title="You see"
README.md
checkpoints
demos
fakellm.bxs
resume.sh
```

## 2. Start the scripted model

Open a second terminal (call it **Terminal 1**) and leave it running:

<!-- course: background name=fake ready="fakellm listening" keep -->
```bash title="Terminal 1"
cd ~/bxagents-course/kit
boxlang fakellm.bxs
```

```text title="You see"
fakellm listening on http://127.0.0.1:8080/v1 (script: <anything>/demos/model.json)
```

It listens on port 8080, which is where BxAgents looks for an `openai-compatible` model by default. Its
answers live in `kit/demos/model.json`; open it later to see how little there is to it.

!!! warning "Use an absolute path if you pass `--script`"
    If you start it with a script of your own, give a path (`--script=$PWD/my.json`). A path that does not
    exist where you are is looked up next to `fakellm.bxs`.

## 3. Create the agent

Back in Terminal 2:

```bash title="Terminal 2"
cd ~/bxagents-course
bxAgents new acme-support --model=openai-compatible/fast-model --skipInstall --no-banner
```

```text title="You see"
Created new BX Agents project [acme-support] at <anything>/acme-support
```

`--model` is a `provider/model` slug: the provider is `openai-compatible` (any server that speaks the OpenAI
chat protocol) and `fast-model` is a name the scripted model accepts for any request. `--skipInstall` skips
installing the test framework for now ([Testing Your Agent](19-testing-your-agent.md) does it).

!!! warning "Write flag values without spaces"
    BoxLang 1.19.0's launcher splits every argument at spaces, so `--message="Where is my order"` arrives
    as `--message=Where` and the rest is read as something else. Until that is fixed, keep the values of
    flags free of spaces (`--message=refund`). What you type *into* the chat, or into a `curl -d '{...}'`
    body, is not affected. See [Quoting flag values](../cli-reference.md#quoting-flag-values).

## 4. Build it and ask it something

```bash title="Terminal 2"
cd acme-support
bxAgents build
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
```

```bash title="Terminal 2"
bxAgents invoke --message=hello
```

```text title="You see"
Hello from the practice model. I am scripted: I only say what the course told me to say.
```

`invoke` runs exactly one turn and prints the answer, which makes it the easiest thing to put in a script.
Ask something the script has a rule for, and then something it does not:

```bash title="Terminal 2"
bxAgents invoke --message=refund
bxAgents invoke --message=anything
```

```text title="You see"
Returns are free for **30 days** after delivery. Refunds land within **5 working days**. Sale items are final, but a damaged item is always replaced.
I can help with orders, returns and shipping. (Answered by fast-model.)
```

The second answer is the script's `default`. It names `fast-model`, the model your agent asked for, so two
agents on different model names can be told apart later. `--json` prints the answer the way a program would
read it:

```bash title="Terminal 2"
bxAgents invoke --message=hello --json
```

```text title="You see"
{"response":"Hello from the practice model. I am scripted: I only say what the course told me to say."}
```

Now try the full-screen chat. Type `hello`, then `exit` (or press Ctrl+C):

<!-- course: manual -->
```bash title="Terminal 2"
bxAgents chat
```

## What just happened

- `bxAgents new` wrote a folder: `Agent.yml` (the definition), `instructions.md` (the system prompt) and
  empty convention folders. The three lines of `Agent.yml` that matter now:

  ```yaml
  name: acme-support
  provider: openai-compatible
  model: fast-model
  ```

- `bxAgents build` assembled a runnable app in `.build/`. You never edit it.
- When you asked a question, the agent sent a request to `http://localhost:8080/v1`, where the scripted
  model answered. Stop the model in Terminal 1 (Ctrl+C) and ask again: the agent reports that it cannot
  reach its model. The model really is just a service.

## When you have a real key

Nothing else in the course changes. Replace two lines of `Agent.yml` and put your key in `.env` (the
[last lesson](capstone.md) does this properly):

<!-- course: manual -->
```yaml title="acme-support/Agent.yml"
provider: openai
model: gpt-5
```

A real model words its answers in its own way, so what you see will differ from the "You see" blocks in this
course. What does not differ is what the files do.

## Checkpoint

`acme-support/` builds and answers `hello`. If you get lost in a later lesson, `kit/resume.sh <lesson>` puts
the project back to the state after that lesson, and you rebuild.

Next: [Scaffolding Your First Agent](04-scaffolding-your-first-agent.md)
