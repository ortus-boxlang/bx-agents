---
title: "gateways/ - Email"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, email]
---

# Email

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de Email y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con Email.

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
			// imapPort: 993   // override opcional - por defecto 993 (IMAPS)
			// pollIntervalSeconds: 60   // override opcional - por defecto 60
		};
	}
}
```

`type: "email"` requiere `imapHostEnvVar`, `imapUsernameEnvVar`, `imapPasswordEnvVar`, y `fromAddressEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.EmailGateway", { "imapHost" : getSystemSetting( "IMAP_HOST", "" ), "imapUsername" : getSystemSetting( "IMAP_USERNAME", "" ), "imapPassword" : getSystemSetting( "IMAP_PASSWORD", "" ), "fromAddress" : getSystemSetting( "EMAIL_FROM_ADDRESS", "" ) } ) )
```

## Email - dependencias a nivel de servidor, y enhebrado/HITL degradados

`EmailGateway` es el único gateway de estilo push que no habla la API de su plataforma directamente. El correo saliente pasa por el propio módulo [`cbmailservices`](https://coldbox.ortusbooks.com/the-basics/modules/core-modules) de ColdBox (`MailService@cbmailservices`, su protocolo `BXMail` - que él mismo simplemente llama al propio componente `bx:mail` de BoxLang, del módulo `bx-mail`) en lugar de una llamada HTTP/SMTP hecha a mano. **Ambas son instalaciones de módulo reales, a nivel de servidor** - se declaran como `dependencies` en el propio `box.json` de este proyecto (así que instalar `bx-agents` también las trae al servidor), pero cbmailservices/bx-mail ambos todavía requieren una instalación explícita en cualquier servidor que realmente ejecute una app generada (confirmado contra la propia documentación/código fuente de ambos módulos - ninguno viene preinstalado con ColdBox o BoxLang) - haz un `box install` real (o equivalente) antes de `bxAgents serve`/desplegar un proyecto con un gateway `email`. `EmailGateway` resuelve `MailService@cbmailservices` manualmente fuera de `application.cbController.getWireBox()` (ver el propio docblock de `ScheduledGatewayBase.resolveScheduler()` para saber por qué - esta clase se construye directamente por `aiGateway()`, enteramente fuera de WireBox, así que `inject=""` nunca se honra en ella), de la misma manera que se resuelve el propio scheduler.

Ya que ni `bx-mail` ni `cbmailservices` reciben correo (solo lo envían), el entrante es IMAP hecho a mano vía la API estándar del JDK `jakarta.mail` - confirmado alcanzable transitivamente en el propio classpath de este proyecto (`bx-mail` depende de `commons-email2-jakarta`, que a su vez depende de `jakarta.mail-api` + una implementación de Angus Mail), verificado empíricamente esta sesión contra los jars reales, no asumido. Una tarea programada (`email-poll-<name>`) hace poll de IMAP en busca de correo no leído, la misma forma que el long-poll de Telegram.

El enhebrado y el human-in-the-loop están ambos **degradados** en relación a los gateways de plataforma de chat, y `getDeclaredCapabilities()` deliberadamente omite `"interactiveActions"` para decirlo honestamente:

- **El enhebrado** usa cabeceras reales `Message-ID`/`In-Reply-To`/`References` para una respuesta ORDINARIA (el gateway siempre conoce el `Message-ID` entrante al que está respondiendo, así que configurar `In-Reply-To` en la respuesta saliente es confiable) - una simplificación v1 enhebra sobre la primera entrada de `References` (si no, `In-Reply-To`, si no, el propio `Message-ID` del mensaje), no un recorrido completo de la cadena.
- **El human-in-the-loop no tiene ninguna superficie de botón/componente nativa en absoluto** - `requestHumanInteraction()` envía un correo de texto plano listando las palabras clave de decisión permitidas y le pide al humano que responda con una como la primera línea. Correlacionar esa respuesta de vuelta con la solicitud pendiente correcta no puede depender de `In-Reply-To` de la forma en que lo hacen las respuestas ordinarias (el `send()` de cbmailservices no expone qué `Message-ID` recibió el propio correo de aprobación saliente), así que se hace vía una etiqueta `[bxagents:<requestID>]` incrustada en la línea de Asunto en su lugar - la misma técnica que usan los sistemas reales de tickets de soporte basados en email por la razón idéntica. La primera línea de una respuesta se compara contra las propias decisiones permitidas de la solicitud (exacta o por prefijo, sin distinguir mayúsculas/minúsculas); una respuesta no reconocida se pasa textualmente en lugar de volver a pedirla, dejada para que el propio coordinador HITL de bx-ai la rechace.
