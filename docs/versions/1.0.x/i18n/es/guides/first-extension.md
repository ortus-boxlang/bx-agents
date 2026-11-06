---
title: "Guía: Escribe tu primera extensión"
icon: phosphor-duotone:puzzle-piece
summary: Empieza una extensión, pruébala en el chat, cámbiala en caliente y compártela.
description: Empieza una extensión con bxAgents add extension, pruébala en el chat de terminal, cámbiala con /reload y compártela con un zip, GitHub o install.
tags: [guides, extensions]
---

# Guía: Escribe tu primera extensión

Una [extensión](../conventions/extensions.md) añade cosas al chat y a la app sin tocar el framework: un comando, una tecla, un elemento de estado, una herramienta, un hueco en la página web. Esta guía lleva una desde cero hasta algo que puedes compartir. Necesita un proyecto (`bxAgents new` crea uno).

## 1. Empezarla

```bash
bxAgents add extension standup --with=command,key --layout=file --description="Standup diario"
```

Eso escribe `extensions/standup.bx`: una clase con un comando `/standup` y una tecla, cada uno con un `TODO` por completar. Sin `--with` o `--layout`, en una terminal pregunta (qué traer, y un archivo o una carpeta). Si marcas un scheduler, gateway, tool, skill o archivos web, crea una carpeta (`extensions/standup/Extension.bx` más esos archivos).

## 2. Probarla

```bash
bxAgents chat
```

Escribe `/extensions` para verla cargada y luego `/standup`. Un problema en el archivo aparece ahí con su motivo, así que un error de escritura nunca queda en silencio. Desde un shell, `bxAgents extensions` imprime la misma lista.

## 3. Cambiarla en caliente

Edita el comando en `extensions/standup.bx` y escribe `/reload` en el mismo chat. El cambio entra sin reiniciar. `/reload` es para administradores; en tu propio chat de terminal lo eres. Un ajuste va en `configure()`:

```boxlang
function configure() {
	variables.settings = { greeting : "Buenos días" }
}
```

Léelo en el comando como `settings.greeting`. `Agent.yaml` (o tu propio `~/.bxagents/bxAgents.yml`) puede cambiarlo sin tocar el código:

```yaml
extensions:
  standup:
    greeting: "Hola equipo"
```

## 4. Usarla en todos los proyectos

Una extensión en el `extensions/` del proyecto pertenece a ese proyecto y va a su app compilada. Para tener una en tu propio chat de terminal en todas partes, enlázala:

```bash
bxAgents extensions link ./extensions/standup.bx
```

Ahora se carga desde donde la editas, en cada chat de esta máquina, y `/reload` recoge un cambio.

## 5. Compartirla

Una extensión es una carpeta o un archivo, así que compartirla es dar eso:

- comprime la carpeta en un zip, o súbela a un repositorio de GitHub;
- la otra persona ejecuta `bxAgents extensions install ./standup.zip`, o `bxAgents extensions install tu/standup`.

Ve lo que añade y lo que menciona su código, y dice que sí antes de que se coloque nada. La instalación queda en `extensions.lock.json`, que hace commit; la extensión se restaura desde él al compilar.

## Siguientes pasos

- [Extensiones](../conventions/extensions.md) lista todo lo que una extensión puede traer, con la forma exacta de cada cosa.
- [`examples/extensions-agent`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples/extensions-agent) tiene una extensión funcionando de cada tipo.
