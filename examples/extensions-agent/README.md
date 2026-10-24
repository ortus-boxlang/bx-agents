# extensions-agent

A project that shows what extensions can do. Everything is in `extensions/`:

| Extension | Shape | Shows |
|---|---|---|
| `hello.bx` | one file | the smallest extension; a setting changed in `Agent.yaml` |
| `roll.bx` | one file | several commands; bare, simple, array and struct annotations; aliases |
| `deploy.bx` | one file | module-config properties, `onLoad()` / `onUnload()`, an admin-only command, injected `log` |
| `standup/` | folder | an `Extension.bx`, a command class in `commands/`, a ColdBox scheduler in `schedulers/` |

```bash
bxAgents chat            # try /extensions, /hello, /roll 2d6, /deploy, /standup
bxAgents extensions      # the list, from the shell
bxAgents serve           # the standup scheduler is registered with the served app
```

Turn something off in `Agent.yaml`: `extensions: { disable: [ roll, "deploy:status" ] }`.
