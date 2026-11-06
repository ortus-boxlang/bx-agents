---
title: "Lección 15: La UI web de chat generada"
icon: phosphor-duotone:globe-hemisphere-west
summary: Un cliente de chat completo para navegador - barra lateral, streaming, aprobaciones, almacén SQLite.
description: Un cliente de chat completo para navegador - barra lateral, streaming, aprobaciones, almacén SQLite.
tags: [course, conventions, web-ui]
---

# La UI web de chat generada

Una entrada `gateways/*.bx` con `exposes: "webui"` entrega un cliente de chat completo para
navegador para tu agente - una barra lateral de conversaciones, streaming con razonamiento y
llamadas a tools, aprobaciones con humano en el bucle, temas por visitante, y un almacén
SQLite real por detrás.

```javascript
// gateways/chat.bx
class {
	function configure() {
		return {
			exposes     : "webui",
			path        : "/chat",
			apiKeyEnvVar: "CHAT_UI_API_KEY"   // optional - see "Securing it" below
		};
	}
}
```

Esto genera un `<path>/index.html` estático (servido directamente, sin necesidad de ruta) que
llama a la API del agente en `/__bxagents`. La página es HTML/CSS/JS puro y sin dependencias,
precompilado e incluido dentro del propio BxAgents - `bxAgents build` nunca ejecuta
`npm install`, y un proyecto generado no necesita tener Node instalado en absoluto.

![La UI web de chat generada, con marca propia y con una conversación de ejemplo](../assets/webui-chat-light.png)

Esa es la página generada real y sin modificar - esta con la marca de la configuración
`theme`/`title`/`icon` de
[`examples/webui-agent`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/webui-agent),
llevando más lejos el concepto de exposición de la [Lección 13](13-exposing-http-and-mcp.md).
Ejecutar `bxAgents build && bxAgents serve` en ese ejemplo te da esa misma página de verdad.

## Qué puede hacer la página

- **Barra lateral de conversaciones** - cambiar, renombrar, borrar, o empezar una conversación
  nueva.
- **Redirigir mientras se transmite** - el compositor sigue activo durante un turno; **Send**
  se convierte en **Steer**, e inserta tu mensaje en la ejecución que ya está en marcha.
- **Stop** - envía `/cancel` antes de abortar, de modo que el servidor deja realmente de
  gastar tokens en vez de limitarse a abandonar la conexión del navegador.
- **Razonamiento y llamadas a tools** - desplegables plegados alimentados directamente desde
  la respuesta transmitida.
- **Aprobaciones** - una pausa con humano en el bucle muestra una tarjeta de Aprobar/Rechazar.
- **Respuestas renderizadas** - Markdown completo, con bloques de código que muestran su lenguaje y
  tienen un botón **Copy**, y tarjetas de tools con un indicador de estado y una vista previa de una
  línea de los argumentos.
- **Comandos de barra** - escribe `/` para ver un menú (o pulsa el botón del rayo): `/new`,
  `/sessions`, `/fork`, `/export`, `/context` y más, los mismos que en la terminal. Los comandos que
  añade una [extensión](18-interceptors-and-modules.md) muestran el nombre de la extensión como insignia.
- **Sugerencias** - define hasta cuatro `suggestions` en la entrada y la conversación vacía las
  muestra como botones que envían con un clic.
- **Imágenes** - un botón Attach, pegar y arrastrar envían imágenes con un mensaje (se rechazan
  cuando el perfil del modelo dice `vision: false`).
- **Anillo de contexto** - el encabezado muestra cuánto de la ventana del modelo está en uso; haz
  clic para ver el desglose.
- **Selector de modelo** - cuando la entrada lista `profiles`, los visitantes pueden elegir uno por mensaje.

### El menú Settings

El encabezado conserva solo lo que usas a cada minuto: el botón **Chats**, el anillo de contexto, el
selector de modelo y un engranaje **Settings**. El engranaje abre un menú con tres grupos. Un
elemento que el servidor no ofrece, y un grupo sin nada dentro, se omiten.

| Grupo | Elementos |
|---|---|
| Conversation | Fork this conversation, Export as Markdown, Clear messages, Compact older messages |
| You | Notes (lo que el agente guarda sobre ti y sobre su propio trabajo), Appearance, tema claro u oscuro |
| Server | Password, Access tokens |

**Appearance** deja a cada visitante elegir claro, oscuro o el del sistema, un color de acento, el
tamaño del texto y la densidad, guardados en su propio navegador. Nunca cambia tu `theme`, que sigue
siendo el valor por defecto. **Access tokens** lista, crea y revoca tokens para admins, cuando el
servidor define `agentApi.manageTokens: true` ([Lección 13](13-exposing-http-and-mcp.md)).

## Sin cuentas: un único espacio de trabajo compartido

Por defecto la UI **no tiene cuentas ni protección** - cada visitante es anónimo, y todos leen
y escriben las **mismas** conversaciones, preferencias y memoria del agente. Esta es la
experiencia de desarrollo local sin ceremonias, no una postura de despliegue.

!!! warning
    Una UI abierta no tiene privacidad entre visitantes. Declara `users` si la página es
    accesible para más gente que quienes deberían ver los transcripts.

```javascript
users : [
    { username: "ada", passwordEnvVar: "ACME_ADA_PASSWORD", displayName: "Ada Lovelace" }
]
```

Una cuenta nombra la **variable de entorno** que contiene su contraseña, o lleva un valor ya
hasheado - una clave `password` literal es un error de build, no un aviso. Genera un hash con:

```bash
bxAgents hash-password --password="<tu-contraseña>"
```

## Personalizar la marca

Todas las claves son opcionales:

```javascript
theme: {
	accent : "0f766e",
	radius : "10px",
	font   : "Inter, system-ui, sans-serif",
	dark   : { accent : "rgb(45, 212, 191)" }
}
```

!!! info
    Escribe los colores hexadecimales pelados, sin `#` inicial - BoxLang inicia la
    interpolación de cadenas al encontrar `#` en ambos estilos de comillas, así que el
    generador lo vuelve a añadir por ti.

También están disponibles `title`, `subtitle`, `icon`, `welcome`, `placeholder`, `footer` y
`suggestions`, además de un `themeFile` para todo lo que los tokens no cubran. `icon` puede ser un
emoji, una dirección de imagen o `phosphor:<name>` (un icono Phosphor incluido en la página).

## Protegerla

`apiKeyEnvVar` es el secreto compartido de la API del agente - no un sistema de login completo. Si
no se define, la API queda abierta (aceptable en desarrollo local). Si lo defines, cada
llamada a `/__bxagents` debe llevar una cabecera `x-bxagents-token` que coincida. El armazón
estático en sí **no** está protegido deliberadamente, ya que la navegación normal de una página
en el navegador no puede enviar una cabecera personalizada: la página pide el secreto en un
formulario **Password** que se abre solo cuando el servidor responde `401`, y avisa cuando la
contraseña no fue aceptada. Para varias personas, usa tokens emitidos o lista `users`
([la Lección 13](13-exposing-http-and-mcp.md) cubre tokens, `allowedIPs` y `rateLimit`).

## Pruébalo

```bash
bxAgents build
bxAgents serve --port=8080
```

Abre `http://localhost:8080/chat` en un navegador y habla con tu agente - el mismo al que le
has ido añadiendo tools, skills y subagentes desde la [Lección 9](09-giving-your-agent-tools.md).

Referencia completa: [La UI web de chat](../conventions/web-ui.md).

Siguiente: [Lección 16 - Programar trabajo en segundo plano](16-scheduling-background-work.md)
