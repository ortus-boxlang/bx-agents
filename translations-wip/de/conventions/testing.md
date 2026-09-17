---
title: tests/
icon: phosphor-duotone:test-tube
summary: Jedes generierte Projekt erhält eine sofort lauffähige TestBox-Suite.
description: Jedes generierte Projekt erhält eine sofort lauffähige TestBox-Suite.
tags: [conventions, testing]
---

# tests/

Jedes über `bxAgents new` generierte Projekt erhält einen sofort lauffähigen `tests/`-Ordner: eine `tests/box.json` (die eine `testbox`-Abhängigkeit deklariert) und `tests/specs/AgentSpec.bx`, eine Beispiel-Spec, die sofort besteht.

```bash
cd my-agent/tests
box install       # holt testbox/ nach tests/testbox
cd ..
bxAgents test
```

!!! info
    Inspiriert vom eigenen dedizierten `tests/`-+-`box.json`-Ordner des Templates `coldbox-templates/boxlang` - angepasst an BxAgents' eigene, einfachere Teststory. Einen Agenten zu testen dreht sich um sein **Verhalten** (was er sagt, welche Tools er aufruft), nicht um HTTP-Routing, hier ist also gar keine `Application.bx`/ColdBox-Virtual-App beteiligt.

## Eine Spec schreiben

`bxModules.bxagents.models.testing.BaseAgentSpec` erweitern (eine Unterklasse von `testbox.system.BaseSpec`), statt `testbox.system.BaseSpec` direkt:

```javascript
// tests/specs/AgentSpec.bx
class extends="bxModules.bxagents.models.testing.BaseAgentSpec" {

	function run() {
		describe( "my-agent", function() {

			it( "responds to a greeting", function() {
				mockResponses( [ "Hello! How can I help you today?" ] )

				var response = agent.run( "Hi there" )

				expect( response ).toContainText( "Hello" )
			} )

		} )
	}

}
```

`BaseAgentSpec` baut den eigenen Agenten einmal pro Spec-Bündel (`beforeAll()`), gegen eine **wegwerfbare Temp-Kopie** des eigenen Projekts - es fasst nie das echte `.build/app` an, das Ausführen von Tests kann also nie einen echten `build`-/`serve`-/`package`-Zyklus stören (oder von ihm gestört werden). Der gebaute Agent wird als `agent` exponiert.

## Gegen den Mock-Provider testen

Standardmäßig baut `bxAgents test` den eigenen Agenten über `Agent.bx`s `test()`-Umgebungs-Override (automatisch generiert):

```javascript
// Agent.bx
function test() {
	return {
		model : "mock/mock-model"
	};
}
```

Das bedeutet, die eigenen Tests brauchen sofort **weder API-Schlüssel noch Netzwerkzugriff** - dieselbe `mock`-Provider-Konvention, die auch in BxAgents' eigener Testsuite durchgängig verwendet wird. Dieses Override bearbeiten, um eine Spec stattdessen gegen einen echten Provider laufen zu lassen (dafür ist ein echter API-Schlüssel in der Umgebung nötig, die die Tests ausführt).

### `mockResponses( responses )`

Skriptet die nächsten Antworten des Agenten, der Reihe nach konsumiert - eine pro LLM-Roundtrip, einschließlich der Zwischenschritte einer Tool-Aufruf-Schleife:

```javascript
mockResponses( [
	{ toolCalls: [ { name: "getWeather", arguments: { city: "Miami" } } ] },
	"It's sunny in Miami!"
] )

var response = agent.run( "What's the weather in Miami?" )
```

Ein bloßer String skriptet eine finale Antwort. Eine `{ toolCalls: [ { name, arguments } ] }`-Struktur skriptet einen Tool-Aufruf-Turn - das benannte Tool **wird tatsächlich echt ausgeführt** (gegen die eigene echte Implementierung unter `tools/`), und sein echter Rückgabewert ist es, was der nächste Roundtrip sieht; nur die eigene Antwort des LLM wird skriptet, nie das Verhalten des Tools.

## Custom Matcher

`BaseAgentSpec` registriert ein paar Matcher, zugeschnitten aufs Testen von Agentenverhalten, über TestBoxs eigenen Erweiterungspunkt `addMatchers()` - genau wie jeder eingebaute TestBox-Matcher verwenden, einschließlich Negation (`notTo...`):

| Matcher | Prüft |
|---|---|
| `toContainText( "substring" )` | Der tatsächliche Wert (üblicherweise ein Antwortstring) enthält den angegebenen Text, ohne Berücksichtigung von Groß-/Kleinschreibung. |
| `toHaveCalledTool( "toolName" )` | Die eigenen aufgezeichneten Provider-Requests des Agenten zeigen, dass er sich tatsächlich entschieden hat, das benannte Tool aufzurufen - nicht nur, dass das Tool existiert. |
| `toHaveReceivedMessage( "substring" )` | Irgendeine Nachricht, die tatsächlich an den Provider gesendet wurde (jede Rolle, jeder Roundtrip), enthielt den angegebenen Text - nützlich, um zu prüfen, dass der eigene Systemprompt/die eigenen Instruktionen das Modell tatsächlich erreicht haben. |

```javascript
expect( agent ).toHaveCalledTool( "getWeather" )
expect( agent ).notToHaveCalledTool( "getStockPrice" )
```

## Tests ausführen

```bash
bxAgents test
```

Führt die eigenen `tests/specs/**` des Projekts über TestBox aus, in einem frischen Kindprozess (damit er nie um BoxLangs eigene Class-Mapping-Caches mit irgendetwas anderem konkurriert, das gerade läuft). Gibt Bundle-/Suite-/Spec-Zähler sowie Gesamtzahlen für bestanden/fehlgeschlagen/Fehler/übersprungen aus, plus eine Zeile pro Fehlschlag, und beendet mit einem Exit-Code ungleich null, falls etwas fehlgeschlagen ist - geeignet als CI-Gate vor `deploy`.

!!! warning
    `bxAgents test` erfordert eine tatsächlich unter `tests/testbox` installierte `testbox` (`cd tests && box install`) - es meldet klar einen Fehler, statt still null Specs zu melden, falls das noch nicht geschehen ist.
