---
title: "Recorridos del chat"
icon: phosphor-duotone:path
summary: "Seis sesiones cortas en el chat de terminal: una primera conversación, retomar una, cambiar de modelo, notas, archivos e imágenes, y hacer el chat tuyo."
description: "Seis sesiones cortas en el chat de terminal: una primera conversación, retomar una, cambiar de modelo, notas, archivos e imágenes, y hacer el chat tuyo."
tags: [guides, cli, tui, walkthrough]
---

# Recorridos del chat

Seis sesiones cortas, de unos dos minutos cada una. Suponen un agente que ya has construido; si no, empieza por el [inicio rápido](../getting-started/quick-start.md). Cada tecla y cada comando usados aquí están en [La interfaz de terminal](terminal-ui.md) y en [Comandos con barra](slash-commands.md).

<video controls preload="metadata" poster="/assets/video/terminal-tour-poster.png" style="max-width:100%">
  <source src="/assets/video/terminal-tour.mp4" type="video/mp4">
  <source src="/assets/video/terminal-tour.webm" type="video/webm">
  <track kind="captions" src="/assets/video/terminal-tour.vtt" srclang="en" label="English" default>
</video>

*Las teclas, los estilos del cuadro de mensaje, el contexto, el nombre, la bifurcación y las sesiones en una sola ejecución. Las respuestas de estas grabaciones vienen de un modelo de demostración con guion, así que son fijas. Todo lo demás es la pantalla real.*

## 1. Tu primera conversación

```bash
bxAgents build
bxAgents chat
```

1. Escribe una pregunta y pulsa **Enter**. La respuesta llega en streaming; cualquier tool que llame el agente se muestra con sus argumentos y lo que tardó.
2. Pulsa **Alt+Enter** para una segunda línea antes de enviar.
3. Escribe `/` y mira el menú, o `?` para ver las teclas. Escribe `/tools` para ver qué puede llamar el agente.
4. Pulsa **Esc** mientras el agente trabaja para detenerlo en su siguiente paso. Escribe mientras trabaja para **dirigirlo**: tu mensaje se añade a la ejecución.
5. `/copy` pone la última respuesta en el portapapeles.
6. `/exit`, o **Ctrl+C** en un cuadro vacío, para salir.

Sube después con el scroll: la conversación es texto de terminal normal.

## 2. Retomar una conversación

```bash
bxAgents chat --continue          # la última, con su historial
```

Dentro de un chat:

1. `/name Quarterly plan` pone nombre a esta conversación.
2. `/fork Other approach` la copia, con todos sus mensajes, y sigue en la copia. La original queda como estaba.
3. `/sessions` lista tus conversaciones, numeradas. `/resume 2` vuelve a la número 2 y muestra lo que se dijo.
4. `/export plan.html` guarda la conversación como una página. Un nombre `.md` guarda Markdown.

![La lista de conversaciones tras poner nombre y bifurcar](../assets/tui/chat-sessions.png)

*Tras `/name` y `/fork`: tres conversaciones, numeradas, con su número de mensajes.*

Los mensajes se guardan en la [memoria](../conventions/agent-yaml.md#ajustes) del agente, así que una conversación solo se puede retomar mientras dure esa memoria. La memoria `cache` por defecto se pierde cuando termina el proceso; una memoria `file` o `jdbc` no.

## 3. Probar otro modelo

Necesita más de un [perfil](../conventions/models.md#perfiles) en el proyecto.

1. `/model` muestra el modelo en uso.
2. `/profile` lista los perfiles; elige uno con las flechas. O `/profile fast` va directo a él. La conversación, las tools y las instrucciones se mantienen; solo cambia el modelo.
3. `/ping` comprueba que el modelo responde, e indica cuánto tardó o por qué no lo hizo.
4. `/default` vuelve al modelo por defecto de la app.

## 4. Notas que guarda el agente

Necesita un bloque [`notes`](../conventions/agent-yaml.md#notas) en `Agent.yaml`.

1. `/remember I prefer short answers` guarda una nota sobre ti. El agente la ve en cada conversación.
2. `/notes` abre la pantalla de notas. **a** añade, **e** edita, **d** elimina (tras un sí), **Tab** alterna entre tus notas y las del agente, **Esc** vuelve.
3. `/notes stats` muestra cuántos caracteres usas del límite y los tokens aproximados que añaden a cada conversación.

## 5. Mostrarle un archivo o una imagen

1. Escribe `@` y se abre una lista de archivos bajo tu carpeta. Sigue escribiendo para acotarla; **Tab** toma uno. El contenido del archivo va con tu mensaje.
2. `@diagram.png` envía una imagen. Un perfil con `vision: false` hace que el chat la rechace con un mensaje en lugar de un error del proveedor.
3. **Ctrl+V** pega una imagen del portapapeles.
4. `!git diff --stat` ejecuta un comando en tu máquina y envía lo que imprimió junto con tu siguiente mensaje. `!!` lo muestra sin enviarlo.
5. `/context` muestra qué tamaño tiene el contexto y de qué se compone: prompt del sistema, definiciones de tools, notas y mensajes. La salida de un `!command` que espera tu siguiente mensaje también cuenta.

## 6. Hacer el chat tuyo

1. `/prompt` muestra el aspecto y los widgets del cuadro de mensaje. `/prompt box` cambia el aspecto y `/prompt top +git -clock` cambia la barra superior, solo para este chat. Para fijarlo en el proyecto, usa un [bloque `tui:`](terminal-ui.md#el-aspecto-del-cuadro-de-mensaje) en `Agent.yaml`.
2. `?` solo, o `/keys`, lista cada tecla con el nombre de su acción. Para cambiar una, ponla en `~/.bxagents/bxAgents.yml`: `chat:`, luego `keys:` y, por ejemplo, `newline: ctrl+n`. Consulta [Cambiar una tecla](terminal-ui.md#cambiar-una-tecla).
3. `/extensions` lista lo que añadieron las [extensiones](first-extension.md): comandos, teclas y más. Tras editar una, `/reload` la carga de nuevo sin salir del chat.
4. `/record demo.cast` empieza a guardar la pantalla como un archivo asciicast, y `/record stop` lo termina. O empieza con `bxAgents chat --record=demo.cast`.
5. `/stats` muestra los tokens que usaron las llamadas al modelo, una vez que `usage: true` está definido en `Agent.yaml`. `/stats enable` escribe esa línea por ti.

## El asistente con el mismo estilo

<video controls preload="metadata" poster="/assets/video/wizard-poster.png" style="max-width:100%">
  <source src="/assets/video/wizard.mp4" type="video/mp4">
  <source src="/assets/video/wizard.webm" type="video/webm">
</video>

*El asistente de `new` desde el nombre hasta el proyecto terminado.*

`bxAgents new my-agent` es la otra pantalla. Las flechas o `j`/`k` mueven, **Space** marca, **Enter** confirma, **Esc** vuelve una pregunta y **Ctrl+C** cancela sin crear nada. La última pantalla imprime el comando de una línea que construiría el mismo proyecto sin preguntas. El recorrido completo está en [el asistente new](new-wizard.md).
