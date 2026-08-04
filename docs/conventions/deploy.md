# deploy/

Each `deploy/*.bx`/`.json` entry describes one deployment target attempt - a place to ship a built/packaged project to:

```javascript
// deploy/production.bx
class {

	function configure() {
		return {
			target       : "digitalocean",
			appName      : "my-agent",
			region       : "nyc",
			registry     : { type : "ghcr", repository : "myorg/my-agent" },
			httpPort     : 8080,
			instanceSize : "apps-s-1vcpu-1gb",
			envs         : [ { key : "OPENAI_API_KEY", scope : "RUN_TIME", type : "SECRET" } ]
		};
	}

}
```

Run it with:

```bash
bxAgents deploy --name=production
```

`deploy/` is deliberately **not** validated on every `build` - deployment config never affects the generated ColdBox app or its manifest, so checking it on every build would be pure overhead for projects that never deploy. It's only discovered and validated when `deploy` actually runs.

The simplest case needs no `deploy/` folder at all:

```bash
bxAgents deploy --destination=/path/to/somewhere
```

is shorthand for the `local` target. Every other target needs more configuration than a couple of flags can reasonably carry, so it requires a named `deploy/*` entry (`--name=<entry>`).

## Targets

Every target implements the same `IDeploymentTarget` interface (`struct function deploy( config, context )`) - the `target` field picks which one runs.

### `local`

Copies the newest packaged `.bxa` (by file modification time, never a lexical filename sort - `v9.0.0` would otherwise sort after `v10.0.0`) to a destination directory.

```javascript
{ target: "local", destination: "/path/to/somewhere" }
```

Requires a prior `bxAgents package`.

### `ssh`

Ships the newest `.bxa` to a bare server over `scp`, then optionally runs a remote restart command over `ssh`.

```javascript
{
	target         : "ssh",
	host           : "example.com",
	user           : "deploy",
	remotePath     : "/srv/apps/my-agent",
	identityFile   : "/home/me/.ssh/id_rsa",   // optional
	restartCommand : "systemctl restart my-agent"   // optional
}
```

Requires a prior `bxAgents package`. Shells out to the real `scp`/`ssh` binaries - they must be installed and on `PATH`.

### `docker`

Builds a Docker image from `.build/app` and pushes it to a container registry, shelling out to the real `docker` CLI.

```javascript
{
	target   : "docker",
	registry : { type : "ghcr", repository : "myorg/my-agent" },   // type: "dockerhub" | "ghcr" | "docr"
	tag      : "1.0.0"   // optional, defaults to "latest"
}
```

Requires a prior `bxAgents build` (not `package` - it builds straight from `.build/app`). The built-in Dockerfile template is based on the real, published [`ortussolutions/boxlang:miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/docker) image - override it entirely by adding your own `deploy/Dockerfile`, or point at a different one via `dockerfile: "/absolute/path"`.

`docker login` only runs when both `DOCKER_USERNAME` and `DOCKER_PASSWORD` are set in the environment - a registry an already-authenticated local Docker daemon can reach needs neither.

### `digitalocean`

Deploys to a [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform) app - "push and minimal provision": builds/pushes the image exactly like `docker` (reuses the same `registry` config shape), then either redeploys an existing app or creates one from scratch if it doesn't exist yet.

```javascript
{
	target        : "digitalocean",
	appName       : "my-agent",
	region        : "nyc",   // optional, defaults to "nyc"
	registry      : { type : "docr", repository : "myorg/my-agent" },   // "namespace/repo" form
	httpPort      : 8080,   // optional, defaults to 8080
	instanceSize  : "apps-s-1vcpu-1gb",   // optional
	instanceCount : 1,   // optional, defaults to 1
	envs          : [ { key : "OPENAI_API_KEY", scope : "RUN_TIME", type : "SECRET" } ]   // optional
}
```

`registry.repository` must be in `namespace/repo` form (e.g. `myorg/my-agent`) - the DigitalOcean App Spec's `image` block needs the namespace and repository as separate fields. Requires a prior `bxAgents build`.

An existing app is found by name (`GET /v2/apps`, filtered client-side on `spec.name`) rather than remembering a local app-ID file, so this works identically from any machine or CI runner with no local state to go stale.

## Secrets stay external

No target ever reads a secret (API token, SSH key, registry password) from `deploy/*` config - every credential is resolved from an environment variable at deploy time, matching this project's existing rule that provider API keys are never embedded in a build or package (see [Deployment & Secrets](../deployment-and-secrets.md)):

| Target | Env var(s) |
|---|---|
| `ssh` | none required - `identityFile` is a path to a key file you manage yourself |
| `docker` | `DOCKER_USERNAME`, `DOCKER_PASSWORD` (both optional - only used if set) |
| `digitalocean` | `DOCKER_USERNAME`/`DOCKER_PASSWORD` (for the image push) + `DIGITALOCEAN_TOKEN` (required) |

## Validation

- `target` must be one of `local`, `ssh`, `docker`, `digitalocean`.
- Entry names must be unique across `deploy/*.bx` and `deploy/*.json`.
- Each target's required fields (above) are checked when `deploy` runs - `local` needs `destination`, `ssh` needs `host`/`user`/`remotePath`, `docker`/`digitalocean` need `registry.repository`, `digitalocean` also needs `appName`.
