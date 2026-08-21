---
title: deploy/
icon: phosphor-duotone:cloud-arrow-up
summary: "Ein Eintrag pro Deployment-Ziel: local, ssh, ftp, docker, digitalocean."
description: "Ein Eintrag pro Deployment-Ziel: local, ssh, ftp, docker, digitalocean."
tags: [conventions, deployment]
---

# deploy/

Jeder `deploy/*.bx`/`.json`-Eintrag beschreibt einen Deployment-Zielversuch - einen Ort, an den ein gebautes/paketiertes Projekt ausgeliefert wird:

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

Ausgeführt mit:

```bash
bxAgents deploy --name=production
```

`deploy/` wird bewusst **nicht** bei jedem `build` validiert - Deployment-Konfiguration beeinflusst nie die generierte ColdBox-App oder ihr Manifest, sie bei jedem Build zu prüfen wäre also purer Overhead für Projekte, die nie deployen. Sie wird nur entdeckt und validiert, wenn `deploy` tatsächlich läuft.

Der einfachste Fall braucht überhaupt keinen `deploy/`-Ordner:

```bash
bxAgents deploy --destination=/path/to/somewhere
```

ist Kurzform für das `local`-Ziel. Jedes andere Ziel braucht mehr Konfiguration, als ein paar Flags vernünftigerweise tragen können, es erfordert also einen benannten `deploy/*`-Eintrag (`--name=<entry>`).

## Ziele

Jedes Ziel implementiert dieselbe `IDeploymentTarget`-Schnittstelle (`struct function deploy( config, context )`) - das `target`-Feld entscheidet, welches läuft.

::: cards
::: card title="local" icon="phosphor-duotone:folder-simple" href="#local"
Die neueste `.bxa` in ein Zielverzeichnis kopieren. Kein `deploy/`-Ordner nötig.
:::
::: card title="ssh" icon="phosphor-duotone:terminal-window" href="#ssh"
Über `scp` ausliefern, optional den entfernten Dienst über `ssh` neu starten.
:::
::: card title="docker" icon="phosphor-duotone:cube" href="#docker"
Ein Image aus `.build/app` bauen und in eine Registry pushen.
:::
::: card title="digitalocean" icon="phosphor-duotone:cloud-arrow-up" href="#digitalocean"
Push-und-minimal-Provisionierung gegen die DigitalOcean-App-Platform-API.
:::
::: card title="ftp / sftp" icon="phosphor-duotone:upload-simple" href="#ftp--sftp"
Die neueste `.bxa` über einfaches FTP oder SFTP in ein entferntes Verzeichnis ausliefern.
:::
:::

### `local`

Kopiert die neueste paketierte `.bxa` (nach Datei-Änderungszeit, nie eine lexikalische Dateinamensortierung - `v9.0.0` würde sonst nach `v10.0.0` sortieren) in ein Zielverzeichnis.

```javascript
{ target: "local", destination: "/path/to/somewhere" }
```

Erfordert ein vorheriges `bxAgents package`.

### `ssh`

Liefert die neueste `.bxa` über `scp` an einen nackten Server aus, führt danach optional einen entfernten Neustartbefehl über `ssh` aus.

```javascript
{
	target         : "ssh",
	host           : "example.com",
	username       : "deploy",
	remotePath     : "/srv/apps/my-agent",
	identityFile   : "/home/me/.ssh/id_rsa",   // optional
	restartCommand : "systemctl restart my-agent"   // optional
}
```

Erfordert ein vorheriges `bxAgents package`. Ruft die echten `scp`-/`ssh`-Binärdateien auf - sie müssen installiert und im `PATH` sein.

### `docker`

Baut ein Docker-Image aus `.build/app` und pusht es in eine Container-Registry, indem es die echte `docker`-CLI aufruft.

```javascript
{
	target   : "docker",
	registry : { type : "ghcr", repository : "myorg/my-agent" },   // type: "dockerhub" | "ghcr" | "docr"
	tag      : "1.0.0"   // optional, defaults to "latest"
}
```

Erfordert einen vorherigen `bxAgents build` (nicht `package` - es baut direkt aus `.build/app`). Die eingebaute Dockerfile-Vorlage basiert auf dem echten, veröffentlichten Image [`ortussolutions/boxlang:miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/docker) - komplett überschreibbar durch Hinzufügen einer eigenen `deploy/Dockerfile`, oder auf eine andere zeigen über `dockerfile: "/absolute/path"`.

`docker login` läuft nur, wenn sowohl `DOCKER_USERNAME` als auch `DOCKER_PASSWORD` in der Umgebung gesetzt sind - eine Registry, die ein bereits authentifizierter lokaler Docker-Daemon erreichen kann, braucht keines von beidem.

### `digitalocean`

Deployt an eine [DigitalOcean-App-Platform](https://www.digitalocean.com/products/app-platform)-App - "push and minimal provision": baut/pusht das Image genau wie `docker` (nutzt dieselbe `registry`-Konfigurationsform wieder), dann entweder redeployt eine bestehende App oder legt eine neu an, falls noch keine existiert.

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

`registry.repository` muss in der Form `namespace/repo` sein (z. B. `myorg/my-agent`) - der `image`-Block der DigitalOcean-App-Spec braucht Namespace und Repository als getrennte Felder. Erfordert einen vorherigen `bxAgents build`.

Eine bestehende App wird namentlich gefunden (`GET /v2/apps`, clientseitig auf `spec.name` gefiltert), statt sich eine lokale App-ID-Datei zu merken, das funktioniert also identisch von jeder Maschine oder jedem CI-Runner aus, ohne lokalen Zustand, der veralten könnte.

### `ftp` / `sftp`

Liefert die neueste `.bxa` über einfaches FTP oder SFTP in ein entferntes Verzeichnis aus, über die echte [`bx:ftp`](https://github.com/ortus-boxlang/bx-ftp)-Komponente - eine echte Laufzeitabhängigkeit dieses Projekts (wie `bx-ai`), nicht vendort. `remotePath` ist ein entferntes **Verzeichnis** - die hochgeladene Datei behält ihren eigenen Namen, dieselbe Konvention wie beim `scp`-Ziel von `ssh`.

```javascript
// deploy/ftp-production.bx
{
	target         : "ftp",
	host           : "ftp.example.com",
	username       : "deploy",
	passwordEnvVar : "FTP_PASSWORD",
	remotePath     : "/uploads/my-agent",
	port           : 21,       // optional, defaults to 21
	passive        : true,     // optional, defaults to true
	timeout        : 30,       // optional, seconds, defaults to 30
	proxyServer    : "proxy.company.com:8080"   // optional
}
```

```javascript
// deploy/sftp-production.bx
{
	target           : "sftp",
	host             : "sftp.example.com",
	username         : "deploy",
	key              : "/home/me/.ssh/id_rsa",   // passwordEnvVar OR key required
	passphraseEnvVar : "SFTP_KEY_PASSPHRASE",     // optional, only if the key itself is passphrase-protected
	fingerprint      : "SHA256:...",              // optional host key verification
	remotePath       : "/uploads/my-agent",
	port             : 22,       // optional, defaults to 22
	timeout          : 30        // optional, seconds, defaults to 30
}
```

Erfordert ein vorheriges `bxAgents package`. `ftp` erfordert ein `passwordEnvVar`; `sftp` akzeptiert entweder ein `passwordEnvVar` oder einen `key` (Pfad zu einer privaten SSH-Schlüsseldatei). `passwordEnvVar`/`passphraseEnvVar` benennen Umgebungsvariablen, die das echte Secret enthalten - **nie den Secret-Wert selbst** -, live zur Deploy-Zeit aufgelöst; `key` bleibt ein bloßer Pfad, da er selbst kein Geheimmaterial ist. Jede `bx:ftp`-Action wirft bei einem Fehler (Verbindung abgelehnt, Auth abgelehnt, eine negative Server-Antwort) statt einen weichen Fehler zurückzugeben - dieses Ziel fängt das ab und wirft es als klares `BxAgents.DeployFailed` erneut, wobei die Verbindung auch bei einem Fehler immer geschlossen wird.

## Secrets stay external

Kein Ziel liest je ein Secret (API-Token, SSH-Schlüssel, Registry-Passwort) aus der `deploy/*`-Konfiguration - jede Zugangsdaten wird zur Deploy-Zeit aus einer Umgebungsvariable aufgelöst, passend zur bestehenden Regel dieses Projekts, dass Provider-API-Schlüssel nie in einen Build oder ein Paket eingebettet werden (siehe [Deployment & Secrets](../deployment-and-secrets.md)):

| Ziel | Umgebungsvariable(n) |
|---|---|
| `ssh` | keine erforderlich - `identityFile` ist ein Pfad zu einer selbst verwalteten Schlüsseldatei |
| `docker` | `DOCKER_USERNAME`, `DOCKER_PASSWORD` (beide optional - nur genutzt, wenn gesetzt) |
| `digitalocean` | `DOCKER_USERNAME`/`DOCKER_PASSWORD` (für den Image-Push) + `DIGITALOCEAN_TOKEN` (erforderlich) |
| `ftp` / `sftp` | welche Umgebungsvariable(n) auch immer `passwordEnvVar`/`passphraseEnvVar` benennen - der Eintrag selbst trägt nur den NAMEN der Umgebungsvariable, nie ihren Wert (`key` ist ein Pfad, wie `identityFile` bei `ssh`) |

## Validierung

- `target` muss `local`, `ssh`, `docker`, `digitalocean`, `ftp` oder `sftp` sein.
- Eintragsnamen müssen über `deploy/*.bx` und `deploy/*.json` hinweg eindeutig sein.
- Die erforderlichen Felder jedes Ziels (oben) werden geprüft, wenn `deploy` läuft - `local` braucht `destination`, `ssh`/`ftp`/`sftp` brauchen `host`/`username`/`remotePath` (derselbe Feldname über alle drei hinweg), `docker`/`digitalocean` brauchen `registry.repository`, `digitalocean` braucht außerdem `appName`, `ftp` braucht außerdem `passwordEnvVar`, `sftp` braucht außerdem `passwordEnvVar` oder `key`.
