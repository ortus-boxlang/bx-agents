# extensions-agent

A project that shows what extensions can do. Everything is in `extensions/`:

| Extension | Shape | Shows |
|---|---|---|
| `hello.bx` | one file | the smallest extension; a setting changed in `Agent.yaml`; a command line verb (`@Verb`) |
| `roll.bx` | one file | several commands; bare, simple, array and struct annotations; aliases |
| `deploy.bx` | one file | module-config properties, `onLoad()` / `onUnload()`, an admin-only command, injected `log` |
| `guard.bx` | one file | listening: `onChatInput` can stop or change a message, `@On` for bx-ai events |
| `audit.bx` | one file | `onChatCommandAfter`, an event of its own (`customInterceptionPoints`), an admin command |
| `pulse.bx` | one file | `@Key` on a command (Ctrl+G) and on a plain method, `@Status` next to the context size |
| `desk.bx` | one file | `@Prefix` (send a message, or answer at once), `@Source` with `@Suggest` (`@ticket:TCK-1`), and `ask()`/`choose()`/`confirm()` in `/newticket` |
| `panel/` | folder | `@Slot` (text, and `html : true`) and a `web/` folder: `panel.css`, `panel.js` and the page's `bxagents` script object |
| `helpdesk/` | folder | `tools/` and `skills/` an extension carries, read in place (nothing is copied into the project's own) |
| `loopback/` | folder | `gateways/Loopback.bx`: a gateway type, used by `gateways/loopback.bx` with `type : "loopback"` |
| `freeze/` | folder | `interceptors` in `configure()`: a class with properties that stops commands |
| `standup/` | folder | an `Extension.bx`, a command class in `commands/`, a BoxLang scheduler in `schedulers/` |

```bash
bxAgents chat            # try /extensions, /hello, /roll 2d6, /deploy, /standup, Ctrl+G
bxAgents extensions      # the list, from the shell
bxAgents greet --name=Ada   # a verb the hello extension adds
bxAgents serve           # the standup scheduler is registered with the served app; the page is at /chat
```

Turn something off in `Agent.yaml`: `extensions: { disable: [ roll, "deploy:status" ] }`.

Start one of your own with `bxAgents add extension <name>` (it asks what to bring), or put another project's extension to
work with `bxAgents extensions install`. Any folder here installs as it is, into another project or for yourself:

```bash
bxAgents extensions install ./examples/extensions-agent/extensions/standup --projectRoot=../my-agent
bxAgents extensions install ./examples/extensions-agent/extensions/hello.bx --system   # for you, in ~/.bxagents/extensions
```
