---
title: "The Agent Asks First"
icon: phosphor-duotone:hand-palm
summary: Why a run stops for a person, who is allowed to approve it, and what Approve, Approve for the conversation and Reject do.
description: Why a run stops for a person, who is allowed to approve it, and what Approve, Approve for the conversation and Reject do.
tags: [course, approvals, web-ui]
---

# The Agent Asks First

Some things an agent should not do on its own. Saving a routine that will run every morning as you, saving a new
skill into its own memory, forgetting a note: BxAgents makes the run **stop** at those tools, shows the person what
the agent is about to do, and carries on only when the person says so. That pause is *human-in-the-loop*, and it is
what you will meet in this lesson.

!!! info "What you will build"
    A turned-on `routines` setting, and an approval you reject and then approve, first from a script and then by
    clicking in the web app. About 20 minutes.

## What asks first

Tools BxAgents gives the agent are named `{type}_{action}`, and the ones that change something lasting need a
person's approval:

| Tool | Does | Asks first |
|---|---|---|
| `routine_schedule`, `routine_update`, `routine_delete` | Make, change or delete a [routine](routines-and-reports.md) | Yes |
| `skill_save` | Save a skill the agent wrote for itself | Yes, unless `skills.autoApprove: true` |
| `note_forget` | Forget a note | Yes, while `notes.approveForget` is `true` (the default) |
| `routine_list`, `routine_pause`, `report_save`, `note_remember` and the other `routine_*`, `report_*`, `note_*` tools | Read, or add | No |

The Registry page of the web app marks the tools that ask first. The tools of your own `tools/` folder run without
asking: the docs do not describe a way for one of them to ask, so this lesson uses the built-in ones.

## 1. Turn routines on

`routine_schedule` only exists when routines are on. They are off by default, so a published agent never grows
automated work by surprise. Add these lines at the end of `Agent.yml`. `minInterval: 1m` lets a routine repeat every
minute, which the course needs; the default is 5 minutes:

<!-- course: append -->
```yaml title="acme-support/Agent.yml"

routines:
  enabled: true
  minInterval: 1m
```

Rebuild and serve it (Terminal 3). Stop the server from the last lesson first, with Ctrl+C there, because a server
runs the app that was built when it started:

```bash title="Terminal 2"
cd ~/bxagents-course/acme-support
bxAgents build
```

```text title="You see"
Build succeeded: <anything>/acme-support/.build/app
```

<!-- course: background name=serve ready-url=http://127.0.0.1:8791/chat -->
```bash title="Terminal 3"
cd ~/bxagents-course/acme-support
bxAgents serve --port=8791
```

## 2. See the run stop

In the web app (`http://127.0.0.1:8791/chat`) type `routine`. The scripted model answers a message with that word by
calling `routine_schedule`. Instead of a result, the chat shows an approval card with the tool, its arguments and
three buttons.

<!-- TODO screenshot: the approval card in the web chat (routine_schedule with its name, schedule and prompt, and the
Approve, Approve for the conversation and Reject buttons). No such image exists in docs/assets/webui yet. -->

The terminal chat asks the same question in place: approve once, approve for the conversation, or reject. And a
program sees the same thing, because the web page only uses the agent API. Here is the whole exchange from a
script. `invoke` answers with `"type":"suspend"` and a `threadId` instead of an answer:

```bash title="Terminal 2"
B=http://127.0.0.1:8791/__bxagents
curl -s -H 'Content-Type: application/json' -d '{"input":"routine"}' $B/invoke
```

```text title="You see"
{"output":{"reason":"","data":{"pendingActions":[{"toolName":"routine_schedule","toolArgs":{"name":"weekly-report","schedule":"every 5m","prompt":"report"}}],<anything>"type":"suspend"},"threadId":"<anything>","success":true}
```

The run is saved by the agent's *checkpointer* (the default `cache` one is enough here) and waits. Ask what it waits
for with the thread id, then answer with `reject`:

```bash title="Terminal 2"
B=http://127.0.0.1:8791/__bxagents
T=$(curl -s -H 'Content-Type: application/json' -d '{"input":"routine"}' $B/invoke | sed 's/.*"threadId":"\([^"]*\)".*/\1/')
curl -s "$B/pending?threadId=$T"
echo
curl -s -N -H 'Content-Type: application/json' -d "{\"threadId\":\"$T\",\"decision\":\"reject\"}" $B/resume | grep '"content"' | cut -d'"' -f4 | tr -d '\n'
echo
bxAgents routines list
```

```text title="You see"
{"pendingActions":[{"toolName":"routine_schedule","toolArgs":{"name":"weekly-report","schedule":"every 5m","prompt":"report"}}],"pending":true,"threadId":"<anything>","success":true}
The routine request finished. The tool answered: [Tool call blocked: Rejected by human operator<anything>
No routines yet. Ask the agent to schedule one, or use: bxAgents routines add --name=... --schedule=... --prompt=...
```

The tool never ran, the agent was told it was refused, and no routine exists. Run it again and answer `approve`:

```bash title="Terminal 2"
B=http://127.0.0.1:8791/__bxagents
T=$(curl -s -H 'Content-Type: application/json' -d '{"input":"routine"}' $B/invoke | sed 's/.*"threadId":"\([^"]*\)".*/\1/')
curl -s -N -H 'Content-Type: application/json' -d "{\"threadId\":\"$T\",\"decision\":\"approve\"}" $B/resume | grep '"content"' | cut -d'"' -f4 | tr -d '\n'
echo
bxAgents routines list
```

```text title="You see"
The routine request finished. The tool answered: <anything>
weekly-report         every 5 minutes           not run yet           next <anything>
```

The answer is the tool's real result: the routine's name, its schedule *in words* ("every 5 minutes", read back so
a mistake is seen straight away) and when it first runs. The next lessons use it.

## The three answers

`resume` takes one of three decisions:

| Decision | Button | Does |
|---|---|---|
| `approve` | Approve | Runs this one call |
| `approve_session` | Approve for the conversation | Runs it, and does not ask again for the same tool in this conversation |
| `reject` | Reject | Does not run it; the agent is told, and answers accordingly |

`resume` can also carry `editedData`, an edited set of arguments, and `reason`, which the agent sees on a rejection.

## Who may answer

- **A run belongs to the person or token that started it.** `GET /pending` answers "nothing pending" and
  `POST /resume` answers `403` to anyone else, so a visitor holding someone else's thread id can neither read the
  arguments nor approve. [Who Is Allowed](users-roles-and-tokens.md) comes back to this with two tokens.
- **Who approved is filled in by the server**, from the session, never from the request.
- **A routine's own run** stops for approval like any chat: the routine shows as *waiting for approval* and the
  person answers in its conversation. After `approvalTimeout` (24 hours by default) the run is cancelled and counts as
  a failure.
- On a chat platform the approval goes through that platform's own buttons. The `cli` gateway type is the blocking
  prompt in a terminal.

## Checkpoint

`Agent.yml` has the `routines:` block and the agent now has a routine called `weekly-report`. The routine lives in
the agent's data home, not in the project, so `kit/resume.sh` does not touch it. `kit/resume.sh approvals` restores
the `routines:` lines; rebuild after.

Full reference: [The web app](../conventions/web-ui.md#human-in-the-loop) and [routines](../conventions/routines.md#the-tools).

Next: [What It Remembers, and for Whom](memory-and-notes.md)
