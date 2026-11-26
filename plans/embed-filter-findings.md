# Embed filter: what was proven (task 1)

Run on BoxLang 1.19.0 with bx-ai 3.8.0-snapshot, a scripted OpenAI-compatible model (`tools/demo/fakellm.bxs`, which
calls a tool only if the request offers it) and two tools, `docs_search` (on the list) and `delete_all` (not on it).
Spike files: `plans/spikes/` (`Filt.bx`, `run.bxs`, `model.json`).

## (a) A tool not on the list is refused when the model calls it: PROVEN

With nothing hidden (`--hide=false`) the model was offered both tools and called `delete_all`. `beforeToolCall`
returned `AiMiddlewareResult.reject(...)`. The tool body never ran (`TOOLS ACTUALLY RUN: docs_search`), and the model
got `[Tool call blocked: not on the embed list]` as the tool result and carried on.

## (b) The filter can hide unlisted tools from the model: PROVEN

`beforeLLMCall` gets `{ chatRequest, dataPacket }`. Filtering `dataPacket.tools` in place changes what is sent
(`--hide=true`: the model reported `Offered: docs_search`, and with `delete_all` never offered the scripted model
never tried it). Tool entries are in the provider's format, so the name is `t.function.name` (OpenAI shape) or `t.name`;
Gemini groups them under `functionDeclarations` (see `ConnectorToolMiddleware.keepAllowed`, which already handles both).

## What the middleware sees

- `beforeToolCall` context keys: `toolName, toolCall, toolArgs, tool, chatRequest`.
- `beforeLLMCall` context keys: `dataPacket (tools, model, messages), chatRequest`.
- Not measured here: how the filter knows a call is an embed call. The in-process run must put the embed id on the
  chat request or its options, and the filter reads it from `context.chatRequest`. Decided in task 5.

## Decision

Do both, as `ConnectorToolMiddleware` does: hide so the model does not waste a turn, and reject so a model that names a
hidden tool anyway (training, an earlier turn) still cannot run it. Hiding alone is not a guard.

## Measured end to end (task 5)

On a served app with a scripted model and the filter built in (`EmbedFilterMiddleware`): a visitor of an embed that lists only `docs_search` was offered `docs_search` and nothing else, the admin on the same agent was offered `delete_all, docs_search, loadSkill, skill_save`, and a request to wipe everything ran `delete_all` for the admin (a marker file appeared) and did not for the visitor (no file). The request carries the embed as `usageMetadata.embedId`, which every bx-ai request has as a property.
