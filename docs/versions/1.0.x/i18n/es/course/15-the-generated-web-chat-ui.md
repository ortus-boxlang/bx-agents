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

Esto genera un `<path>/index.html` estático (servido directamente, sin necesidad de ruta) más
una API dedicada bajo `<path>/api`. La página es HTML/CSS/JS puro y sin dependencias,
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
bxAgents hash-password --password="correct horse battery staple"
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

También están disponibles `title`, `subtitle`, `icon`, `welcome`, `placeholder` y `footer`,
además de un `themeFile` para todo lo que los tokens no cubran.

## Protegerla

`apiKeyEnvVar` es una protección sencilla y conmutable - no un sistema de login completo. Si
no se define, `<path>/api/*` queda completamente abierto (aceptable en desarrollo local). Si
lo defines, cada petición bajo `<path>/api/*` debe llevar una cabecera `X-API-Key` que
coincida. El armazón estático en sí **no** está protegido deliberadamente, ya que la
navegación normal de una página en el navegador no puede enviar una cabecera personalizada.

## Pruébalo

```bash
bxAgents build
bxAgents serve --port=8080
```

Abre `http://localhost:8080/chat` en un navegador y habla con tu agente - el mismo al que le
has ido añadiendo tools, skills y subagentes desde la [Lección 9](09-giving-your-agent-tools.md).

Referencia completa: [La UI web de chat](../conventions/web-ui.md).

Siguiente: [Lección 16 - Programar trabajo en segundo plano](16-scheduling-background-work.md)
