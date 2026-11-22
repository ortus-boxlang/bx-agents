---
name: bxagents-chat
description: >
  How to use the bxAgents terminal chat: starting it, the slash commands, default keys, /settings and the tui settings, sessions (/resume, /sessions), notes and the vault, and recording. Use it when asked how to talk to an agent in the terminal, change how the chat looks, or find an earlier conversation.
---
# The terminal chat

## Start it

```bash
bxAgents chat                      # agent loaded in this process (needs a prior build)
bxAgents chat --server             # throwaway local server: interceptors, schedulers, gateways are real
bxAgents chat --connect=http://127.0.0.1:8080 [--token=<t>] [--api-path=/where]   # a running server
bxAgents chat --no-tui             # plain line-by-line prompt
bxAgents chat --inline             # box under the last line, not pinned to the screen bottom
bxAgents chat --continue           # reopen the most recent conversation
bxAgents chat --session=2          # reopen one by its /sessions number or id
bxAgents chat --user=alice         # whose notes and conversations (default: local)
bxAgents chat --record=demo.cast
```

`--server` and `--connect` cannot be combined. A server that wants a token needs `--token` or `BXAGENTS_TOKEN`. `--connect` needs no local build.

## Keys (defaults)

| Key | Does |
|---|---|
| Enter | Send. While the agent works, it steers the run |
| Alt+Enter, Shift+Enter, Ctrl+J, or `\` then Enter | New line |
| Up / Down | Earlier and later messages (from the first or last line of the box) |
| Tab | Complete a `/command` or `@file` |
| Ctrl+A / Home, Ctrl+E / End | Start and end of the line |
| Ctrl+U, Ctrl+W | Delete to line start, delete the previous word |
| Ctrl+V | Add the picture on the clipboard |
| Ctrl+L | Clear the screen above the box (same as `/cls`) |
| Ctrl+C | Clear the box; on an empty box leave; while the agent works, stop it |
| Ctrl+D | Leave, on an empty box |
| Esc | Stop the agent at its next step |
| `?` alone, F1, Ctrl+/ , or `/keys` | Shortcuts panel with every key as bound now |

Change keys in `~/.bxagents/Agent.yml` under `chat.keys` (for example `newline: [ ctrl+n, alt+enter ]`). Actions: `submit`, `newline`, `historyPrevious`, `historyNext`, `clear`, `exit`, `deleteToStart`, `deleteWord`, `lineStart`, `lineEnd`, `complete`, `pasteImage`, `clearScreen`, `stop`. A bad entry is reported at start and the default is kept.

## Slash commands

Type `/` for a menu (Up/Down, Tab to fill, Enter to run). `/help` lists what you can run.

| Group | Commands |
|---|---|
| Conversations | `/new`, `/sessions [text]`, `/resume [n or id]`, `/name <title>`, `/fork [name]`, `/clear`, `/compact`, `/export [file] [--format=md\|html]`, `/cls`, `/exit` (`/quit`) |
| Know what is going on | `/info`, `/tools`, `/volumes`, `/agent [name]`, `/skills [name]`, `/routines [all]`, `/routine <name> [run\|pause\|resume\|delete confirm\|reports\|report <file>]`, `/context`, `/stats [days] [--by=model\|provider\|day\|user]`, `/keys`, `/logs [area] [--tail=N] [--level=warn] [--grep=text]` |
| Models | `/model`, `/profile [name]`, `/default`, `/ping [profile]` |
| Notes, vault, services | `/remember <text>`, `/notes [list\|add\|edit\|remove\|stats]`, `/vault [list\|status]`, `/connect [name]` |
| Your terminal | `/settings [name] [value\|reset] [--global]`, `/prompt [style]`, `/copy`, `/record [file\|stop]`, `/extensions [name]`, `/reload` |

Notes: `/settings`, `/prompt`, `/copy`, `/record`, `/profile`, `/default`, `/stats`, `/agent` and `/exit` work only in the terminal. `/logs` needs an admin. `/stats enable` writes `usage: true` to `Agent.yml` (rebuild after).

## Sessions

Every chat is a conversation in the project's chat database, listed under your user and shared with the web page. `/sessions` numbers them, newest first; `/resume 2` goes back to one and shows what was said. `/name` names the current one, `/fork` copies it and carries on in the copy. Messages are kept in the agent's memory, so after a restart they are there only if the memory is `file` or `jdbc`; the `cache` memory is lost when the process ends. From a shell: `bxAgents sessions list|rename|fork|delete|export|import`.

## Settings

`/settings` opens a panel (Up/Down choose, Left/Right/Enter change, `r` reset, `g` switch between this agent and every agent, Esc close). From the box: `/settings header compact`, add `--global` for every agent, `reset` to drop the agent's value.

| Setting | Values (default first) |
|---|---|
| `fullscreen` | `true`, `false` |
| `header` | `full`, `compact`, `hidden` |
| `spacing` | `normal`, `compact` |
| `theme` | `auto`, `dark`, `light` |
| `animations` | `true`, `false` |
| `thinking` | `show`, `hide` |
| `tools` | `detail`, `summary`, `hidden` |
| `markdown` | `rendered`, `source` |
| `menuRows` | `8` (3 to 20) |
| `notify` | `off`, `bell`, `system` |
| `terminalTitle` | `true`, `false` |

The first of these with a value wins: the run flag (`--inline`, `--fullscreen`), `~/.bxagents/<agent name>/Agent.yml`, `~/.bxagents/Agent.yml`, `tui:` in the project's `Agent.yml`, the default. All use the same block:

```yaml
tui:
  header: compact
  tools: summary
```

The message box look is `prompt` (`bars` default, `bars-hints`, `rule`, `box`, `panel`) and `widgets: { top, bottom }` (`agent`, `profile`, `folder`, `user`, `clock`, `machine`, `git`, `date`, `session`, `elapsed`, `ctx`). `/prompt box` and `/prompt top +git -clock` change them for this chat only.

## Notes and vault

The agent keeps notes only when `Agent.yml` has a `notes` block. `/remember <text>` saves a note about you. `/notes` opens a screen (`a` add, `e` or Enter edit, `d` remove, `t` or Tab switch yours and the agent's, `s` stats, Esc back). Removing the agent's own note over `--connect` needs an admin token. `/vault` opens the vault screen; a secret value is never typed in a command.

## Files, pictures, your machine

`@` lists files under the folder you started in; `@path/to/file` sends a text file with the message; `@picture.png` sends an image (up to 4 per message, 5 MB each). `!command` runs a shell command on your machine and its output goes with your next message; `!!command` shows it only. `#function( args )` calls one BoxLang built-in the same way, `##` shows only. Switch these off with `chat.shell: false` or `chat.bifs: false` in `~/.bxagents/Agent.yml`.

## Recording

`bxAgents chat --record=demo.cast`, or `/record demo.cast` then `/record stop`, saves the screen as an asciicast. It holds what you typed in the box and all agent output, including tool arguments. It needs the full terminal screen, not `--no-tui`.

More: docs/guides/terminal-ui.md, docs/guides/slash-commands.md, docs/cli-reference.md (the chat section)
