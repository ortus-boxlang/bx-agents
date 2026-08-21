---
title: deploy/
icon: phosphor-duotone:cloud-arrow-up
summary: "デプロイ先ごとに 1 エントリ: local, ssh, ftp, docker, digitalocean。"
description: "デプロイ先ごとに 1 エントリ: local, ssh, ftp, docker, digitalocean。"
tags: [conventions, deployment]
---

# deploy/

各 `deploy/*.bx`/`.json` エントリは、1 つのデプロイ先への試行 - プロジェクトをビルド/パッケージ化して出荷する場所 - を記述します。

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

これを実行するには:

```bash
bxAgents deploy --name=production
```

`deploy/` は意図的に、`build` のたびに検証される**わけではありません** - デプロイ用の config は生成される ColdBox アプリやそのマニフェストに一切影響しないため、デプロイしないプロジェクトに対して毎回チェックするのは純粋なオーバーヘッドになるからです。これは `deploy` が実際に実行されたときにのみ発見・検証されます。

最も単純なケースでは `deploy/` フォルダは一切不要です。

```bash
bxAgents deploy --destination=/path/to/somewhere
```

は `local` ターゲットの短縮形です。それ以外のすべてのターゲットは、数個のフラグでは合理的に足りないより多くの設定を必要とするため、名前付きの `deploy/*` エントリが必要です (`--name=<entry>`)。

## ターゲット

すべてのターゲットは同じ `IDeploymentTarget` インターフェース (`struct function deploy( config, context )`) を実装しており、`target` フィールドがどれが実行されるかを決めます。

::: cards
::: card title="local" icon="phosphor-duotone:folder-simple" href="#local"
最新の `.bxa` を出力先ディレクトリにコピーします。`deploy/` フォルダは不要です。
:::
::: card title="ssh" icon="phosphor-duotone:terminal-window" href="#ssh"
`scp` 経由で出荷し、任意でリモートサービスを `ssh` 経由で再起動します。
:::
::: card title="docker" icon="phosphor-duotone:cube" href="#docker"
`.build/app` からイメージをビルドし、レジストリにプッシュします。
:::
::: card title="digitalocean" icon="phosphor-duotone:cloud-arrow-up" href="#digitalocean"
DigitalOcean App Platform API に対して push とミニマルなプロビジョニングを行います。
:::
::: card title="ftp / sftp" icon="phosphor-duotone:upload-simple" href="#ftp--sftp"
最新の `.bxa` を、プレーンな FTP または SFTP でリモートディレクトリに出荷します。
:::
:::

### `local`

最新にパッケージ化された `.bxa` (ファイルの更新時刻順で、字句的なファイル名ソートは決して使いません - そうでなければ `v9.0.0` が `v10.0.0` より後にソートされてしまいます) を出力先ディレクトリにコピーします。

```javascript
{ target: "local", destination: "/path/to/somewhere" }
```

事前に `bxAgents package` が必要です。

### `ssh`

最新の `.bxa` を `scp` 経由でベアサーバーに出荷し、その後任意でリモート再起動コマンドを `ssh` 経由で実行します。

```javascript
{
	target         : "ssh",
	host           : "example.com",
	username       : "deploy",
	remotePath     : "/srv/apps/my-agent",
	identityFile   : "/home/me/.ssh/id_rsa",   // optional
	restartCommand : "systemctl restart my-agent"   // optional
}
```

事前に `bxAgents package` が必要です。実際の `scp`/`ssh` バイナリをシェルアウトします - それらがインストールされ `PATH` 上にある必要があります。

### `docker`

`.build/app` から Docker イメージをビルドし、コンテナレジストリにプッシュします。実際の `docker` CLI をシェルアウトします。

```javascript
{
	target   : "docker",
	registry : { type : "ghcr", repository : "myorg/my-agent" },   // type: "dockerhub" | "ghcr" | "docr"
	tag      : "1.0.0"   // optional, defaults to "latest"
}
```

事前に `bxAgents build` が必要です (`package` ではありません - `.build/app` から直接ビルドします)。組み込みの Dockerfile テンプレートは、実際に公開されている [`ortussolutions/boxlang:miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/docker) イメージをベースにしています - 独自の `deploy/Dockerfile` を追加するか、`dockerfile: "/absolute/path"` で別のものを指定して、完全に上書きできます。

`docker login` は、`DOCKER_USERNAME` と `DOCKER_PASSWORD` の両方が環境に設定されている場合にのみ実行されます - すでに認証済みのローカル Docker デーモンが到達できるレジストリなら、どちらも不要です。

### `digitalocean`

[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform) アプリにデプロイします - 「push とミニマルなプロビジョニング」です。`docker` とまったく同じようにイメージをビルド/プッシュし (同じ `registry` config 形状を再利用します)、その後、既存のアプリを再デプロイするか、まだ存在しなければゼロから作成します。

```javascript
{
	target        : "digitalocean",
	appName       : "my-agent",
	region        : "nyc",   // optional, defaults to "nyc"
	registry      : { type : "docr", repository : "myorg/my-agent" },   // "namespace/repo" form
	httpPort      : 8080,   // optional, defaults to 8080
	instanceSize  : "apps-s-1vcpu-1gb",   // optional
	instanceCount : 1,   // optional, defaults to 1
	envs          : [ { key : "OPENAI_API_KEY", scope : "RUN_TIME", type : "SECRET" } ]   // optional
}
```

`registry.repository` は `namespace/repo` の形式である必要があります (例えば `myorg/my-agent`) - DigitalOcean の App Spec の `image` ブロックは、namespace と repository を別々のフィールドとして必要とします。事前に `bxAgents build` が必要です。

既存のアプリはローカルのアプリ ID ファイルを記憶しておくのではなく、名前で検索されます (`GET /v2/apps` を、クライアント側で `spec.name` でフィルタリング) - そのため、これはどのマシンや CI ランナーからでも、古びるローカル状態なしに同じように動作します。

### `ftp` / `sftp`

最新の `.bxa` を、実際の [`bx:ftp`](https://github.com/ortus-boxlang/bx-ftp) コンポーネント経由で、プレーンな FTP または SFTP でリモートディレクトリに出荷します - このプロジェクトの (`bx-ai` と同様の) 正真正銘のランタイム依存で、バンドルされていません。`remotePath` はリモートの**ディレクトリ**です - アップロードされたファイルは自身の名前を保持します。`ssh` の `scp` ターゲットと同じコンベンションです。

```javascript
// deploy/ftp-production.bx
{
	target         : "ftp",
	host           : "ftp.example.com",
	username       : "deploy",
	passwordEnvVar : "FTP_PASSWORD",
	remotePath     : "/uploads/my-agent",
	port           : 21,       // optional, defaults to 21
	passive        : true,     // optional, defaults to true
	timeout        : 30,       // optional, seconds, defaults to 30
	proxyServer    : "proxy.company.com:8080"   // optional
}
```

```javascript
// deploy/sftp-production.bx
{
	target           : "sftp",
	host             : "sftp.example.com",
	username         : "deploy",
	key              : "/home/me/.ssh/id_rsa",   // passwordEnvVar OR key required
	passphraseEnvVar : "SFTP_KEY_PASSPHRASE",     // optional, only if the key itself is passphrase-protected
	fingerprint      : "SHA256:...",              // optional host key verification
	remotePath       : "/uploads/my-agent",
	port             : 22,       // optional, defaults to 22
	timeout          : 30        // optional, seconds, defaults to 30
}
```

事前に `bxAgents package` が必要です。`ftp` は `passwordEnvVar` が必須です。`sftp` は `passwordEnvVar` か `key` (SSH 秘密鍵ファイルのパス) のいずれかを受け付けます。`passwordEnvVar`/`passphraseEnvVar` は、実際のシークレットを保持する環境変数の名前を指定します - **シークレットの値そのものは決して指定しません** - デプロイ時にライブに解決されます。`key` は単なるパスのままです。それ自体はすでにシークレットな素材ではないためです。すべての `bx:ftp` アクションは、ソフトな失敗を返すのではなく、失敗時 (接続拒否、認証拒否、サーバーからの否定応答) に例外を投げます - このターゲットはそれを捕捉し、明確な `BxAgents.DeployFailed` として再送出し、エラー時でも常に接続を閉じます。

## Secrets stay external

`deploy/*` の config からシークレット (API トークン、SSH 鍵、レジストリのパスワード) を読み取るターゲットは一つもありません - すべての認証情報はデプロイ時に環境変数から解決されます。プロバイダーの API キーがビルドやパッケージに決して埋め込まれないという、このプロジェクトの既存のルールと一致しています ([デプロイとシークレット](../deployment-and-secrets.md) 参照)。

| ターゲット | 環境変数 |
|---|---|
| `ssh` | 不要 - `identityFile` はあなた自身が管理する鍵ファイルへのパスです |
| `docker` | `DOCKER_USERNAME`、`DOCKER_PASSWORD` (どちらも任意 - 設定されている場合のみ使用されます) |
| `digitalocean` | `DOCKER_USERNAME`/`DOCKER_PASSWORD` (イメージプッシュ用) + `DIGITALOCEAN_TOKEN` (必須) |
| `ftp` / `sftp` | `passwordEnvVar`/`passphraseEnvVar` が名指すどの環境変数でも - エントリ自体は環境変数の名前だけを保持し、値は決して保持しません (`key` はパスで、`ssh` の `identityFile` と同様です) |

## 検証

- `target` は `local`、`ssh`、`docker`、`digitalocean`、`ftp`、`sftp` のいずれかである必要があります。
- エントリ名は `deploy/*.bx` と `deploy/*.json` の全体で一意である必要があります。
- 各ターゲットの必須フィールド (上記) は `deploy` の実行時にチェックされます - `local` は `destination` が必要、`ssh`/`ftp`/`sftp` は `host`/`username`/`remotePath` (3 つとも同じフィールド名) が必要、`docker`/`digitalocean` は `registry.repository` が必要、`digitalocean` はさらに `appName` も必要、`ftp` はさらに `passwordEnvVar` も必要、`sftp` はさらに `passwordEnvVar` または `key` も必要です。
