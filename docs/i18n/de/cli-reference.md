---
title: CLI-Referenz
icon: phosphor-duotone:terminal-window
summary: Jedes bxAgents-Verb und seine Flags.
description: Jedes bxAgents-Verb und seine Flags.
tags: [reference, cli]
---

# CLI-Referenz

```
Usage: boxlang module:bxAgents <verb> [options]
```

(oder die kürzere Form `bxAgents <verb> [options]` - siehe [Installation](getting-started/installation.md).)

## Globale Flags

Diese werden vor dem Verb-Dispatch verarbeitet und erreichen ein Verb nie - sie sind nur als allererstes Token sinnvoll, sodass sie nie mit einem gleichnamigen Flag eines Verbs kollidieren.

| Flag | Wirkung |
|---|---|
| `-h`, `--help`, `help` | Gibt die Nutzung aus (jedes Verb + Beschreibung) und beendet mit Exit-Code 0. Wird auch (Exit-Code 1) ausgegeben, wenn überhaupt kein Verb angegeben wird. |
| `-v`, `--version` | Gibt `bxAgents v{version}` aus und beendet mit Exit-Code 0. |

## Jedes Verb akzeptiert

`--projectRoot=<path>` (oder einen bloßen positionalen Pfad als erstes Nicht-Flag-Argument), um ein anderes Projekt als das aktuelle Verzeichnis anzusteuern. Vorrang: `--projectRoot`-Flag > erstes positionales Argument > aktuelles Arbeitsverzeichnis.

## Argumentsyntax

Folgt BoxLangs eigenen dokumentierten CLI-Konventionen:

| Form | Ergebnis |
|---|---|
| `--option` | `true` |
| `--option=value` / `--option="quoted value"` | `value` (umschließende Anführungszeichen werden entfernt) |
| `-o=value` | Kurzform mit einem Wert |
| `-o` | Kurzform, `true` |
| `-abc` | kombinierte Kurzform: `a`, `b`, `c` alle `true` |
| `--!option` / `--no-option` | Negation, `false` |
| alles andere | ein Positionsargument (das erste wird zum Fallback für das Projekt-Root) |

Wiederholte Optionen: die letzte gewinnt.

## Verben

::: cards
::: card title="new" icon="phosphor-duotone:sparkle" href="#new"
Ein neues Agentenprojekt anlegen.
:::
::: card title="build" icon="phosphor-duotone:hammer" href="#build"
Die vollständige Build-Pipeline ausführen.
:::
::: card title="test" icon="phosphor-duotone:test-tube" href="#test"
Die eigenen Tests/Specs des Projekts über TestBox ausführen.
:::
::: card title="serve" icon="phosphor-duotone:broadcast" href="#serve"
Einen echten boxlang-miniserver-Prozess starten.
:::
::: card title="chat" icon="phosphor-duotone:terminal-window" href="#chat"
Interaktives REPL gegen den gebauten Agenten.
:::
::: card title="invoke" icon="phosphor-duotone:paper-plane-tilt" href="#invoke"
Eine nicht-interaktive Runde - für Skripting/CI.
:::
::: card title="package" icon="phosphor-duotone:package" href="#package"
Ein gebautes Projekt in eine .bxa paketieren.
:::
::: card title="deploy" icon="phosphor-duotone:cloud-arrow-up" href="#deploy"
An ein echtes Deployment-Ziel ausliefern.
:::
::: card title="hash-password" icon="phosphor-duotone:key" href="#hash-password"
Ein Klartextpasswort für einen webui-users-Eintrag hashen.
:::
::: card title="inspect" icon="phosphor-duotone:magnifying-glass" href="#inspect"
Ein vorhandenes manifest.json hübsch ausgeben.
:::
::: card title="clean" icon="phosphor-duotone:broom" href="#clean"
Die .build/- und dist/-Ausgabe eines Projekts entfernen.
:::
:::

### `new`

Ein neues Agentenprojekt anlegen.

```bash
bxAgents new my-agent --model=openai/gpt-5 [--name=...] [--description=...]
```

- `--model` ist **erforderlich** - ein `provider/model`-Slug (siehe [Agent.bx](conventions/agent-bx.md)).
- `--name` fällt standardmäßig auf den eigenen Basisnamen des Zielverzeichnisses zurück.
- Verweigert die Ausführung, falls das Ziel bereits ein `Agent.bx` enthält.
- Erzeugt `Agent.bx`, `instructions.md`, jeden Konventionsordner (leer), einen sofort lauffähigen [`tests/`](conventions/testing.md)-Ordner (`tests/box.json` + `tests/specs/AgentSpec.bx`), eine `.env`, die `BOXLANG_HOME=.build/runtime` deklariert (passend zum eigenen begrenzten Runtime-Home von `serve` - siehe [Bekannte Einschränkungen](known-limitations.md) für genau das, was das abdeckt und was nicht), sowie eine `.gitignore` (`.build/`, `dist/`, `.env`). Überschreibt nie eine vorhandene `.env`/`.gitignore`.
- Führt außerdem `box install` innerhalb des neuen `tests/`-Ordners aus, sodass `bxAgents test` sofort funktioniert, ohne einen separaten Schritt `cd tests && box install`. Dies erfolgt nach bestem Bemühen: Ist `box` nicht im `PATH` oder schlägt die Installation fehl, gelingt `new` trotzdem - die Meldung weist nur darauf hin, es selbst auszuführen. `--skipInstall` übergeben, um diesen Schritt vollständig zu überspringen.

### `build`

Die vollständige [Build-Pipeline](build-pipeline.md) ausführen.

```bash
bxAgents build [--environment=production] [--verbose]
```

Schreibt `.build/app/` und `.build/manifest.json`. Schlägt mit jedem gesammelten Validierungsfehler fehl, falls das Projekt ungültig ist.

- `--verbose` gibt live eine Zeile pro Build-Phase aus, während sie läuft - was aufgelöst/entdeckt/validiert wurde, Zählwerte pro Phase (Modelle, Tools, Gateways, Warnungen usw.), welche Agenten am Ende in `config/WireBox.bx` unter welchen Namen registriert wurden, ob ein `schedules/Scheduler.bx` gefunden wurde, und eine abschließende Zeitzeile `Build completed in Xms`. Nützlich zur Fehlersuche bei einem langsamen oder unerwartet reagierenden Build. Ansonsten still - `--verbose` kostet nichts, wenn es nicht übergeben wird.

### `test`

Die eigenen [`tests/specs`](conventions/testing.md) des Projekts über TestBox ausführen.

```bash
bxAgents test
```

- Erfordert eine unter `tests/testbox` installierte `testbox` (`cd tests && box install`).
- Baut den Agenten standardmäßig gegen den `mock`-Provider (`Agent.bx`s `test()`-Umgebungs-Override) - kein API-Schlüssel oder Netzwerkzugriff nötig.
- Gibt Zähler für bestanden/fehlgeschlagen/Fehler/übersprungen sowie eine Zeile pro Fehlschlag aus und beendet mit einem Exit-Code ungleich null, falls etwas fehlgeschlagen ist.

### `serve`

Einen echten [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)-Prozess starten, der auf `.build/app` zeigt.

```bash
bxAgents serve [--port=8080] [--host=0.0.0.0]
```

- Erfordert einen vorherigen `build` - schlägt klar fehl, falls `.build/app` nicht existiert.
- Schlägt klar fehl, falls `boxlang-miniserver` nicht im `PATH` gefunden wird.
- Schreibt `.build/miniserver.json` (Rewrites aktiviert, `rewriteFileName: "index.bxm"`, Health-Check an), bevor der Start erfolgt.
- Begrenzt das eigene BoxLang-Runtime-Home des Servers auf `.build/runtime` (über `serverHome`) statt auf das geteilte Standardverzeichnis `~/.boxlang`, sodass der Compiled-Class-Cache und die Konfigurations-Overrides jedes Projekts isoliert sind - und `clean` fegt es kostenlos mit, da es `.build` ohnehin komplett löscht. `invoke --server` erhält das ebenfalls, da es intern `serve` wiederverwendet. Das gilt **nicht** für `chat`/`build`/`test`/den standardmäßigen `invoke` - siehe [bekannte Einschränkungen](known-limitations.md).

### `chat`

Interaktives REPL gegen den gebauten Agenten, unter Verwendung von BoxLangs eigener `MiniConsole` zum Zeilenlesen.

```bash
bxAgents chat
```

- Erfordert einen vorherigen `build`.
- Lädt `GeneratedAgentFactory.bx` direkt (kein ColdBox-/WireBox-Container beteiligt) und ruft `buildAgent()` einmal pro Sitzung auf - genau dieselbe Factory, die auch die HTTP-Routen von `serve` verwenden, sodass `chat` und HTTP nie auseinanderlaufen.
- `exit` oder `quit` eingeben, um zu beenden.
- Braucht ein echtes interaktives TTY (`MiniConsole` ruft `stty` für den Raw-Modus auf) - funktioniert nicht per Pipe oder nicht-interaktiv.

### `invoke`

Eine einzelne, nicht-interaktive Runde gegen den gebauten Agenten: eine Nachricht senden, die Antwort ausgeben, beenden. Existiert für Skripting/CI, wo die TTY-Anforderung von `chat` ein hartes Hindernis ist.

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
bxAgents invoke --message="..." --server [--port=<port>]
```

- Erfordert einen vorherigen `build`.
- **Standard (ohne `--server`)**: lädt `GeneratedAgentFactory.bx` direkt (kein ColdBox-Container, kein HTTP) und ruft den Agenten einmal auf - derselbe In-Prozess-Pfad, den auch `chat` intern nutzt, nur ohne die REPL-Schleife. Keine Voraussetzung durch `serve`/ein Gateway.
- **`--server`**: startet einen echten, wegwerfbaren `boxlang-miniserver`-Prozess (wie `serve`), sendet die Nachricht als echten HTTP-Request über die vom Projekt via `toAi()` exponierte Route und fährt den Server danach wieder herunter. Nutzt den tatsächlich bereitgestellten Pfad (ColdBox-Routing, Interceptors, Gateways) statt der In-Prozess-Abkürzung. Erfordert einen `gateways/*.bx`-Eintrag mit `{ exposes: "agent", path: "..." }` (siehe [gateways](conventions/gateways.md)) - schlägt klar fehl, falls keiner existiert. `--port` fällt standardmäßig auf einen freien, kurzlebigen Port zurück, damit es nie mit einem bereits laufenden `serve` kollidiert.
- `--json` gibt `{"response": "..."}` statt der reinen Textantwort aus.

### `package`

Ein gebautes Projekt in eine `.bxa` paketieren.

```bash
bxAgents package [--version=1.0.0]
```

- Erfordert einen vorherigen `build` - liest `.build/manifest.json`; schlägt klar fehl, falls es fehlt.
- `--version` ist standardmäßig `1.0.0`.
- Schreibt `dist/{agentName}-{version}.bxa`, eine begleitende `.sha256` sowie eine geschwärzte Kopie von `manifest.json`. Siehe [Deployment & Secrets](deployment-and-secrets.md).

### `deploy`

Ein gebautes/paketiertes Projekt über die pluggable [`deploy/`](conventions/deploy.md)-Konvention an ein echtes Deployment-Ziel ausliefern.

```bash
bxAgents deploy --name=production
# oder, die reine Flag-Kurzform (nur lokal):
bxAgents deploy --destination=/path/to/somewhere [--target=local]
```

- `--name=<entry>` leitet an das Ziel weiter, das der benannte `deploy/<entry>.bx`/`.json`-Eintrag angibt (`local`, `ssh`, `ftp`, `sftp`, `docker` oder `digitalocean`).
- Die reine Flag-Form (`--target=local --destination=...`, oder gar kein `--target`) funktioniert ohne vorhandenen `deploy/`-Ordner - nur `local` unterstützt das; jedes andere Ziel benötigt einen benannten Eintrag, da es mehr Konfiguration braucht, als ein paar Flags tragen können.
- `local`/`ssh`/`ftp`/`sftp` erfordern ein vorheriges `package`; `docker`/`digitalocean` erfordern einen vorherigen `build` (sie bauen direkt aus `.build/app`).
- `ftp`/`sftp` benötigen das Modul [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp), installiert neben BxAgents (siehe [Installation](getting-started/installation.md)).

### `hash-password`

Ein Klartextpasswort in den `passwordHash`-Wert umwandeln, den der [`users`](conventions/web-ui.md)-Block eines `webui`-Eintrags akzeptiert.

```bash
bxAgents hash-password --password="correct horse battery staple"
```

- `--password` ist **erforderlich**.
- Gibt den Hash auf stdout aus - `pbkdf2$<iterations>$<salt>$<derivedKey>`, PBKDF2-HMAC-SHA256, pro Aufruf gesalzen. Bedenkenlos committebar: Es ist Einweg, und dasselbe Passwort zweimal zu hashen ergibt zwei unterschiedliche (beide gültige) Hashes.
- Bewusst identisch zum Hasher gehalten, den die generierte Web-UI selbst zur Anmeldeprüfung nutzt - ein hier erzeugter Hash lässt sich dort immer verifizieren.

### `inspect`

Ein vorhandenes `.build/manifest.json` hübsch ausgeben, ohne neu zu bauen.

```bash
bxAgents inspect [--json]
```

- Erfordert einen vorherigen `build`.
- Gibt Agentenname, Modell, Umgebung, Manifest-Version, Generator-Name/-Version und Dateianzahl aus.
- `--json` gibt das rohe Manifest als JSON statt der menschenlesbaren Zusammenfassung aus - nützlich für Skripting.

### `clean`

Die `.build/`- und `dist/`-Ausgabe eines Projekts entfernen.

```bash
bxAgents clean
```

- Entfernt ausschließlich `.build` und `dist` - Quell-Konventionen (`Agent.bx`, `tools/` usw.) werden nie angefasst.
- Meldet "Nothing to clean", falls keines der beiden Verzeichnisse existiert.
