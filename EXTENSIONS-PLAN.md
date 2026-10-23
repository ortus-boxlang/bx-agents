# BxAgents extensions: plan (draft 1)

Goal: build on top of BxAgents, and let ForgeBox modules install and self-register, to add commands, gateways, web UI, key bindings, TUI pieces and CLI verbs.

## Decisions so far

| Question | Answer |
|---|---|
| Authors | Module authors and project authors, same contract |
| Discovery | Conventions in a folder, plus a code route. A module's `ModuleConfig.bx` can carry the same conventions and self-register |
| Surfaces | Terminal chat, web page, chat platforms, server API, CLI verbs, new gateways |
| Conflicts | Last loaded wins, listed at startup |
| Trust | Installed modules load, nothing to approve |
| Web | Slots and ColdBox interception points that write to a buffer |
| TUI | Declared pieces only: commands, keys, status items, composer prefixes, `@` sources, Reply screens. No raw terminal access |

## Shape

One registry, two ways in, many surfaces.

```
ExtensionRegistry
  commands        ICommand          (exists: models.chat.commands)
  keys            KeyAction         (extends KeyMap)
  statusItems     StatusItem        (hint row / web header chip)
  prefixes        ComposerPrefix    (generalises ! and #)
  atSources       AtSource          (generalises @file)
  gateways        IGateway          (type name usable in Agent.yaml)
  webSlots        WebSlot           (HTML/JS per named slot)
  cliVerbs        verb class        (ModuleConfig.cli exists)
```

### Way in 1: conventions

Found in every installed module's root, then in the project, in that order. Same folder names in both.

```
chat/commands/*.bx      one class per command (ICommand)
chat/keys/*.bx          KeyAction: id, default keys, what it runs
chat/status/*.bx        StatusItem: text(context), refresh on turn/clear/resume
chat/prefixes/*.bx      ComposerPrefix: char, handle(line) -> Reply or attachment
chat/sources/*.bx       AtSource: trigger, list(query), resolve(pick)
gateways/*.bx           a gateway class; type name = file name
web/slots/<slot>.html   markup for a slot (or .bx that returns it)
web/assets/             static JS/CSS served under the web path
cli/*.bx                one verb per file
```

### Way in 2: code

BxAgents announces `onBxAgentsExtensions` once all modules are loaded, with the registry as data. A module's `ModuleConfig.bx` listens and registers anything the folders cannot express (a command built from config, a key added at runtime).

```
function onBxAgentsExtensions( data ) {
    data.registry.command( new MyCommand() )
    data.registry.statusItem( "ci", () => "ci: green" )
}
```

Both routes land in the same registry, so a feature is testable one way.

### Order and conflicts

Core, then modules in load order, then the project. A later item with the same name replaces the earlier one. `bxAgents extensions` (and `/extensions` in the chat) lists everything loaded, who provided it, and what it replaced.

## Surfaces

- **Commands**: already run on terminal, web, gateways and the server API (`transports()`). Extensions get the same flags and the same admin rule.
- **Keys**: an extension action has an id like `mymodule.deploy`, default keys, and runs a command line. It appears in `/keys` and can be rebound in `bxAgents.yml` like any other.
- **Status items**: `text(context)` for the hint row and the web header chip. Refreshed with the context chip's triggers (turn, clear, compact, resume, notes change).
- **Prefixes and `@` sources**: `!`/`#` and `@file` become the first members of these two kinds. Terminal only.
- **Gateways**: a gateway class registers under a type name. `Agent.yaml` uses it like a built-in (`type: mychat`); `build` validates its options from a declared schema.
- **Web**: slots `head`, `header`, `sidebar`, `messageActions`, `composer`, `footer`. Two ways to fill a slot: a file under `web/slots`, or a ColdBox interceptor on `onBxAgentsWebSlot` that appends to the buffer (`data.buffer.append(...)`, `data.slot`). The page asks `GET /slots/{name}` and mounts the HTML. A small `window.bxagents` object gives JS the conversation id, `runCommand(line)` and events.
- **Server API**: commands over `/__bxagents/command`; slots and assets over the web path.
- **CLI**: module `cli` structs already work; add discovery from `cli/` and list verbs in help and completions.

## Slices (each its own PR)

1. Registry, scanner and `onBxAgentsExtensions`; commands only; `bxAgents extensions` verb; docs and a test module.
2. Keys, status items.
3. Prefixes and `@` sources (move `!`, `#`, `@file` onto them).
4. Web slots, interceptor point, assets, `window.bxagents`.
5. Gateway types.
6. CLI verb discovery, completions, `/extensions`.
7. Extension kit: sample module, testing helpers, authoring guide (EN, mirror, ES).

## Still to settle

1. Versioning: should a module state which extension API it targets (`bxAgentsApi: 1`) and be skipped with a warning when it does not match?
2. Should a project be able to switch one extension off by name in `Agent.yaml`, even though installed modules load by default?
3. Slot output: server-rendered once per page load, or fetched again when the conversation changes?
4. Names: `chat/` as the folder for terminal and web chat pieces, or one folder per kind at the module root?
