---
name: bxagents-subagents-routines
description: >
  How to add subagents (the subagents/ folder and how the root agent delegates) and how routines work (prompts people schedule by asking the agent, how they are defined, run and scheduled), plus developer schedulers in schedules/. Use it when asked to split work across agents or to run something on a schedule.
---
# Subagents and routines

## Subagents

A subagent is an ordinary agent project under `subagents/<folder>/` (an `Agent.yaml` plus `instructions.md`, optionally its own `tools/`, `skills/`, `mcpServers`).

```text
my-agent/
├── Agent.yaml            # subAgents: [ researcher ]
├── instructions.md
└── subagents/
    └── researcher/
        ├── Agent.yaml
        └── instructions.md
```

```yaml
# root Agent.yaml
name: my-agent
model: openai/gpt-5
subAgents:
  - researcher
```

- `subAgents` lists folder names. At build time bx-ai wraps each subagent as a tool the parent can call, so the parent delegates by calling it.
- Scaffold with `bxAgents add subagent researcher --model=openai/gpt-5 --description="Finds sources"`. `--parent=<folder>` nests it under another subagent; `--profile=<name>` uses a project profile instead of a model.
- All subagent folders sit flat under the root project's `subagents/`. A subagent's own `subAgents` names its sibling folders, not nested folders.
- Each subagent has its own `tools/` and `tools:` list. Nothing is inherited from the parent.
- Cycles (`A -> B -> A`) fail validation; a shared child (diamond) is fine. A subagent name that is not a real folder fails validation.
- Every agent's declared `name` must be unique in the whole project. The folder name is only for wiring; the declared `name` is what code retrieves it by.
- Each subagent keeps its own memory. In the terminal, `/agent` lists them and `/agent researcher` talks to one directly (starts a new conversation). The web app has a Talk to menu. A gateway always talks to the root agent.
- Only the root agent gets `routine_*` tools and can save skills.

## Routines

A routine is a prompt the agent runs on a schedule, as the person who made it, using that person's notes, volumes and connectors. People make them by asking the agent ("every weekday at 9, check the build"). They live in the chat database, not in the project.

Routines are off by default:

```yaml
routines:
  enabled: true
  minInterval: 5m
  timezone: Europe/Madrid
```

Other keys: `maxPerUser` (20), `maxParallel` (2), `maxPromptLength` (4000), `approvalTimeout` (24h), `summaryLength` (1500), `maxReportSize` (256kb), `maxReportFiles` (500).

### How they are defined

The agent calls `routine_schedule` and a person approves it. A schedule is a 5-field cron expression (`0 9 * * 1-5`) or an interval (`every 30m`, `every 2h`, `every 1d`). The answer says when it first runs.

The other tools: `routine_list`, `routine_update` (needs approval), `routine_pause`, `routine_resume`, `routine_run`, `routine_delete` (needs approval), and for reports `report_save`, `report_list`, `report_read`. Only the root agent has them, and a routine's own run cannot make or change routines.

### How they run

- A heartbeat checks every minute and starts due routines, at most `maxParallel` at once. It runs only while the app is served.
- Each run is a normal turn in its own conversation `routine-<name>-<id>`, listed in the person's conversations. A run never overlaps itself.
- A run that needs a tool approval waits; after `approvalTimeout` it is cancelled and counts as a failure.
- Three failures in a row pause the routine. After downtime a due routine runs once, not once per missed time.
- Destination: by default the gateway chat the person asked from, else the routine's own conversation. `routine` keeps it in the conversation; `gateway:<name>` sends a summary to that gateway chat (only after the gateway has heard from the chat).
- Reports are files saved with `report_save` under `<data home>/routines/`. Nothing deletes them automatically; a person cleans them.

### Managing them

| Where | How |
|---|---|
| Chat | `/routines [all]`, `/routine <name> [run\|pause\|resume\|delete confirm\|reports\|report <file>]` (terminal and web page, not gateways) |
| CLI | `bxAgents routines list\|show\|add\|edit\|pause\|resume\|run\|delete\|reports\|report\|clean` |
| Web app | the Routines page |
| API | `GET /routines` and related routes |

```bash
bxAgents routines add --name=check-build --schedule="0 9 * * 1-5" --prompt="Check the build and tell me what broke"
bxAgents routines run check-build        # marks it due; starts within a minute of a served app
bxAgents routines clean check-build --older-than=30d --yes
```

`delete` needs `--yes` and keeps reports. `clean` only lists unless `--yes`. Logs are `routines.log` and `heartbeat.log` (`bxAgents logs routines`).

## Schedulers (for the developer)

`schedules/*.bx` are BoxLang schedulers shipped with the project, run by the app while served. They are not per person and get no connector tools.

```javascript
// schedules/Nightly.bx
class {
	function configure() {
		task( "cleanup" )
			.everyDayAt( "00:00" )
			.call( () => run( "clean up old tickets" ) )
			.withNoOverlaps()
	}
}
```

Scaffold with `bxAgents add schedule digest --when="weekdays 08:30" --prompt="Summarize yesterday" [--agent=<subagent>]`. Check with `bxAgents inspect --section=schedule`.

More: docs/conventions/subagents.md, docs/conventions/routines.md, docs/conventions/schedules.md
