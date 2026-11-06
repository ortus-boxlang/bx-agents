---
title: "La interfaz de terminal"
icon: phosphor-duotone:keyboard
summary: "Conversa con tu agente en la terminal: diseño de pantalla, teclas, estilos del cuadro de mensaje, archivos e imágenes, grabación y qué pasa sin terminal."
description: "Conversa con tu agente en la terminal: diseño de pantalla, teclas, estilos del cuadro de mensaje, archivos e imágenes, grabación y qué pasa sin terminal."
tags: [guides, cli, tui]
---

# La interfaz de terminal

Dos comandos dibujan una pantalla de terminal completa: [`bxAgents chat`](../cli-reference.md#chat), donde hablas con tu agente, y [`bxAgents new`](new-wizard.md), donde respondes preguntas y obtienes un proyecto. Esta página es el recorrido. Cada comando y opción está en la [referencia de la CLI](../cli-reference.md); cada comando con barra está en [Comandos con barra](slash-commands.md); una primera sesión guiada está en [Recorridos del chat](chat-walkthrough.md).

<video controls preload="metadata" poster="/assets/video/chat-terminal-poster.png" style="max-width:100%">
  <source src="/assets/video/chat-terminal.mp4" type="video/mp4">
  <source src="/assets/video/chat-terminal.webm" type="video/webm">
</video>

*Una sesión de chat: comandos con barra, una llamada a una tool y una respuesta con formato. Las respuestas de estas grabaciones vienen de un modelo de demostración con guion, así que son fijas. Todo lo demás es la pantalla real.*

## Empezar un chat

```bash
bxAgents build          # chat necesita un agente construido (no con --connect)
bxAgents chat
```

| Ejecutar | Habla con | Úsalo cuando |
|---|---|---|
| `bxAgents chat` | El agente, cargado en este proceso | Quieres hablar con el agente. Lo más rápido. |
| `bxAgents chat --server` | Un servidor local desechable | Necesitas que interceptores, programaciones o gateways sean reales |
| `bxAgents chat --connect=<url> [--token=<t>]` | Un servidor que ya está en marcha | Quieres hablar con un despliegue |
| `bxAgents chat --no-tui` | Lo mismo que el primero, en un prompt simple línea a línea | Una terminal que no puede dibujar, o simplemente lo prefieres |

`--continue` reabre tu última conversación, `--session=<número o id>` una concreta, y `--user=<nombre>` elige de quién ves las conversaciones y las notas.

## La pantalla

Los turnos terminados se imprimen como texto de terminal normal, así que **tu scrollback, tu búsqueda y tu copia siguen funcionando**. Solo se redibujan dos cosas: el cuadro de mensaje de abajo y la respuesta que se está escribiendo.

- **Las respuestas** llegan en streaming a medida que se producen y, al terminar, se imprimen como Markdown con formato: encabezados, listas, tablas con bordes redondeados y bloques de código coloreados por lenguaje.
- **Las llamadas a tools** se muestran con sus argumentos y lo que tardaron.
- **El razonamiento** se muestra mientras el modelo trabaja y nunca se guarda.
- **Las aprobaciones.** Cuando una ejecución se detiene por una decisión de [human-in-the-loop](../conventions/gateways/index.md), la pantalla pregunta en el sitio: aprobar una vez, aprobar para la conversación o rechazar.
- **La fila de pistas** bajo el cuadro lista las teclas y empieza con el tamaño del contexto, como `ctx ~12.4k / 128k 9%`. Es una estimación (caracteres divididos entre cuatro), actualizada antes de cada prompt.

![El chat de terminal tras dos respuestas, con el cuadro de mensaje abierto para un comando nuevo](../assets/tui/chat-answer.png)

*Los turnos terminados son texto de terminal normal. La respuesta es Markdown con formato, con la llamada a la tool encima y el cuadro de mensaje debajo.*

## Teclas

| Tecla | Hace |
|---|---|
| Enter | Envía el mensaje |
| Alt+Enter, Shift+Enter, Ctrl+J, o `\` y luego Enter | Línea nueva |
| Up / Down | Mensajes anteriores y posteriores, desde la primera o la última línea del cuadro |
| Tab | Completa un `/command` o un `@file` |
| Ctrl+A / Home, Ctrl+E / End | Inicio y fin de la línea |
| Ctrl+U, Ctrl+W | Borra hasta el inicio de la línea, borra la palabra antes del cursor |
| Ctrl+V | Añade la imagen del portapapeles |
| Ctrl+C | Vacía el cuadro. En un cuadro vacío, sale. Mientras el agente trabaja, lo detiene |
| Ctrl+D | Sale, en un cuadro vacío (si no, borra el carácter bajo el cursor) |
| Esc | Mientras el agente trabaja, lo detiene en su siguiente paso (no a mitad de palabra) |
| Enter mientras el agente trabaja | **Dirigir**: tu mensaje se añade a la ejecución |
| `?` solo, o `/keys` | Muestra las teclas tal como están asignadas ahora mismo |

![La salida de /keys, con cada tecla y el nombre de su acción](../assets/tui/chat-keys.png)

*`/keys` lista cada tecla, el nombre de acción que se usa en `bxAgents.yml` y lo que hace.*

### Cambiar una tecla

Las teclas viven en un archivo que es tuyo, no de ningún proyecto: `~/.bxagents/bxAgents.yml` (define `BXAGENTS_USER_CONFIG` para usar otro archivo).

```yaml
chat:
  keys:
    newline: [ ctrl+n, alt+enter ]
    stop: ctrl+x
```

Acciones que puedes cambiar: `submit`, `newline`, `historyPrevious`, `historyNext`, `clear`, `exit`, `deleteToStart`, `deleteWord`, `lineStart`, `lineEnd`, `complete`, `pasteImage` y `stop`. Las teclas se escriben como las dice la gente: `enter`, `alt+enter`, `shift+enter`, `ctrl+j`, `esc`, `tab`, `up`, `down`, `home`, `end`, o una letra con `ctrl` o `alt`.

Un error de escritura nunca te deja atascado. Una acción desconocida, una tecla ilegible, o una tecla que otra acción del mismo lugar ya usa se avisa al arrancar el chat, y esa acción conserva sus teclas por defecto.

## Comandos: escribe `/`

Un `/` al inicio del cuadro abre un menú de comandos. Sigue escribiendo para acotarlo, Tab o Enter para tomar uno. Todos están listados en [Comandos con barra](slash-commands.md); los que usarás primero son `/help`, `/new`, `/sessions`, `/resume`, `/context`, `/model` y `/exit`. `/stats` muestra los tokens que usaron las llamadas al modelo, una vez que `usage: true` está definido en `Agent.yaml`.

## Conversaciones

Cada chat es una conversación, guardada en la base de datos de chat compartida del proyecto, junto a la de la propia página web.

| Hacer | Cómo |
|---|---|
| Empezar donde lo dejaste | `bxAgents chat --continue`, o `--session=<número o id>` |
| Ver la lista | `/sessions` (numerada, la más nueva primero) |
| Volver a una | `/resume 2`; sin número, la más reciente |
| Ponerle nombre o copiar una | `/name Quarterly plan`, `/fork Other approach` |
| Guardar una | `/export plan.html` (o `.md`); `--format=md\|html` prevalece sobre el nombre del archivo |
| Empezar una limpia | `/new`, o `/clear` para vaciar esta |

Desde un shell, `bxAgents sessions list|rename|fork|delete` hace lo mismo. Un paso a paso está en [Recorridos del chat](chat-walkthrough.md#2-retomar-una-conversación).

## Extensiones

Las extensiones de la carpeta `extensions/` del proyecto, de tu propia `~/.bxagents/extensions/` y de los módulos instalados añaden comandos, teclas y texto de estado a esta pantalla. `/extensions` lista lo que se cargó y lo que salió mal; `/reload` las carga de nuevo tras una edición (administradores, lo que eres en tu propia terminal). Las teclas que añade una extensión aparecen en `/keys` y se pueden reasignar bajo `chat: keys:` como cualquier otra. Consulta [Escribe tu primera extensión](first-extension.md).

## Archivos, imágenes y tu propia máquina

| Escribe | Hace |
|---|---|
| `@` | Lista los archivos bajo la carpeta donde empezaste. Sigue escribiendo para acotar |
| `@path/to/file` | Envía el contenido de un archivo de texto con el mensaje |
| `@picture.png` | Envía una imagen (png, jpg, gif, webp) como parte de imagen. Hasta 4 por mensaje, 5 MB cada una. Se rechaza cuando el perfil dice `vision: false` |
| `!command` | Ejecuta un comando de shell **en tu máquina**; su salida va con tu siguiente mensaje para que el agente vea lo que viste tú |
| `!!command` | Lo mismo, mostrado solo en pantalla |
| `#function( args )` | Llama a una función integrada de BoxLang, como `#dateFormat( now(), 'yyyy-mm-dd' )`; el resultado va con tu siguiente mensaje |
| `##function( args )` | Lo mismo, mostrado solo en pantalla |

`!` y `#` se ejecutan en local incluso cuando el chat está conectado a un servidor. Desactívalos, o restríngelos, en el mismo archivo de usuario:

```yaml
chat:
  shell: false                       # or a shell: "bash -c", "pwsh -Command"
  bifs: [ dateFormat, listLen ]      # or false to switch # off
```

![La salida de /context y una conversación a la que se le cambia el nombre](../assets/tui/chat-context.png)

*`/context` muestra de qué se compone el contexto. Se calcula en local, sin llamar a ningún modelo.*

Detalles y límites: [referencia de la CLI](../cli-reference.md#archivos-e-imágenes-en-el-mensaje).

## El aspecto del cuadro de mensaje

Cinco estilos, cada uno con una barra superior que lleva una etiqueta y pequeños datos (widgets):

| Estilo | Aspecto |
|---|---|
| `bars` (por defecto) | Una barra encima y otra debajo del cuadro, pistas y widgets inferiores bajo la barra de abajo |
| `bars-hints` | Las mismas dos barras, con pistas y widgets inferiores dentro de la de abajo |
| `rule` | Una línea coloreada encima, pistas debajo |
| `box` | Un cuadro redondeado |
| `panel` | Un panel teñido con una barra gruesa a la izquierda. Se dibuja como `rule` sin 256 colores ni color verdadero |

Widgets: `agent`, `profile`, `folder`, `user`, `clock`, `machine`, `git`, `date`, `session`, `elapsed`, `ctx`. Un widget sin nada que mostrar (`git` fuera de un repositorio) se omite, y los últimos se caen cuando la línea es demasiado estrecha.

Define el inicio para el proyecto en `Agent.yaml`:

```yaml
tui:
  prompt: bars
  widgets:
    top: [ agent, folder, user, clock ]
    bottom: [ ctx, profile ]
```

O cámbialo para un solo chat: `/prompt box`, `/prompt top +git -clock`, `/prompt bottom none`.

## Pantalla de notas

`/notes` abre una pantalla con las notas que el agente guarda sobre ti y sobre su propio trabajo: `a` añade, `e` o Enter edita, `d` elimina, `t` o Tab alterna entre las tuyas y las del agente, `s` estadísticas, Esc vuelve. Necesita un bloque [`notes`](../conventions/agent-yaml.md#notas) en `Agent.yaml`.

## Grabarlo

`bxAgents chat --record=demo.cast` (o `/record demo.cast` dentro del chat, `/record stop` para terminar) guarda la pantalla como un [asciicast](https://docs.asciinema.org/manual/asciicast/v2/). Reprodúcelo con `asciinema play demo.cast`. Las pulsaciones de teclas no se graban, pero sí lo que escribiste en el cuadro y todo lo que imprimió el agente, argumentos de tools incluidos. Necesita la pantalla de terminal.

## Colores y alternativas

- **Color verdadero, 256 colores o 16 colores** según `COLORTERM` y `TERM`.
- **`NO_COLOR`** definido, o `TERM=dumb`: sin ningún color.
- **Sin terminal interactiva** (una tubería, CI): el chat recurre al REPL simple. Para scripts usa [`invoke`](../cli-reference.md#invoke).
- **`bxAgents new`** hace sus preguntas solo en una terminal y sin `--model`. Pasa `--model` (lo llama un script) y usa opciones y valores por defecto; sin terminal necesita `--model`. Consulta [el asistente new](new-wizard.md).

## Solución de problemas

| Ves | Causa y arreglo |
|---|---|
| El chat no encuentra el agente | Ejecuta primero `bxAgents build`, o usa `--connect` |
| Una tecla no hace nada | Ejecuta `/keys` para ver qué está asignado, y reasigna en `bxAgents.yml` si tu terminal se reserva esa tecla |
| Los colores se ven mal | Define `COLORTERM=truecolor`, o `NO_COLOR=1` para desactivar el color |
| `--connect` dice 401 | El servidor quiere un token: `--token=<token>` o `BXAGENTS_TOKEN` |
| Se rechaza una imagen | El perfil define `vision: false`, o el archivo no es png, jpg, gif o webp, o pesa más de 5 MB |
| `/export` escribe en un lugar inesperado | Sin un nombre, el archivo lleva fecha y se escribe en la carpeta donde empezaste |
