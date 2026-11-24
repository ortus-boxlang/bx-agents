# The course kit

What the course "Introduction to BxAgents" gives you to follow it with no account and no key.

| Path | What it is |
| --- | --- |
| `fakellm.bxs` | The scripted model: a small server that speaks the OpenAI chat protocol and only says what `demos/model.json` tells it to |
| `demos/model.json` | Its answers. Open it to see how little there is to it |
| `resume.sh` | `kit/resume.sh <lesson>` puts `acme-support/` back to the state after that lesson, if you get lost |
| `checkpoints/` | One folder per lesson that changes the project: the project's files as that lesson leaves them |

Start the model, and leave it running in its own terminal:

```bash
cd kit
boxlang fakellm.bxs
```

It listens on port 8080, which is where BxAgents looks for an `openai-compatible` model by default. Stop it
with Ctrl+C.

The checkpoints are made by the course checker (`boxlang tools/course/check-course.bxs`), which replays every
lesson, so they cannot drift from the text.
