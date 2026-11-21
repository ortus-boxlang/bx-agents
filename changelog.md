# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

----

## [Unreleased]

- **Terminal chat settings:** one registry of settings for how the chat looks and behaves (`fullscreen`, `header`, `spacing`, `theme`, `animations`, `thinking`, `tools`, `markdown`, `menuRows`, `notify`, `terminalTitle`, plus the message box's `prompt` and `widgets`), in the same `tui:` block of four places: the flag of one run (`--inline`, `--fullscreen`), the agent's own `settings.yml` in its data home, your `~/.bxagents/bxAgents.yml` (the fallback for every agent), and the project's `Agent.yaml`, then the default. `/settings` opens a panel that shows each value and where it comes from, changes it with the arrow keys and saves it, after asking once for each file, and `/settings name value [--global]` does it from the message box. Only the `tui:` lines of a file are edited
- **The chat opens full screen:** it clears the screen, draws a header with the name in big block letters (the style of the BoxLang runtime's banner), the version, the agent and the keys at the top, and keeps the message box at the bottom with a footer of the folder and branch, the context and the profile. `header: compact` or `hidden` shrink the header, `--inline` or `fullscreen: false` keep the old inline behaviour. The top bar of the box now says only who is writing by default, so the default widgets are none at the top and `folder`, `git`, `ctx` and `profile` at the bottom
- Initial development and setup of the project.
