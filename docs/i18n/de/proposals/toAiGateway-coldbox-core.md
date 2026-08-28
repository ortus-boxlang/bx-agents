---
title: toAiGateway() für ColdBox Core
icon: phosphor-duotone:lightbulb
summary: "Entwurfsvorschlag: ein gateway-förmiges Gegenstück zu ColdBoxs eigenem toAi()."
description: "Entwurfsvorschlag: ein gateway-förmiges Gegenstück zu ColdBoxs eigenem toAi()."
tags: [proposals]
---

# Vorschlag: `toAiGateway()` — ein nativer ColdBox-Routing-DSL-Terminator für die bx-ai-Gateway-Webhook-Oberfläche

Status: Entwurf, verfasst von BxAgents aus (`ortus-boxlang/bx-agents`). Update seit dem ersten
Entwurf: `coldbox-platform` (konkret ColdBox selbst, `Router.cfc`) WURDE später in derselben
Session angehängt und direkt gelesen — die Cross-Owner-Grenze erwies sich als
Session-Zustand, nicht als dauerhaft; sobald das Zip von `ColdBox/coldbox-platform` von
seiner echten Download-URL geholt und entpackt wurde, wurde dessen Quelltext
`system/web/routing/Router.cfc` vollständig gelesen. Das löste die beiden unten als "noch zu bestätigen"
gelisteten Punkte, und korrigierte, wichtiger noch, einen echten Fehler, den der
`toAi()`-/`IAiRunnable`-Abschnitt dieses Vorschlags aus einem früheren,
nur-dokumentationsbasierten Durchgang geerbt hatte (siehe die Korrekturhinweise inline).

## Warum

ColdBox 8.1 liefert zwei KI-spezifische Routing-DSL-Terminatoren aus:

- `route(pattern).toAi(target)` — 4 automatisch registrierte Routen (`invoke`/`stream`/`batch`/`info`)
  gegen ein `IAiRunnable`-Ziel.
- `route(pattern).toMCP(target)` — 1 Route, dispatcht an `MCPRequestProcessor`.

bx-ai liefert außerdem eine dritte HTTP-Oberfläche aus, für die es überhaupt keinen ColdBox-Terminator gibt: die
`IGateway`-/`aiGatewayRegistry()`-Channel-Adapter-Webhook-Oberfläche (Slack-/Webhook-Zustellung,
Human-in-the-Loop-Genehmigung), vorgelagert durch einen festen 3-Routen-Prozessor
(`bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()`). Heute bedeutet
sie aus einer ColdBox-App heraus zu nutzen, 3 einfache Routen von Hand an einen Passthrough-Handler zu verdrahten.
Das ist genau die Art von Verdrahtung, die `toAi()`/`toMCP()` bereits existieren, um Leuten zu ersparen,
sie für die anderen beiden bx-ai-Oberflächen von Hand zu erledigen — dieser Vorschlag schließt die Lücke
mit einem dritten Terminator, `toAiGateway()`, auf dieselbe Weise gebaut.

BxAgents (ein konventionsbasiertes Agenten-Framework-Modul über bx-ai + ColdBox)
liefert diese Verdrahtung in der Zwischenzeit selbst aus — siehe "Aktuelle Umgehung" unten — genau
damit sie gelöscht werden kann, sobald dies in Core landet.

## Was bereits belegt ist (in dieser Session gegen den `bx-ai`-Quellcode verifiziert)

`bxModules.bxai.models.gateway.http.GatewayRequestProcessor`:

```javascript
static string function processHttp() {
    var requestData = static.httpTransport.readRequest();
    var response     = route( requestData );
    static.httpTransport.writeResponse( response );
    return response.content;
}
```

- **Null Argumente, statisch.** Er liest das lebende HTTP-Request selbst (über `cgi.PATH_INFO`,
  `cgi.REQUEST_METHOD`, `getHTTPRequestData()`) und schreibt die Antwort selbst (über
  `bx:header`/`bx:content reset=true`). Er braucht ColdBoxs `event`/`rc`/`prc` für die eigene Logik
  nicht — und kann sie nicht nutzen.
- **Routet intern anhand von `cgi.PATH_INFO`**, erwartet genau 3 Formen:
  - `POST /gateways/{gatewayName}/events` — eingehendes Plattform-Event
  - `GET  /interactions/{requestID}` — eine ausstehende Genehmigungsinteraktion abfragen
  - `POST /interactions/{requestID}/decisions` — die Entscheidung eines Menschen einreichen
  - (plus `OPTIONS`-CORS-Preflight, ebenfalls intern behandelt)
- Da er Pfadsegmente selbst parst, muss, was auch immer davorsitzt, diese 3 Formen **wörtlich**
  exponieren (kein zusätzliches Pfad-Präfix), damit die Segmentanzahl-/Namensprüfungen in
  `GatewayRequestProcessor.route()` passen.
- `aiGatewayRegistry()` löst Gateways nach Namen auf; am Routing selbst hängt nichts vom Inhalt der
  Registry ab, nur, dass Gateways irgendwann registriert wurden, bevor ein Request eintrifft
  (typischerweise beim App-Start).

Das bedeutet, `toAiGateway()` braucht **überhaupt keine Adapter-Schnittstelle** — anders als
`toAi()`s `IAiRunnable` gibt es nichts, was eine Zielklasse implementieren müsste. Die gesamte Aufgabe
des Terminators besteht darin, die richtigen Routen auf den richtigen statischen Aufruf zu registrieren und ColdBox
zu sagen, danach nichts zu rendern (der Prozessor hat die echte Antwort bereits geschrieben).

## Vorgeschlagene Core-Implementierung

Ein einzelner Terminator, der 3 Routen automatisch registriert (spiegelt `toAi()`s "ein Aufruf → N
Routen"-Form) mit **keinem Ziel-Argument** (spiegelt `toMCP()`s zielloser Form, da das
Routing selbst namensgetrieben aus der URL kommt, nicht aus einer WireBox-Zuordnung):

```javascript
route( "/bxai" ).toAiGateway();
```

registriert, relativ zu wo auch immer `route()`s Muster verankert:

| Verb | Pfad | Verhalten |
|---|---|---|
| POST | `{pattern}/gateways/:gatewayName/events` | eingehendes Plattform-Event |
| GET  | `{pattern}/interactions/:requestID` | Interaktion abfragen |
| POST | `{pattern}/interactions/:requestID/decisions` | menschliche Entscheidung einreichen |

Alle 3 dispatchen an dieselbe generierte/interne Action, die nichts tut außer:

```javascript
function process( event, rc, prc ) {
    bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp();
    return event.noRender();
}
```

Offene Frage für wer auch immer das gegen echten `Route.bx`-Quellcode implementiert: ob ein
Präfix `{pattern}` sicher ist, gegeben, dass `GatewayRequestProcessor` `cgi.PATH_INFO`
unter der Annahme **kein Präfix** parst (siehe "wörtlich"-Hinweis oben). Zwei Wege, das aufzulösen, in Reihenfolge
der Präferenz:
1. `toAiGateway()` verankert immer an der App-Wurzel (ignoriert/lehnt ein nicht-leeres Muster ab),
   da die eigene Pfad-Parsing-Logik des Prozessors ohnehin kein Präfix vertragen kann.
2. Falls ColdBoxs URL-Rewriting `cgi.PATH_INFO` immer den vollständigen angefragten
   Pfad widerspiegeln lässt (typisch für rewrite-alles-auf-index.bxm-ColdBox-Deployments), würde
   ein Präfix transparent "einfach funktionieren", und das wäre gar keine Einschränkung — empirisch prüfen, bevor
   eine Option gewählt wird.

Standard-Routen-Modifikatoren (`.as()`, `.withModule()`, `.withDomain()` usw.) sollten auf dieselbe Weise gelten
wie bei `toAi()`/`toMCP()`.

## Aktuelle Umgehung (BxAgents, zu löschen, sobald dies landet)

BxAgents' Build-Pipeline generiert die entsprechende Verdrahtung heute von Hand:

- `RouterGenerator.bx` erzeugt, nur wenn mindestens ein Channel-Adapter-Gateway vom Typ
  `http` konfiguriert ist:
  ```javascript
  post( "/gateways/:gatewayName/events" ).toHandler( "Gateway.process" )
  get( "/interactions/:requestID" ).toHandler( "Gateway.process" )
  post( "/interactions/:requestID/decisions" ).toHandler( "Gateway.process" )
  ```
- `GatewayGenerator.bx` erzeugt ein generiertes `handlers/Gateway.bx` mit genau einer Action:
  ```javascript
  function process( event, rc, prc ) {
      bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()
      return arguments.event.noRender()
  }
  ```
- `aiGatewayRegistry().register( aiGateway( type, options ) )`-Aufrufe werden in
  `Application.bx onApplicationStart()` der generierten App eingefügt, einmal pro konfiguriertem
  Channel-Adapter-Gateway.

Sobald `toAiGateway()` in Core existiert, tauscht `RouterGenerator` seine 3 handgeschriebenen Routen
gegen einen `route( ... ).toAiGateway()`-Aufruf, und `GatewayGenerator` hört auf,
`handlers/Gateway.bx` überhaupt zu generieren — reine Löschung, keine neue BX-Agents-seitige Logik nötig.

## Testplan für den Core-PR

- Unit: `route(...).toAiGateway()` registriert genau 3 Routen, korrekte Verben/Pfade,
  Standard-Routen-Modifikatoren gelten.
- Integration: ein Live-Request an jeden der 3 Pfade erreicht
  `GatewayRequestProcessor::processHttp()` und liefert dessen Antwort wörtlich zurück (Statuscode, Header, Body) — ein Gateway vom Typ `mock` über `aiGatewayRegistry()` im
  Test-Harness registrieren (kein echtes Netzwerk/LLM-Aufruf nötig, `bx-ai` liefert einen literalen `"mock"`-
  Provider genau dafür aus).
- Regression: bestätigen, dass `event.noRender()` verhindert, dass ColdBox eine Antwort doppelt schreibt,
  nachdem `processHttp()` bereits eine über `bx:content reset=true` geflusht hat.

## Später in dieser Session bestätigt (Update)

`ColdBox/coldbox-platform` (8.1.0) wurde direkt geholt (`https://downloads.ortussolutions.com/ortussolutions/coldbox/8.1.0/coldbox-8.1.0.zip`)
und `system/web/routing/Router.cfc` vollständig gelesen. Beide hier ursprünglich als
"noch zu bestätigen" gelisteten Punkte sind jetzt aufgelöst, und eine frühere Annahme in genau diesem
Vorschlag war falsch und wurde korrigiert:

1. **Die Zielauflösung von `toAi(target)` — wie angenommen bestätigt.** Router.cfc:
   `var runnableInstance = isSimpleValue( capturedRunnable ) ? getInstance( capturedRunnable ) : capturedRunnable`.
   Ein String wird über WireBox `getInstance()` aufgelöst; ein lebendes Objekt wird direkt genutzt.

2. **Der echte `IAiRunnable`-Vertrag — KORRIGIERT, nicht das, was dieser Vorschlag ursprünglich sagte.**
   Der Abschnitt "Was bereits belegt ist" oben (unverändert, weiterhin korrekt für die Gateway-
   Oberfläche) wurde nur aus dem bx-ai-Quellcode geschrieben. Separat verließ sich BxAgents' eigene
   M8-Arbeit auf eine Beschreibung von `toAi()`s Ziel-Vertrag aus der *veröffentlichten Dokumentation*, die sich als
   falsch herausstellte: `invoke`/`stream`/`batch`/`info` sind die **Unterrouten-Namen**, keine Methodennamen,
   die `toAi()` am Ziel aufruft. Router.cfcs tatsächliche Closures rufen
   `runnableInstance.run( input, params, options )` und
   `runnableInstance.stream( onChunk, input, params, options )` auf — d. h. bx-ais eigene
   `IAiRunnable`-Schnittstelle (`bxModules.bxai.models.runnables.IAiRunnable`), die `AiAgent`
   bereits nativ über `AiBaseRunnable` implementiert. **Es ist überhaupt keine Adapter-Unterklasse
   nötig** — der Rückgabewert des bloßen `aiAgent()`-BIF erfüllt `toAi()` bereits.
   Der Generator von BxAgents wurde entsprechend korrigiert (kein
   `GeneratedAgentRunnable.bx`/`exposeAgentAsRunnable` mehr).

3. **WireBoxs `.toProvider(closure)`** — in dieser Session nicht erneut geprüft (Router.cfc berührt keine
   WireBox-Binder-Syntax); bleibt eine Annahme im `config/WireBox.bx`-Generator von BxAgents. Geringes Risiko:
   `.toProvider()` ist etabliertes, verbreitet genutztes WireBox-DSL, nur eben nichts, was dieser
   spezifische Quellcode-Durchgang gerade berührt hat.
