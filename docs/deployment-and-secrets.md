# Deployment & Secrets

## Packaging

`bxAgents package` zips `.build/app/` into a portable `.bxa` artifact:

```bash
bxAgents package --version=1.0.0
```

produces, in `dist/`:

- `{agentName}-{version}.bxa` - the zipped app
- `{agentName}-{version}.bxa.sha256` - its checksum
- `manifest.json` - a **redacted** copy of the build manifest (see below)

Packaging twice in a row over the same build produces byte-identical zip bytes (deterministic entry order/timestamps) - useful for verifying a CI-built artifact matches a locally-built one.

`package` requires a prior `build` (it reads `.build/manifest.json`) and refuses to run - producing no `.bxa` - if `manifestVersion` is unset or malformed.

## Excluding files: `.bxaignore`

An optional `.bxaignore` at the project root, one glob pattern per line (`#`-prefixed lines are comments), excludes matching paths from the packaged `.bxa`:

```
# .bxaignore
*.log
scratch/
```

This is on top of a hard-coded, always-on exclusion of `.env`/`.env.*`/dotfiles at the packaging layer - even if `.bxaignore` doesn't mention them, and even if they somehow ended up inside `.build/app`, they never make it into the zip.

## Secret redaction

Secrets are never written into `manifest.json` in the first place - the manifest's `agent` block only ever contains safe, structural fields (`name`, `description`, `model`, `environment`). As defense-in-depth, `package` additionally walks the manifest recursively and replaces any struct key that **looks** like a secret with `[REDACTED]`:

```
(apikey | api_key | token | secret | password)$   (case-insensitive, any prefix)
```

This guards against a future field - or a caller passing a richer struct into `package` some other way - accidentally leaking a value, even though today's manifest never puts one there to begin with.

## Where real secrets live

BX Agents never resolves, stores, or embeds provider API keys, tokens, or passwords anywhere in a build or package. That's entirely bx-ai's job, at **runtime**: it reads them from the process environment following its own `<PROVIDER>_API_KEY`-style convention (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Set them however you normally manage secrets for a deployed process - an OS environment variable, a `.env` file loaded by your process manager (never committed, never packaged), or your platform's secret manager.

```bash
export OPENAI_API_KEY=sk-...
bxAgents serve
```

## Deploying

```bash
bxAgents deploy --destination=/path/to/somewhere   # local, flag-only shorthand
bxAgents deploy --name=production                  # any target, via deploy/production.bx
```

Four pluggable targets ship out of the box - `local` (copy the newest `.bxa` somewhere), `ssh` (ship it to a bare server), `docker` (build/push a container image), and `digitalocean` (deploy to a DigitalOcean App Platform app) - see [deploy/](conventions/deploy.md) for the full config shape of each and [CLI Reference](cli-reference.md#deploy) for the CLI flags.

No target ever reads a secret from `deploy/*` config - credentials (registry passwords, SSH keys, the DigitalOcean API token) are always resolved from environment variables at deploy time, the same "secrets stay external" rule as everywhere else in this doc. See [deploy/](conventions/deploy.md#secrets-stay-external) for the exact env var each target expects.

To run a packaged `.bxa` somewhere else manually: unzip it (it's a plain ColdBox app) and point `boxlang-miniserver` at the extracted directory, setting whatever secret environment variables that deployment needs.
