# extensions-agent

A project that shows what extensions can do. Everything is in `extensions/`:

| Extension | Shape | Shows |
|---|---|---|
| `hello.bx` | one file | the smallest extension; a setting changed in `Agent.yaml` |
| `roll.bx` | one file | several commands; bare, simple, array and struct annotations; aliases |
| `deploy.bx` | one file | module-config properties, `onLoad()` / `onUnload()`, an admin-only command, injected `log` |
| `guard.bx` | one file | listening: `onChatInput` can stop or change a message, `@On` for bx-ai events |
| `audit.bx` | one file | `onChatCommandAfter`, an event of its own (`customInterceptionPoints`), an admin command |
| `freeze/` | folder | `interceptors` in `configure()`: a class with properties that stops commands |
| `standup/` | folder | an `Extension.bx`, a command class in `commands/`, a BoxLang scheduler in `schedulers/` |

```bash
bxAgents chat            # try /extensions, /hello, /roll 2d6, /deploy, /standup
bxAgents extensions      # the list, from the shell
bxAgents serve           # the standup scheduler is registered with the served app
```

Turn something off in `Agent.yaml`: `extensions: { disable: [ roll, "deploy:status" ] }`.
