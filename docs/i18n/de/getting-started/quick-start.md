---
title: Schnelleinstieg
icon: phosphor-duotone:rocket-launch
summary: "Der vollständige Lebenszyklus eines Projekts: Gerüst erstellen, bearbeiten, bauen, ausführen."
description: "Der vollständige Lebenszyklus eines Projekts: Gerüst erstellen, bearbeiten, bauen, ausführen."
tags: [getting-started]
---

# Schnelleinstieg

Diese Seite führt durch den vollständigen Lebenszyklus eines BX-Agents-Projekts: Gerüst erstellen, bearbeiten, bauen, ausführen.

## 1. Ein Projekt anlegen

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` ist erforderlich (ein `provider/model`-Slug - siehe [Agent.bx](../conventions/agent-bx.md) dafür, wie er geparst wird). `--name` und `--description` sind optional; `--name` fällt standardmäßig auf den eigenen Namen des Zielverzeichnisses zurück.

Das erzeugt:

```
my-agent/
├── Agent.bx
├── instructions.md
├── tools/
├── skills/
├── subagents/
├── models/
├── gateways/
├── schedules/
├── mcp/
├── interceptors/
├── modules/
└── tests/
    ├── box.json
    └── specs/
        └── AgentSpec.bx
```

`Agent.bx` sieht so aus:

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

Es `extends` bx-ais eigenes `AiAgent`, es *ist* also der Agent - erben und direkt an der Klasse hinzufügen, was der Agent auch braucht. Siehe [Agent.bx](../conventions/agent-bx.md).

Jeder Konventionsordner wird leer angelegt - Dateien zu denen hinzufügen, die der eigene Agent tatsächlich braucht, und den Rest löschen (oder einfach ignorieren).

## 2. Bearbeiten

`instructions.md` öffnen und den Systemprompt des Agenten schreiben. Ein Tool hinzufügen:

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

Siehe den Abschnitt [Konventionen](../conventions/agent-bx.md) für jeden anderen Ordner (`skills/`, `subagents/`, `gateways/`, `schedules/`, `mcp/`, `interceptors/`, `models/`, `modules/`).

## 3. Testen

```bash
cd tests && box install && cd ..   # einmalig, um testbox/ zu holen
bxAgents test
```

Die generierte `tests/specs/AgentSpec.bx` besteht sofort - sie baut den Agenten gegen den `mock`-Provider (kein API-Schlüssel oder Netzwerk nötig) und prüft eine skriptierte Antwort. Siehe [tests/](../conventions/testing.md) für `mockResponses()` und die eigenen Specs zur Verfügung stehenden Custom Matcher (`toHaveCalledTool` usw.).

## 4. Bauen

```bash
bxAgents build
```

Führt die vollständige [Build-Pipeline](../build-pipeline.md) aus - Konfigurationsauflösung, Discovery, Validierung, Codegenerierung, Manifest-Normalisierung - und schreibt eine echte ColdBox-Anwendung nach `.build/app/`, plus `.build/manifest.json`. `bxAgents build --environment=production` ausführen, um gegen einen Umgebungs-Override von `Agent.bx` zu bauen (siehe [Agent.bx](../conventions/agent-bx.md)).

Scheitert das Projekt an der Validierung (doppelte Tool-Namen, ein fehlerhafter Cron-Ausdruck, ein unbekannter Modell-Provider, ...), schlägt `build` mit jedem gesammelten Fehler fehl - nicht nur mit dem ersten.

## 5. Ausführen

Zwei Wege, mit dem gebauten Agenten zu sprechen - beide laden dieselbe `GeneratedAgentFactory.bx` und bauen denselben Agentenbaum, laufen also nie auseinander:

**Interaktiv, vom Terminal aus:**

```bash
bxAgents chat
```

**Über HTTP**, über einen echten [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)-Prozess:

```bash
bxAgents serve --port=8080
```

Hat das Projekt einen `gateways/*`-Eintrag mit `{ exposes: "agent", path: "/api/chat" }`, ist der Agent jetzt unter `POST http://localhost:8080/api/chat/invoke` erreichbar (und `/stream`, `/batch`, `/info` - siehe [gateways/](../conventions/gateways/index.md)).

!!! warning
    Der allererste Request an die `toAi()`-Route einer frisch gestarteten App kann vorübergehend fehlschlagen - siehe [Bekannte Einschränkungen](../known-limitations.md). Vor einer Nutzung unter Last einen Warm-up-Request senden.

## 6. Inspizieren, paketieren, ausliefern

```bash
bxAgents inspect              # .build/manifest.json hübsch ausgeben
bxAgents package --version=1.0.0   # schreibt dist/my-agent-1.0.0.bxa + .sha256
bxAgents deploy --destination=/path/to/somewhere   # kopiert die neueste .bxa dorthin
```

Siehe [Das Manifest](../manifest.md) und [Deployment & Secrets](../deployment-and-secrets.md).

## 7. Aufräumen

```bash
bxAgents clean
```

Entfernt nur `.build/` und `dist/` - eigene Quell-Konventionen (`Agent.bx`, `tools/` usw.) werden nie angefasst.

## Nächste Schritte

- Jeden Konventionsordner unter [Konventionen](../conventions/agent-bx.md) durchgehen.
- Die funktionierenden Beispielprojekte unter [`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples) ansehen.
- Die Flags jedes Verbs in der [CLI-Referenz](../cli-reference.md) nachschlagen.
