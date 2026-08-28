---
title: The Manifest
icon: phosphor-duotone:clipboard-text
summary: What every build records about exactly what went into the generated app.
description: What every build records about exactly what went into the generated app.
tags: [reference, build]
---

# The Manifest

Every `build` writes `.build/manifest.json` - BxAgents' own record of exactly what went into the generated app. `bxAgents inspect` pretty-prints it without rebuilding; `bxAgents package` copies a **redacted** version of it alongside the `.bxa` (see [Deployment & Secrets](deployment-and-secrets.md)).

## Schema

```json
{
	"manifestVersion": "1.0.0",
	"generator": { "name": "bx-agents", "version": "dev" },
	"agent": {
		"name": "my-agent",
		"description": "",
		"model": "openai/gpt-5",
		"environment": "development"
	},
	"files": [
		{ "category": "tools", "name": "Greeter", "path": "tools/Greeter.bx", "hash": "..." }
	]
}
```

| Field | Meaning |
|---|---|
| `manifestVersion` | Semver stamp for the manifest schema itself (currently `1.0.0`) - `package` refuses to run if this is unset or malformed. |
| `generator.name` / `generator.version` | Always `"bx-agents"` / the BxAgents module version that produced this build. |
| `agent` | Only safe, structural fields (`name`, `description`, `model`, `environment`) - **never** secrets. Secrets are never read into the manifest at all; they're resolved by bx-ai itself, live, at runtime. |
| `files` | One entry per discovered convention-folder item, sorted by category then path for deterministic ordering - independent of filesystem listing order. |

## Content hashes

Each `files[]` entry's `hash` is a SHA-256 of its content:

- **A file**: the hash of its content, with line endings normalized first (CRLF and LF checkouts of the same content hash identically).
- **A directory** (a skill folder, a subagent folder, a module folder): the hash of every contained file's own `relativePath:contentHash`, recursively, sorted for determinism - so renaming or editing any single file inside changes the whole folder's hash.

This is what makes rebuilding an unchanged project produce an **identical** manifest: same categories, same ordering, same hashes, every time - and it's exactly why changing one tool file's content only ever changes that one entry's hash, nothing else.

## Compatibility policy

`manifestVersion` exists so a future breaking change to this schema can be detected by anything reading `manifest.json` (a deploy target, a future `inspect` version, external tooling) - a tool encountering an unrecognized major version should refuse to guess at the shape and fail clearly, rather than silently misreading fields.