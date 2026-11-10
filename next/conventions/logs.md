---
title: logs
icon: phosphor-duotone:file-text
summary: One log file per area in the data home, read from the terminal or, for admins, in the web page.
description: One log file per area in the data home, read from the terminal or, for admins, in the web page.
tags: [conventions, logs]
---

# Logs

An agent writes what it does, and what goes wrong, to log files in the `logs/` folder of its [data home](data.md). There is one file per area, so a broken chat app is not buried in the noise of a busy API:

```
<data home>/logs/
  agent.log       startup, errors in a turn, tool failures
  gateways.log    every chat app: connect, disconnect, send failures. The gateway's name starts each line
  routines.log    routines: created, changed, run, skipped, failed, delivered
  heartbeat.log   each tick of the routine scheduler that did something
  api.log         refused calls and sign-in failures
```

A file appears when its first line is written. `routines.log` and `heartbeat.log` are for the routines feature, which is not in yet.

A line looks like this:

```
[2026-11-09T09:15:11,300] [main] [ERROR] [GATEWAYS] [my-agent] [telegram] Could not start: Telegram rejected the configured bot token: Unauthorized
```

## What is never written

A log is for finding out what happened, not for keeping what was said.

- No message from a person, and no token, password or key. Callers do not pass them, and every line is cleaned all the same: bearer tokens, Telegram, Slack, GitHub and OpenAI style tokens, and the value after a name such as `password`, `secret`, `api_key` or `access_token` are replaced by `***`.
- Writing a log never stops the work it describes. A log that cannot be written is skipped.

## Rotation

The logs are written with BoxLang's own logging, so BoxLang rolls and removes them by its own rules: by default a file rolls at 100 MB, files are kept for 90 days and all logs together are capped at 5 GB. Change that with the `logging` settings of the BoxLang runtime (`maxFileSize`, `maxLogDays`, `totalCapSize` in `boxlang.json`). BX Agents adds no settings of its own for it.

`backup` does not include the logs.

## Reading them

**In the terminal:**

```bash
bxAgents logs                                     # which logs there are and how big
bxAgents logs gateways                            # the last 100 lines of the gateways log
bxAgents logs gateways --tail=500 --level=warn --grep=telegram
bxAgents logs api --json
```

`--level` shows that level and anything more serious (`debug`, `info`, `warn`, `error`), `--grep` keeps the lines that contain the text (case does not matter), and `--tail` is how many lines, up to 1000. Only the end of a log is read, so a big log is as quick as a small one.

**In the web page**, for an admin, **Settings** has a **Logs** item and a **Chat apps** item (see [the web UI](web-ui.md#logs-and-chat-apps)). A small red count on the Settings button says errors were logged since the app started.

**Over the API**, for an admin: `GET /logs` lists the logs and how many sources logged an error since the app started, and `GET /logs?area=gateways&tail=200&level=warn&q=text` gives lines. The client has `logs()`. See [the agent API](agent-bx.md).

## Chat apps

`GET /gateways` (and **Chat apps** in the web page) says, for each chat app the project names:

- whether it is **connected**, **stopped**, **failing** (stopped, with an error logged) or **not registered**;
- which of its credentials are set, by the name of the environment variable and set or not set, never the value;
- when it last had a conversation, and its last error.

The chat apps themselves are still set up in `gateways/<name>.bx` and `.env`, and read when the app starts. See [gateways](gateways/index.md).
