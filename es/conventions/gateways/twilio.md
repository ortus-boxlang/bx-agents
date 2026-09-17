---
title: "gateways/ - Twilio SMS"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, twilio]
---

# Twilio SMS

Parte de la familia de gateways de estilo push [gateways/](index.md) - allí se explica la regla compartida de que "los secretos permanecen externos", `GatewaySession`, y el scheduler bajo el que se ejecutan estos gateways. Esta página cubre la forma de configuración propia de Twilio SMS y (cuando BxAgents hace algo específico de la plataforma) cómo se comunica con Twilio SMS.

```javascript
// gateways/twilioChannel.bx
class {
	function configure() {
		return {
			type            : "twilio",
			accountSidEnvVar: "TWILIO_ACCOUNT_SID",
			authTokenEnvVar : "TWILIO_AUTH_TOKEN",   // también la clave HMAC de X-Twilio-Signature
			fromEnvVar      : "TWILIO_FROM_NUMBER"   // el número de teléfono de Twilio por el que pasan los envíos salientes, E.164
			// messagingServiceSid: "MG..."   // opcional - si se configura, se usa en lugar de `from` en envíos salientes
			// publicUrl: "https://your-real-public-host/webhooks/twilio"   // override opcional para despliegues de proxy inverso/túnel - ver la subsección de Twilio abajo
		};
	}
}
```

`type: "twilio"` requiere `accountSidEnvVar`, `authTokenEnvVar`, y `fromEnvVar`. Comprobado de la misma manera que el `secretEnvVar` de una entrada channel-adapter `http`.

Sentencia de registro generada:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TwilioGateway", { "accountSid" : getSystemSetting( "TWILIO_ACCOUNT_SID", "" ), "authToken" : getSystemSetting( "TWILIO_AUTH_TOKEN", "" ), "from" : getSystemSetting( "TWILIO_FROM_NUMBER", "" ) } ) )
```

## Twilio SMS - un esquema de firma genuinamente diferente, y un modelo de respuesta de dos caminos

`TwilioGateway` es impulsado por webhook de la misma manera que `WhatsAppCloudGateway`/`TeamsGateway`:

```javascript
post( "/webhooks/twilio" ).toHandler( "Twilio.process" )
```

Dos cosas hacen que el propio contrato de webhook de Twilio sea significativamente diferente de cada otro gateway en este proyecto, ambas portadas fielmente desde el propio canal real de Twilio de Vercel Eve (`packages/eve/src/public/channels/twilio/`, licenciado MIT):

- **El cuerpo entrante está codificado como formulario** (`Body`, `From`, `To`, `MessageSid`, `AccountSid`), no JSON - `TwilioGateway` lo analiza él mismo (`java.net.URLDecoder`), sin deserialización JSON involucrada.
- **La verificación de firma es `X-Twilio-Signature`: HMAC-SHA1, codificado en base64** (cada otro gateway de webhook en este proyecto usa HMAC-SHA256, codificado en hex) - la base de firma es la URL exacta del request seguida de cada `key & value` propio de los parámetros POST concatenados directamente (sin separadores), ordenados alfabéticamente por clave. Porque la URL misma es parte de lo que se firma, un proyecto ejecutándose detrás de un proxy inverso o túnel (donde la URL que ColdBox ve vía `event.getUrl()` no coincide con lo que Twilio realmente hizo POST) necesita el override opcional de configuración `publicUrl` - la misma clase de trampa que la propia documentación de Eve señala para su opción `webhookUrl`.
- **La respuesta síncrona del webhook siempre es un TwiML vacío `<Response></Response>`** - el propio modelo clásico de dos caminos de Twilio. La respuesta real del agente se envía después, fuera de banda, vía una llamada REST separada a `deliver()` a la API de Messages una vez que el turno asíncrono de GatewaySession se completa - coincidiendo exactamente con el propio `emptyTwilioResponse()` de Eve (Eve nunca usa un `<Message>` TwiML síncrono para responder en línea).

Los envíos salientes son llamadas REST con Basic-Auth a `POST /2010-04-01/Accounts/{AccountSid}/Messages.json`, cuerpo codificado como formulario (`To`, `Body`, y ya sea `From` o `MessagingServiceSid` si está configurado). v1 es solo SMS-de-texto - el propio canal de Twilio de Eve es un canal combinado de SMS+voz (rutas `/voice`, TwiML `<Gather>`/`<Say>`, transcripción de llamada); ninguna de las piezas específicas de voz se portaron.

!!! warning
    SMS no tiene **ninguna capacidad nativa de botón/tarjeta en absoluto** (confirmado vía la propia documentación de Eve), así que el human-in-the-loop está degradado de la misma manera que el de Email - `getDeclaredCapabilities()` omite `"interactiveActions"` (y `"threads"`, ya que la clásica API de Messages de Twilio tampoco tiene un concepto nativo de respuesta/cita). `requestHumanInteraction()` envía un SMS de texto plano listando las decisiones permitidas; a diferencia de Email (que incrusta una etiqueta `[bxagents:<requestID>]` en la línea de Asunto para correlacionar la respuesta eventual), SMS no tiene línea de asunto que etiquetar - así que la solicitud pendiente se indexa por el propio número de teléfono del remitente (conversationID) en su lugar, una simplificación v1 que asume como máximo una solicitud HITL abierta por número de teléfono a la vez.

!!! info
    A diferencia de Eve (que no tiene ninguna lógica de limitación de longitud en absoluto - confirmado ausente haciendo grep en su código fuente - y depende enteramente de la propia segmentación del lado del servidor de Twilio), `TwilioGateway` aún aplica `MessageChunker` en 1600 caracteres (el propio techo documentado de concatenación de un solo mensaje de Twilio) por consistencia con el comportamiento de fragmentación de cada otro gateway. El esquema de firma HMAC-SHA1 se verificó de forma cruzada esta sesión contra un valor de referencia computado independientemente en Python `hmac`/`hashlib` antes de confiar en la implementación de BoxLang, la misma disciplina usada para el propio esquema HMAC-SHA256 de WhatsApp Cloud.
