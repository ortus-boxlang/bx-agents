---
title: models/
icon: phosphor-duotone:brain
summary: Wiederverwendbare, benannte Modellkonfigurationen, aus Agent.bx namentlich referenziert.
description: Wiederverwendbare, benannte Modellkonfigurationen, aus Agent.bx namentlich referenziert.
tags: [conventions, models]
---

# models/

`models/` erlaubt es, wiederverwendbare, benannte Modellkonfigurationen als je eine `.bx`- oder `.json`-Datei zu definieren, aus `Agent.bx`s `model`-Feld namentlich referenziert (ohne `/`, damit es nicht mit einem `provider/model`-Slug verwechselt wird):

```javascript
// models/summarizer.bx
class {

	function configure() {
		return {
			provider : "openai",
			model    : "gpt-5-mini"
		};
	}

}
```

```javascript
// Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init( name: "my-agent", model: aiModel( provider: "openai", params: { model: "gpt-5-mini" } ) )
		return this
	}

	// Überschreibt das eigene Modell der Klasse oben - löst gegen models/summarizer.bx auf
	function configure() {
		return {
			model : "summarizer"
		};
	}

}
```

## Discovery-Regeln

- Ein Eintrag pro oberster `.bx`- oder `.json`-Datei direkt unter `models/` (nicht rekursiv).
- Der Eintragsname ist der Basisname der Datei (`summarizer.bx` → `summarizer`).
- Dotfiles und Dateien mit unbekannter Erweiterung (wie eine für eigene Notizen im Ordner belassene `README.md`) werden ignoriert.
- Zwei Dateien, die auf denselben Namen auflösen, schlagen bei der Validierung mit einem Fehler wegen doppeltem Namen fehl.

## Validierung

Hat `Agent.bx`s `model` keinen `/`, muss es **entweder** ein bekannter Core-Provider-Name sein (siehe [Agent.bx](agent-bx.md#the-model-slug)) **oder** zum Namen eines `models/`-Eintrags passen - alles andere schlägt bei der Validierung mit einem klaren Fehler "no provider and does not match any models/ entry" fehl.
