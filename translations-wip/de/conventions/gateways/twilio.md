---
title: "gateways/ - Twilio SMS"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, twilio]
---

# Twilio SMS

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt Twilio SMSs eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit Twilio SMS kommuniziert.

```javascript
// gateways/twilioChannel.bx
class {
	function configure() {
		return {
			type            : "twilio",
			accountSidEnvVar: "TWILIO_ACCOUNT_SID",
			authTokenEnvVar : "TWILIO_AUTH_TOKEN",   // also the X-Twilio-Signature HMAC key
			fromEnvVar      : "TWILIO_FROM_NUMBER"   // the Twilio phone number outbound sends go through, E.164
			// messagingServiceSid: "MG..."   // optional - if set, used instead of `from` on outbound sends
			// publicUrl: "https://your-real-public-host/webhooks/twilio"   // optional override for reverse-proxy/tunnel deployments - see the Twilio subsection below
		};
	}
}
```

`type: "twilio"` erfordert `accountSidEnvVar`, `authTokenEnvVar` und `fromEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TwilioGateway", { "accountSid" : getSystemSetting( "TWILIO_ACCOUNT_SID", "" ), "authToken" : getSystemSetting( "TWILIO_AUTH_TOKEN", "" ), "from" : getSystemSetting( "TWILIO_FROM_NUMBER", "" ) } ) )
```

## Twilio SMS - ein genuin anderes Signaturschema, und ein zweigleisiges Response-Modell

`TwilioGateway` ist Webhook-getrieben, auf dieselbe Weise wie `WhatsAppCloudGateway`/`TeamsGateway`:

```javascript
post( "/webhooks/twilio" ).toHandler( "Twilio.process" )
```

Zwei Dinge machen Twilios eigenen Webhook-Vertrag sinnvoll anders als jedes andere Gateway in diesem Projekt, beide treu portiert aus Vercel Eves echtem Twilio-Kanal (`packages/eve/src/public/channels/twilio/`, MIT-lizenziert):

- **Der eingehende Body ist form-urlencoded** (`Body`, `From`, `To`, `MessageSid`, `AccountSid`), nicht JSON - `TwilioGateway` parst ihn selbst (`java.net.URLDecoder`), keine JSON-Deserialisierung beteiligt.
- **Die Signaturprüfung ist `X-Twilio-Signature`: HMAC-SHA1, base64-kodiert** (jedes andere Webhook-Gateway in diesem Projekt nutzt HMAC-SHA256, hex-kodiert) - die Signing-Basis ist die exakte Request-URL, gefolgt von jedem POST-Parameter, dessen eigenes `key & value` direkt verkettet (keine Trennzeichen), alphabetisch nach Schlüssel sortiert. Da die URL selbst Teil dessen ist, was signiert wird, braucht ein hinter einem Reverse-Proxy oder Tunnel laufendes Projekt (wo die von ColdBox über `event.getUrl()` gesehene URL nicht dem entspricht, wohin Twilio tatsächlich gepostet hat) den optionalen `publicUrl`-Konfigurations-Override - dieselbe Art von Falle, die Eves eigene Dokumentation für dessen `webhookUrl`-Option markiert.
- **Die synchrone Webhook-Antwort ist immer ein leeres TwiML `<Response></Response>`** - Twilios eigenes klassisches zweigleisiges Modell. Die echte Agentenantwort wird später, außerhalb des Kanals, über einen separaten `deliver()`-REST-Aufruf an die Messages-API gesendet, sobald der asynchrone Turn von GatewaySession abgeschlossen ist - passend zu Eves eigenem `emptyTwilioResponse()` exakt (Eve nutzt nie eine synchrone TwiML-`<Message>`, um inline zu antworten).

Ausgehende Sends sind Basic-Auth-REST-Aufrufe an `POST /2010-04-01/Accounts/{AccountSid}/Messages.json`, form-kodierter Body (`To`, `Body`, und entweder `From` oder `MessagingServiceSid`, falls konfiguriert). v1 ist nur SMS-Text - Eves eigener Twilio-Kanal ist ein kombinierter SMS+Sprach-Kanal (`/voice`-Routen, `<Gather>`/`<Say>`-TwiML, Anruftranskription); nichts der sprachspezifischen Teile wurde portiert.

!!! warning
    SMS hat **überhaupt keine native Button-/Karten-Affordanz** (über Eves eigene Dokumentation bestätigt), Human-in-the-Loop ist also auf dieselbe Weise verschlechtert wie bei E-Mail - `getDeclaredCapabilities()` lässt `"interactiveActions"` weg (und `"threads"`, da Twilios klassische Messages-API auch kein natives Antwort-/Zitat-Konzept hat). `requestHumanInteraction()` sendet eine reine Text-SMS, die die erlaubten Entscheidungen auflistet; anders als E-Mail (das ein `[bxagents:<requestID>]`-Tag in der Betreffzeile einbettet, um die eventuelle Antwort zu korrelieren) hat SMS keine Betreffzeile zum Taggen - der ausstehende Request wird stattdessen nach der eigenen Telefonnummer des Absenders (conversationID) geschlüsselt, eine v1-Vereinfachung, die höchstens einen offenen HITL-Request pro Telefonnummer gleichzeitig annimmt.

!!! info
    Anders als Eve (das überhaupt keine Längenbegrenzungslogik hat - durch Grep über dessen Quellcode als fehlend bestätigt - und sich vollständig auf Twilios eigene serverseitige Segmentierung verlässt), wendet `TwilioGateway` trotzdem `MessageChunker` bei 1600 Zeichen an (Twilios eigene dokumentierte Einzelnachrichten-Konkatenationsgrenze), für Konsistenz mit dem Chunking-Verhalten jedes anderen Gateways. Das HMAC-SHA1-Signaturschema wurde in dieser Session gegen einen unabhängig berechneten Python-`hmac`-/`hashlib`-Referenzwert querverifiziert, bevor der BoxLang-Implementierung vertraut wurde, dieselbe Disziplin wie bei WhatsApp Clouds eigenem HMAC-SHA256-Schema.
