# The embeds tour

A narrated recording of the [embeds](../../../docs/conventions/embeds.md) feature: an admin makes an embed in the panel of the Embeds page, a visitor chats from another website, the admin reads the counters, rotates the key, then searches the list, turns the embed off with its switch and sees that Delete asks first. It makes the screenshots and the video in `docs/assets` (`webui-embeds-*.png`, `video/embeds-tour.*`).

The voice is the one of every demo video of this repo, Kokoro `af_heart` (see [`../narration`](../narration)). The answers come from the scripted model [`model.json`](model.json), so nothing needs a key.

1. Build and serve a project like [`examples/embed-agent`](../../../examples/embed-agent) with an admin token, its model pointed at the scripted one: `providers: openai-compatible: options: baseURL: http://127.0.0.1:8099/v1`, and `boxlang tools/demo/fakellm.bxs --port=8099 --script=tools/demo/embeds/model.json`. Start from a data home with no embeds in it, so the first picture is the empty list.
2. Make the narration: `python tools/demo/narration/narrate.py <kokoro folder> tools/demo/embeds/narration.json <wav folder>`.
3. Record: `AGENT=http://127.0.0.1:8080 ADMIN_KEY=<the token> node tools/demo/embeds/record.mjs <wav folder> <out folder>`. It needs `playwright` and `ffmpeg`.

Each scene is held as long as its narration, and the narration is mixed in where the scene starts. Screenshots are taken without the demo pointer.
