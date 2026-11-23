---
name: bxagents-tools-and-skills
description: >
  How to write tools (tools/ folder, @AITool) and skills (skills/, installed .agents/skills, the agent's own skill_save) for a bxAgents agent, with naming rules and how each is discovered. Use it when asked to give the agent a new ability, add a tool, or write, install or save a skill.
---
# Tools and skills

## Tools

Any `.bx` file under `tools/` (searched recursively) with an `@AITool` function becomes a tool for that agent.

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

- The description in `@AITool( "..." )` is what the model reads to decide when to call the tool. Make it specific.
- Scaffold one with `bxAgents add tool WeatherTools --function=getWeather --description="Get the weather for a city" --args="city, days:numeric"`. Add `--agent=<subagent>` to put it in a subagent's `tools/`. `--dry-run` shows the file only.
- `--args` entries are `name` or `name:type` (`string` default; `numeric`, `boolean`, `array`, `struct`, `date`, `any`).
- The file's base name is its entry name. Two tool files with the same base name (even in different subfolders) fail validation.
- Dotfiles are ignored. `tools/` is copied into the app on every `build`, so remove a file from the project to remove it from the app.
- A tool belongs only to the agent whose folder it is in. A root agent's tools are not given to subagents, and the reverse.
- Check the result with `bxAgents inspect --section=tools`.

### Tools from modules

Tools that modules register (bx-ai built-ins, `bx-playwright`) are not attached automatically. Name them in `Agent.yml`:

```yaml
tools:
  - now@bxai              # one tool
  - "*@bxplaywright"      # every tool of that module (quote the *)
```

A bare name (`now`) is an error. Own tools win over a module tool with the same name. bx-ai's file tools need `toolOptions.bxai.allowedPaths` (see bxagents-build-agent).

### Names of tools bxAgents adds

They are `{type}_{action}` in lower case: `note_remember`, `note_forget`, `skill_save`, `vault_list`, `vault_request`, `routine_schedule`, `routine_list`, `routine_update`, `routine_pause`, `routine_resume`, `routine_run`, `routine_delete`, `report_save`, `report_list`, `report_read`. Follow the same shape for your own.

## Skills

A skill is a folder holding a `SKILL.md`: YAML frontmatter (`name`, `description`) and a markdown body. The model sees only the name and description, and loads the body with `loadSkill(name)` when a task calls for it. So the description must say when to use the skill.

```text
skills/
└── release-notes/
    └── SKILL.md
```

```markdown
---
name: release-notes
description: >
  Use this skill when writing release notes for a version.
---
Steps and rules go here.
```

Scaffold with `bxAgents add skill release-notes --description="Use this skill when writing release notes"`. The name is lowercase letters, digits and hyphens. Every skill in the build is available to the model; there is no per-agent wiring.

### Naming

The name is the frontmatter `name:` if present, else the folder name. Two skills with the same name fail validation. A folder without a `SKILL.md` is ignored.

### The three levels

| Level | Where | Written by | `origin` |
|---|---|---|---|
| Installed | `.agents/skills/` in the project | `bxAgents skills install` or a global skills tool | `installed` |
| Ships with the agent | `skills/` in the project (and extensions) | you | `project` |
| The agent's own | `skills/` in the data home | the agent, with `skill_save` | `agent` |

- Yours wins over installed with the same name.
- The agent cannot replace levels 1 or 2. It can overwrite a skill it wrote itself.
- `/skills` in chat and `GET /skills` list them with their origin. `bxAgents skills show NAME` and `/skills NAME` read one.

### Installing from the registry (skills.boxlang.io)

```bash
bxAgents skills find release
bxAgents skills install owner/repo/skill     # goes to .agents/skills/, recorded in .agents/skills.lock.json
bxAgents skills list
bxAgents skills update [name...] [--dry-run]
bxAgents skills remove <name>
```

`.agents/skills/` stays out of source control and `.agents/skills.lock.json` is committed; `build` restores what the lock lists. A skill is instructions the agent follows, so read it before shipping it.

### Skills the agent saves

The root agent can call `skill_save( name, description, content )` after a task that took real steps and will come up again. The skill is written to the data home and is in the skill list at once, with no restart.

- Each save is approved by a person unless `skills.autoApprove: true`.
- Limits: description up to 500 characters, content up to 20,000, up to 50 agent-saved skills.
- A name is letters, digits, `.`, `_`, `-`.
- Subagents cannot save skills. `skills.agentCanSave: false` removes the tool.
- Saved skills are in `backup` and `restore`. To remove one, delete its folder in the data home.

```yaml
skills:
  agentCanSave: true
  autoApprove: false
```

More: docs/conventions/tools.md, docs/conventions/skills.md, docs/conventions/data.md
