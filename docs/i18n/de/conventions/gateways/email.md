---
title: "gateways/ - Email"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, email]
---

# Email

Teil der Push-Style-[gateways/](index.md)-Familie - dort werden die gemeinsame Regel "Secrets bleiben extern", `GatewaySession`, und der Scheduler erklärt, unter dem diese Gateways laufen. Diese Seite behandelt Emails eigene Config-Form und (wo BxAgents etwas Plattform-Spezifisches tut) wie sie mit Email kommuniziert.

```javascript
// gateways/emailChannel.bx
class {
	function configure() {
		return {
			type              : "email",
			imapHostEnvVar    : "IMAP_HOST",
			imapUsernameEnvVar: "IMAP_USERNAME",
			imapPasswordEnvVar: "IMAP_PASSWORD",
			fromAddressEnvVar : "EMAIL_FROM_ADDRESS"
			// imapPort: 993   // optional override - defaults to 993 (IMAPS)
			// pollIntervalSeconds: 60   // optional override - defaults to 60
		};
	}
}
```

`type: "email"` erfordert `imapHostEnvVar`, `imapUsernameEnvVar`, `imapPasswordEnvVar` und `fromAddressEnvVar`. Wird auf dieselbe Weise geprüft wie der `secretEnvVar` eines Channel-Adapter-`http`-Eintrags.

Generierte Registrierungsanweisung:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.EmailGateway", { "imapHost" : getSystemSetting( "IMAP_HOST", "" ), "imapUsername" : getSystemSetting( "IMAP_USERNAME", "" ), "imapPassword" : getSystemSetting( "IMAP_PASSWORD", "" ), "fromAddress" : getSystemSetting( "EMAIL_FROM_ADDRESS", "" ) } ) )
```

## E-Mail - serverseitige Abhängigkeiten, und verschlechtertes Threading/HITL

`EmailGateway` ist das einzige Push-Style-Gateway, das nicht direkt mit der API seiner Plattform spricht. Ausgehende Mails laufen durch ColdBoxs eigenes Modul [`cbmailservices`](https://coldbox.ortusbooks.com/the-basics/modules/core-modules) (`MailService@cbmailservices`, dessen `BXMail`-Protokoll - das wiederum nur BoxLangs eigene `bx:mail`-Komponente aus dem `bx-mail`-Modul aufruft), statt eines handgerollten HTTP-/SMTP-Aufrufs. **Beide sind echte, serverseitige Modul-Installationen** - sie sind als eigene `box.json`-`dependencies` dieses Projekts deklariert (die Installation von `bx-agents` zieht sie also auch auf den Server), aber cbmailservices/bx-mail benötigen trotzdem beide eine explizite Installation auf welchem Server auch immer eine generierte App tatsächlich betreibt (gegen die eigene Dokumentation/den Quellcode beider Module bestätigt - keines wird vorinstalliert mit ColdBox oder BoxLang ausgeliefert) - vor `bxAgents serve`/dem Deployment eines Projekts mit einem `email`-Gateway ein echtes `box install` (oder Äquivalent) durchführen. `EmailGateway` löst `MailService@cbmailservices` manuell über `application.cbController.getWireBox()` auf (siehe den eigenen Docblock von `ScheduledGatewayBase.resolveScheduler()` dafür, warum - diese Klasse wird direkt von `aiGateway()` konstruiert, vollständig außerhalb von WireBox, `inject=""` wird auf ihr also nie honoriert), auf dieselbe Weise, wie auch der Scheduler selbst aufgelöst wird.

Da weder `bx-mail` noch `cbmailservices` Mail empfangen (nur senden), ist Inbound handgerolltes IMAP über die JDK-Standard-API `jakarta.mail` - bestätigt, transitiv im eigenen Klassenpfad dieses Projekts erreichbar (`bx-mail` hängt von `commons-email2-jakarta` ab, das wiederum von `jakarta.mail-api` + einer Angus-Mail-Implementierung abhängt), in dieser Session empirisch gegen die echten Jars verifiziert, nicht angenommen. Ein geplanter Task (`email-poll-<name>`) pollt IMAP nach ungelesener Mail, dieselbe Form wie Telegrams Long-Poll.

Threading und Human-in-the-Loop sind beide im Vergleich zu den Chat-Plattform-Gateways **verschlechtert**, und `getDeclaredCapabilities()` lässt bewusst `"interactiveActions"` weg, um das ehrlich anzuzeigen:

- **Threading** nutzt echte `Message-ID`-/`In-Reply-To`-/`References`-Header für eine GEWÖHNLICHE Antwort (das Gateway kennt immer die `Message-ID` der eingehenden Nachricht, auf die es antwortet, das Setzen von `In-Reply-To` auf der ausgehenden Antwort ist also zuverlässig) - eine v1-Vereinfachung threadet auf dem ersten Eintrag von `References` (sonst `In-Reply-To`, sonst die eigene `Message-ID` der Nachricht), keinen vollständigen Walk der Kette.
- **Human-in-the-Loop hat überhaupt keine native Button-/Komponentenoberfläche** - `requestHumanInteraction()` sendet eine reine Text-E-Mail, die die erlaubten Entscheidungs-Schlüsselwörter auflistet, und bittet den Menschen, mit einem davon als erster Zeile zu antworten. Diese Antwort mit dem richtigen ausstehenden Request zu korrelieren kann sich nicht auf `In-Reply-To` verlassen, wie es gewöhnliche Antworten tun (cbmailservices' `send()` exponiert nicht, welche `Message-ID` die ausgehende Genehmigungs-E-Mail selbst erhielt), es geschieht also stattdessen über ein in der Betreffzeile eingebettetes `[bxagents:<requestID>]`-Tag - dieselbe Technik, die echte E-Mail-basierte Support-Ticket-Systeme aus demselben Grund nutzen. Die erste Zeile einer Antwort wird gegen die eigenen erlaubten Entscheidungen des Requests abgeglichen (exakt oder als Präfix, ohne Berücksichtigung von Groß-/Kleinschreibung); eine nicht erkannte Antwort wird unverändert durchgereicht statt erneut angefragt, überlassen an bx-ais eigenen HITL-Koordinator zur Ablehnung.
