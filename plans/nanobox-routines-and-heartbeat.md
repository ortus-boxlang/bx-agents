# Nanobox: routines and heartbeat

Status: API shape for review. No code yet.

## What these are

- **A routine** is work the agent does on a schedule, without anyone messaging it. "Every weekday at 8, summarise my open issues." "On the 1st, tell me what the backups cost." Today the only way is a file you write by hand, `schedules/*.bx`, which needs a rebuild to change.
- **The heartbeat** is one special routine. Every N minutes the agent wakes up, reads a short checklist you keep, does the cheap checks on it, and says nothing unless something needs you. It is what makes a personal agent feel awake instead of waiting to be asked.

Both come from one line of the phase 1 plan ("routines and heartbeat"); there was no design behind it until this page.

## Decisions so far

- Routines are stored at run time in the data home's database. You (or the agent, with approval) create, list, pause, resume, run now and delete them in the chat, the CLI and the API, with no rebuild. `schedules/*.bx` keeps working and is listed with the origin `file`.
- The heartbeat is a checklist run on an interval, not a plain routine.
- A routine keeps its own conversation, and can also send its result to a channel you pick.
- A routine has the same approval rules as chat. A tool that needs approval pauses the routine and waits in the pending list until a person answers.

Open (see the end): which channels can be sent to, and what "silent" means exactly.

## 1. Routines

A routine is a row in the chat database (a new versioned migration):

| Field | Meaning |
|---|---|
| `name` | Folder-style name, unique: `weekday-digest` |
| `schedule` | A cron expression, or `every 30m` |
| `prompt` | What to tell the agent when it fires |
| `enabled` | Paused routines stay stored |
| `channel` | Where to also send the result, or empty for nowhere |
| `ownerId` | Whose routine it is. The run is made as this person, so their notes, volumes and permissions apply |
| `lastRunAt`, `lastStatus`, `nextRunAt` | Shown in the list |

A run:

- Is a normal turn through `TurnRunner`, as a `Caller` with `source = routine`, so everything that already works for a turn (memory, notes, approvals, usage) works for it.
- Uses the conversation id `routine-<name>`, so each routine has one conversation the person can open and read in the web page, the terminal and the API. The message count and `/compact` behave as for any conversation.
- Never overlaps itself: a routine that is still running (or waiting for an approval) is skipped, and the skip is recorded.
- Records its result, the time it took and any error. Three failures in a row pause the routine and say so.

A routine runs as long as the server runs. If the server was down when one was due, it runs once on start, not once per missed time.

### Who may create one

- A person, through `/routine`, `bxAgents routines` or the API.
- The agent, with a `scheduleRoutine` tool, which needs a person's approval like any write. A person sees the schedule and the prompt before it exists.
- Admins see all routines; anyone else sees their own.

## 2. The heartbeat

- `<data home>/HEARTBEAT.md` is the checklist. Plain markdown, written by a person or by the agent (with approval). A starter file is made by `init`.
- `heartbeat:` in `Agent.yaml` turns it on and sets how often. Off by default.

```yaml
heartbeat:
  every: 30m                 # 5m to 24h
  channel: telegram          # where to speak up; empty means only its conversation
  activeHours: 08:00-22:00   # optional, local time of the server
```

Each beat runs a turn with a fixed instruction: read the checklist, do what is cheap and safe, and answer exactly `HEARTBEAT_OK` when nothing needs the person. An answer of exactly that is stored in the beat's conversation (`heartbeat`) but is not sent anywhere. Any other answer is sent to the channel, and is what the person sees.

The heartbeat is a routine with the name `heartbeat` that cannot be deleted from the list, only turned off in `Agent.yaml`. It has the same overlap, failure and approval rules.

## 3. Surface

| Where | What |
|---|---|
| `/routines` | Lists them: name, schedule, enabled, last result, next run, origin (`stored` or `file`) |
| `/routine <name> run\|pause\|resume\|delete` | Acts on one. Creating is by `bxAgents routines add` or by asking the agent |
| `bxAgents routines [list\|add\|pause\|resume\|run\|delete]` | The same, from the shell. Works on the data home, so it needs the server stopped or reachable |
| `GET /routines` | `{ routines : [ { name, schedule, prompt, enabled, channel, origin, lastRunAt, lastStatus, nextRunAt } ] }` |
| `POST /routines` | `{ name, schedule, prompt, channel? }` creates |
| `POST /routines/run`, `/routines/pause`, `/routines/resume`, `POST /routines/delete` | `{ name }`. `run` starts it now |
| `GET /heartbeat` | `{ enabled, every, lastBeatAt, lastStatus }` |
| Web page | A Routines section in Settings with the same list and the same actions |

All of it goes through one `Routines` service (like `Conversations`), so the terminal, the web page, the API and the agent's tool cannot disagree.

## 4. Safety

- A routine can only do what its owner's chat could do. It gets no tool the agent does not have, and no extra volumes.
- A tool that needs approval pauses the routine. The pending list shows which routine asked. Nothing is auto-approved because it ran from a schedule.
- A routine cannot create routines (the `scheduleRoutine` tool is not offered to a run with `source = routine`), so a prompt cannot make itself spread.
- The shortest interval is 5 minutes, and an owner may have up to 20 routines.
- The result sent to a channel is the same text the person would read in the conversation. The channel send is recorded.

## Tasks

1. Spike: can BoxLang's scheduler add and remove a task while the app runs, and does `TurnRunner` run cleanly from a scheduler thread with no web request? Which gateways can send a message that nobody asked for?
2. `ChatStore` migration (v10): `routines` table; `Routines` service (create, list, pause, resume, delete, due); specs.
3. `RoutineRunner`: fires due routines, builds the `Caller`, runs the turn, records the result, skips overlaps, pauses after three failures, catches up once after downtime; specs with a mock model.
4. Approvals from a routine: pause, show in the pending list with the routine's name, resume on answer; specs.
5. Heartbeat: `heartbeat:` setting (loader, validator), `HEARTBEAT.md`, the fixed instruction, the silent rule, active hours; specs.
6. `scheduleRoutine` tool (approval, not offered to routines); specs.
7. Channel send through the gateway registry; specs.
8. `/routines`, `/routine`, `bxAgents routines`, `GET`/`POST /routines`, `GET /heartbeat` in `ApiContract`, handler, client, OpenAPI; admin and owner rules; specs.
9. Settings section in the web page.
10. Docs (English and the `1.0.x` mirror), changelog, full suite, ColdBox integration run. One draft pull request per slice: tasks 2 to 4 (routines), then 5 to 7 (heartbeat and channels), then 8 to 9 (surface).

## Open questions

1. **Channels.** Which of the gateways should a routine be able to send to first? Sending a message nobody asked for needs a stored destination (a chat id) per person, which we may not have yet. The spike (task 1) answers what exists.
2. **Silent.** Is the exact answer `HEARTBEAT_OK` right, or do you want the agent to decide with a separate "needs attention" flag?
3. **One heartbeat or one per person.** The plan above has one for the agent. A shared agent with several people might want one each.
