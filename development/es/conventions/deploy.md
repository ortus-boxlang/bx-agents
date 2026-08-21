---
title: deploy/
icon: phosphor-duotone:cloud-arrow-up
summary: "Una entrada por destino de despliegue: local, ssh, ftp, docker, digitalocean."
description: "Una entrada por destino de despliegue: local, ssh, ftp, docker, digitalocean."
tags: [conventions, deployment]
---

# deploy/

Cada entrada `deploy/*.bx`/`.json` describe un intento de destino de despliegue - un lugar al que enviar un proyecto construido/empaquetado:

```javascript
// deploy/production.bx
class {

	function configure() {
		return {
			target       : "digitalocean",
			appName      : "my-agent",
			region       : "nyc",
			registry     : { type : "ghcr", repository : "myorg/my-agent" },
			httpPort     : 8080,
			instanceSize : "apps-s-1vcpu-1gb",
			envs         : [ { key : "OPENAI_API_KEY", scope : "RUN_TIME", type : "SECRET" } ]
		};
	}

}
```

Ejecútalo con:

```bash
bxAgents deploy --name=production
```

`deploy/` deliberadamente **no** se valida en cada `build` - la configuración de despliegue nunca afecta la app ColdBox generada ni su manifest, así que comprobarla en cada build sería puro overhead para proyectos que nunca despliegan. Solo se descubre y valida cuando `deploy` realmente se ejecuta.

El caso más simple no necesita ninguna carpeta `deploy/` en absoluto:

```bash
bxAgents deploy --destination=/path/to/somewhere
```

es la forma abreviada para el destino `local`. Cada otro destino necesita más configuración de la que un par de flags puede razonablemente transportar, así que requiere una entrada nombrada `deploy/*` (`--name=<entry>`).

## Destinos

Cada destino implementa la misma interfaz `IDeploymentTarget` (`struct function deploy( config, context )`) - el campo `target` elige cuál se ejecuta.

::: cards
::: card title="local" icon="phosphor-duotone:folder-simple" href="#local"
Copia el `.bxa` más nuevo a un directorio destino. No se necesita carpeta `deploy/`.
:::
::: card title="ssh" icon="phosphor-duotone:terminal-window" href="#ssh"
Envía vía `scp`, opcionalmente reinicia el servicio remoto vía `ssh`.
:::
::: card title="docker" icon="phosphor-duotone:cube" href="#docker"
Construye una imagen desde `.build/app` y la sube a un registro.
:::
::: card title="digitalocean" icon="phosphor-duotone:cloud-arrow-up" href="#digitalocean"
Push-y-provisión-mínima contra la API de DigitalOcean App Platform.
:::
::: card title="ftp / sftp" icon="phosphor-duotone:upload-simple" href="#ftp--sftp"
Envía el `.bxa` más nuevo a un directorio remoto vía FTP o SFTP simple.
:::
:::

### `local`

Copia el `.bxa` empaquetado más nuevo (por tiempo de modificación de archivo, nunca un ordenamiento léxico de nombre de archivo - `v9.0.0` de lo contrario ordenaría después de `v10.0.0`) a un directorio destino.

```javascript
{ target: "local", destination: "/path/to/somewhere" }
```

Requiere un `bxAgents package` previo.

### `ssh`

Envía el `.bxa` más nuevo a un servidor desnudo vía `scp`, luego opcionalmente ejecuta un comando de reinicio remoto vía `ssh`.

```javascript
{
	target         : "ssh",
	host           : "example.com",
	username       : "deploy",
	remotePath     : "/srv/apps/my-agent",
	identityFile   : "/home/me/.ssh/id_rsa",   // opcional
	restartCommand : "systemctl restart my-agent"   // opcional
}
```

Requiere un `bxAgents package` previo. Invoca los binarios reales `scp`/`ssh` - deben estar instalados y en `PATH`.

### `docker`

Construye una imagen Docker desde `.build/app` y la sube a un registro de contenedores, invocando la CLI real de `docker`.

```javascript
{
	target   : "docker",
	registry : { type : "ghcr", repository : "myorg/my-agent" },   // type: "dockerhub" | "ghcr" | "docr"
	tag      : "1.0.0"   // opcional, por defecto "latest"
}
```

Requiere un `bxAgents build` previo (no `package` - construye directamente desde `.build/app`). La plantilla de Dockerfile incorporada se basa en la imagen real y publicada [`ortussolutions/boxlang:miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/docker) - sobreescríbela por completo añadiendo tu propio `deploy/Dockerfile`, o apunta a uno diferente vía `dockerfile: "/absolute/path"`.

`docker login` solo se ejecuta cuando tanto `DOCKER_USERNAME` como `DOCKER_PASSWORD` están configuradas en el entorno - un registro que un daemon Docker local ya autenticado puede alcanzar no necesita ninguna de las dos.

### `digitalocean`

Despliega a una app de [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform) - "push y provisión mínima": construye/sube la imagen exactamente como `docker` (reutiliza la misma forma de configuración `registry`), luego ya sea redespliega una app existente o crea una desde cero si aún no existe.

```javascript
{
	target        : "digitalocean",
	appName       : "my-agent",
	region        : "nyc",   // opcional, por defecto "nyc"
	registry      : { type : "docr", repository : "myorg/my-agent" },   // forma "namespace/repo"
	httpPort      : 8080,   // opcional, por defecto 8080
	instanceSize  : "apps-s-1vcpu-1gb",   // opcional
	instanceCount : 1,   // opcional, por defecto 1
	envs          : [ { key : "OPENAI_API_KEY", scope : "RUN_TIME", type : "SECRET" } ]   // opcional
}
```

`registry.repository` debe estar en forma `namespace/repo` (por ejemplo, `myorg/my-agent`) - el bloque `image` del App Spec de DigitalOcean necesita el namespace y el repositorio como campos separados. Requiere un `bxAgents build` previo.

Una app existente se encuentra por nombre (`GET /v2/apps`, filtrado del lado del cliente sobre `spec.name`) en lugar de recordar un archivo local de ID de app, así que esto funciona idénticamente desde cualquier máquina o corredor de CI sin estado local que pueda quedar obsoleto.

### `ftp` / `sftp`

Envía el `.bxa` más nuevo a un directorio remoto vía FTP o SFTP simple, a través del componente real [`bx:ftp`](https://github.com/ortus-boxlang/bx-ftp) - una dependencia de runtime genuina de este proyecto (como `bx-ai`), no empaquetada. `remotePath` es un **directorio** remoto - el archivo subido conserva su propio nombre, la misma convención que usa el destino `scp` de `ssh`.

```javascript
// deploy/ftp-production.bx
{
	target         : "ftp",
	host           : "ftp.example.com",
	username       : "deploy",
	passwordEnvVar : "FTP_PASSWORD",
	remotePath     : "/uploads/my-agent",
	port           : 21,       // opcional, por defecto 21
	passive        : true,     // opcional, por defecto true
	timeout        : 30,       // opcional, segundos, por defecto 30
	proxyServer    : "proxy.company.com:8080"   // opcional
}
```

```javascript
// deploy/sftp-production.bx
{
	target           : "sftp",
	host             : "sftp.example.com",
	username         : "deploy",
	key              : "/home/me/.ssh/id_rsa",   // se requiere passwordEnvVar O key
	passphraseEnvVar : "SFTP_KEY_PASSPHRASE",     // opcional, solo si la propia clave está protegida por passphrase
	fingerprint      : "SHA256:...",              // verificación opcional de clave de host
	remotePath       : "/uploads/my-agent",
	port             : 22,       // opcional, por defecto 22
	timeout          : 30        // opcional, segundos, por defecto 30
}
```

Requiere un `bxAgents package` previo. `ftp` requiere un `passwordEnvVar`; `sftp` acepta ya sea un `passwordEnvVar` o un `key` (ruta de archivo de clave privada SSH). `passwordEnvVar`/`passphraseEnvVar` nombran variables de entorno que contienen el secreto real - **nunca el valor del secreto mismo** - resueltas en vivo en tiempo de despliegue; `key` permanece como una ruta simple, ya que no es en sí misma material secreto. Cada acción de `bx:ftp` lanza en caso de fallo (conexión rechazada, autenticación rechazada, una respuesta negativa del servidor) en lugar de devolver un fallo suave - este destino captura eso y lo relanza como un `BxAgents.DeployFailed` claro, siempre cerrando la conexión después, incluso en caso de error.

## Secrets stay external

Ningún destino lee jamás un secreto (token de API, clave SSH, contraseña de registro) desde la configuración de `deploy/*` - cada credencial se resuelve desde una variable de entorno en tiempo de despliegue, coincidiendo con la regla existente de este proyecto de que las claves de API de proveedor nunca se incrustan en un build o package (ver [Despliegue y secretos](../deployment-and-secrets.md)):

| Destino | Variable(s) de entorno |
|---|---|
| `ssh` | ninguna requerida - `identityFile` es una ruta a un archivo de clave que tú mismo gestionas |
| `docker` | `DOCKER_USERNAME`, `DOCKER_PASSWORD` (ambas opcionales - solo se usan si están configuradas) |
| `digitalocean` | `DOCKER_USERNAME`/`DOCKER_PASSWORD` (para la subida de imagen) + `DIGITALOCEAN_TOKEN` (requerido) |
| `ftp` / `sftp` | cualquier(as) variable(s) de entorno que nombre(n) `passwordEnvVar`/`passphraseEnvVar` - la entrada misma solo contiene el NOMBRE de la variable de entorno, nunca su valor (`key` es una ruta, igual que el `identityFile` de `ssh`) |

## Validación

- `target` debe ser uno de `local`, `ssh`, `docker`, `digitalocean`, `ftp`, `sftp`.
- Los nombres de entrada deben ser únicos a través de `deploy/*.bx` y `deploy/*.json`.
- Los campos requeridos de cada destino (arriba) se comprueban cuando se ejecuta `deploy` - `local` necesita `destination`, `ssh`/`ftp`/`sftp` necesitan `host`/`username`/`remotePath` (el mismo nombre de campo en los tres), `docker`/`digitalocean` necesitan `registry.repository`, `digitalocean` también necesita `appName`, `ftp` también necesita `passwordEnvVar`, `sftp` también necesita `passwordEnvVar` o `key`.
