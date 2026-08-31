---
title: CLI リファレンス
icon: phosphor-duotone:terminal-window
summary: すべての bxAgents 動詞 (verb) とそのフラグ。
description: すべての bxAgents 動詞 (verb) とそのフラグ。
tags: [reference, cli]
---

# CLI リファレンス

```
Usage: boxlang module:bxAgents <verb> [options]
```

(または、より短い `bxAgents <verb> [options]` 形式 - [インストール](getting-started/installation.md) 参照。)

## グローバルフラグ

これらは動詞のディスパッチより前に処理され、動詞側には渡りません - 最初のトークンとしてのみ意味を持つため、動詞自身の同名フラグと衝突することは決してありません。

| フラグ | 効果 |
|---|---|
| `-h`, `--help`, `help` | 使い方 (すべての動詞と説明) を表示して終了コード 0 で終了します。動詞がまったく指定されなかった場合も表示されます (終了コード 1)。 |
| `-v`, `--version` | `bxAgents v{version}` を表示して終了コード 0 で終了します。 |

## すべての動詞が受け付けるもの

`--projectRoot=<path>` (または最初の非フラグ引数としての単純な位置引数) は、カレントディレクトリ以外のプロジェクトを対象にします。優先順位: `--projectRoot` フラグ > 最初の位置引数 > カレントワーキングディレクトリ。

## 引数の構文

BoxLang 自身が公式に文書化している CLI の慣習に従います。

| 形式 | 結果 |
|---|---|
| `--option` | `true` |
| `--option=value` / `--option="quoted value"` | `value` (前後のクォートは取り除かれます) |
| `-o=value` | 値付きの短縮形 |
| `-o` | 短縮形、`true` |
| `-abc` | 組み合わせ短縮形: `a`、`b`、`c` すべてが `true` |
| `--!option` / `--no-option` | 否定、`false` |
| それ以外 | 位置引数 (最初の 1 つがプロジェクトルートのフォールバックになります) |

繰り返されたオプション: 最後に指定したものが有効になります。

## 動詞 (Verbs)

::: cards
::: card title="new" icon="phosphor-duotone:sparkle" href="#new"
新しいエージェントプロジェクトをスキャフォールドします。
:::
::: card title="build" icon="phosphor-duotone:hammer" href="#build"
ビルドパイプライン全体を実行します。
:::
::: card title="test" icon="phosphor-duotone:test-tube" href="#test"
TestBox 経由でプロジェクト自身のテスト/スペックを実行します。
:::
::: card title="serve" icon="phosphor-duotone:broadcast" href="#serve"
実際の boxlang-miniserver プロセスを起動します。
:::
::: card title="chat" icon="phosphor-duotone:terminal-window" href="#chat"
ビルド済みエージェントに対する対話型 REPL。
:::
::: card title="invoke" icon="phosphor-duotone:paper-plane-tilt" href="#invoke"
非対話の 1 ターン - スクリプト/CI 向け。
:::
::: card title="package" icon="phosphor-duotone:package" href="#package"
ビルド済みプロジェクトを .bxa にパッケージ化します。
:::
::: card title="deploy" icon="phosphor-duotone:cloud-arrow-up" href="#deploy"
実際のデプロイ先に出荷します。
:::
::: card title="hash-password" icon="phosphor-duotone:key" href="#hash-password"
webui の users エントリ用に平文パスワードをハッシュ化します。
:::
::: card title="inspect" icon="phosphor-duotone:magnifying-glass" href="#inspect"
既存の manifest.json を整形して表示します。
:::
::: card title="clean" icon="phosphor-duotone:broom" href="#clean"
プロジェクトの .build/ と dist/ の出力を削除します。
:::
:::

### `new`

新しいエージェントプロジェクトをスキャフォールドします。

```bash
bxAgents new my-agent --model=openai/gpt-5 [--name=...] [--description=...]
```

- `--model` は**必須**です - `provider/model` スラッグです ([Agent.bx](conventions/agent-bx.md) 参照)。
- `--name` は対象ディレクトリ自身のベース名がデフォルトになります。
- 対象にすでに `Agent.bx` が存在する場合は実行を拒否します。
- `Agent.bx`、`instructions.md`、すべてのコンベンションフォルダ (空)、すぐに使える [`tests/`](conventions/testing.md) フォルダ (`tests/box.json` + `tests/specs/AgentSpec.bx`)、`BOXLANG_HOME=.build/runtime` を宣言する `.env` (`serve` 自身のスコープ付きランタイムホームと一致します - これが正確に何をカバーし、何をカバーしないかは [既知の制限](known-limitations.md) 参照)、そして `.gitignore` (`.build/`、`dist/`、`.env`) を作成します。既存の `.env`/`.gitignore` は決して上書きしません。
- 新しい `tests/` フォルダ内で `box install` も実行するため、`bxAgents test` が別途 `cd tests && box install` を実行することなく即座に動作します。これはベストエフォートです。`box` が `PATH` にない、あるいはインストールに失敗しても `new` 自体は成功し、メッセージで自分で実行するよう案内するだけです。このステップを完全にスキップするには `--skipInstall` を渡します。

### `build`

[ビルドパイプライン](build-pipeline.md) 全体を実行します。

```bash
bxAgents build [--environment=production] [--verbose]
```

`.build/app/` と `.build/manifest.json` を書き込みます。プロジェクトが不正な場合は、収集されたすべての検証エラーとともに失敗します。

- `--verbose` は実行中の各ビルドフェーズについて 1 行ずつ、その場でライブに表示します - 何が解決/発見/検証されたか、フェーズごとの件数 (モデル、ツール、ゲートウェイ、警告など)、`config/WireBox.bx` にどのエージェントがどの名前で登録されたか、`schedules/Scheduler.bx` が見つかったかどうか、そして最後に `Build completed in Xms` というタイミング行です。遅い、あるいは予期しない挙動のビルドをデバッグする際に便利です。指定しない場合は無音のままです - `--verbose` は渡さなければ何もコストがかかりません。

### `test`

TestBox 経由でプロジェクト自身の [`tests/specs`](conventions/testing.md) を実行します。

```bash
bxAgents test
```

- `tests/testbox` の下に `testbox` がインストールされている必要があります (`cd tests && box install`)。
- デフォルトでは `mock` プロバイダーに対してエージェントをビルドします (`Agent.bx` の `test()` 環境オーバーライド) - API キーもネットワークアクセスも不要です。
- 成功/失敗/エラー/スキップの件数と、失敗ごとの 1 行を表示し、何か失敗があれば非ゼロで終了します。

### `serve`

`.build/app` を対象に、実際の [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) プロセスを起動します。

```bash
bxAgents serve [--port=8080] [--host=0.0.0.0]
```

- 事前に `build` が必要です - `.build/app` が存在しない場合は明確に失敗します。
- `boxlang-miniserver` が `PATH` に見つからない場合は明確に失敗します。
- 起動前に `.build/miniserver.json` を書き込みます (rewrite 有効、`rewriteFileName: "index.bxm"`、ヘルスチェック有効)。
- サーバー自身の BoxLang ランタイムホームを、共有の `~/.boxlang` デフォルトではなく `.build/runtime` に (`serverHome` 経由で) スコープするので、各プロジェクトのコンパイル済みクラスキャッシュと config オーバーライドは分離されます - また `clean` はすでに `.build` をまるごと削除するため、これも無償で一掃されます。`invoke --server` は内部で `serve` を再利用するため、これも同じ恩恵を受けます。これは `chat`/`build`/`test`/デフォルトの `invoke` には**及びません** - [既知の制限](known-limitations.md) 参照。

### `chat`

BoxLang 自身の `MiniConsole` を使い、行入力に対してビルド済みエージェントと対話する REPL です。

```bash
bxAgents chat
```

- 事前に `build` が必要です。
- `GeneratedAgentFactory.bx` を直接ロードし (ColdBox/WireBox コンテナは一切介在しません)、セッションごとに一度 `buildAgent()` を呼び出します - `serve` の HTTP ルートが使うのとまったく同じファクトリなので、`chat` と HTTP が食い違うことはありません。
- `exit` または `quit` と入力すると終了します。
- 本物の対話 TTY が必要です (`MiniConsole` は raw モードのために `stty` をシェルアウトします) - パイプ/非対話では動作しません。

### `invoke`

ビルド済みエージェントに対する、非対話の 1 ターンです。1 つのメッセージを送信し、応答を表示して終了します。`chat` の TTY 要件がブロッカーとなる、スクリプト/CI 向けに存在します。

```bash
bxAgents invoke --message="What's the weather in Boston?" [--json]
bxAgents invoke --message="..." --server [--port=<port>]
```

- 事前に `build` が必要です。
- **デフォルト (`--server` なし)**: `GeneratedAgentFactory.bx` を直接ロードし (ColdBox コンテナも HTTP もなし)、エージェントを一度呼び出します - `chat` が内部で使うのと同じインプロセスのパスで、REPL ループがないだけです。`serve`/ゲートウェイの前提条件はまったく不要です。
- **`--server`**: 実際の使い捨て `boxlang-miniserver` プロセスを起動し (`serve` と同様)、メッセージを実際の HTTP リクエストとしてプロジェクトの `toAi()` 公開ルートへ送り、その後サーバーをシャットダウンします。インプロセスのショートカットではなく、実際に公開されるパス (ColdBox のルーティング、インターセプター、ゲートウェイ) を実行します。`{ exposes: "agent", path: "..." }` を持つ `gateways/*.bx` エントリが必要です ([gateways](conventions/gateways/index.md) 参照) - なければ明確に失敗します。`--port` はデフォルトで空いているエフェメラルポートになるため、すでに動いている `serve` と衝突することはありません。
- `--json` はプレーンテキストの応答の代わりに `{"response": "..."}` を表示します。

### `package`

ビルド済みプロジェクトを `.bxa` にパッケージ化します。

```bash
bxAgents package [--version=1.0.0]
```

- 事前に `build` が必要です - `.build/manifest.json` を読み込みます。存在しない場合は明確に失敗します。
- `--version` はデフォルトで `1.0.0` です。
- `dist/{agentName}-{version}.bxa`、対になる `.sha256`、そして機密情報を除去した `manifest.json` のコピーを書き込みます。[デプロイとシークレット](deployment-and-secrets.md) 参照。

### `deploy`

プラガブルな [`deploy/`](conventions/deploy.md) コンベンションを通じて、ビルド/パッケージ済みプロジェクトを実際のデプロイ先に出荷します。

```bash
bxAgents deploy --name=production
# または、フラグのみの短縮形 (local のみ):
bxAgents deploy --destination=/path/to/somewhere [--target=local]
```

- `--name=<entry>` は、指定した `deploy/<entry>.bx`/`.json` エントリが宣言するターゲット (`local`、`ssh`、`ftp`、`sftp`、`docker`、`digitalocean`) にディスパッチします。
- フラグのみの形式 (`--target=local --destination=...`、または `--target` を指定しない場合) は `deploy/` フォルダがなくても動作します - `local` のみがこれをサポートしており、それ以外のすべてのターゲットは、数個のフラグでは足りないより多くの設定が必要なため、名前付きエントリが必要です。
- `local`/`ssh`/`ftp`/`sftp` は事前に `package` が必要です。`docker`/`digitalocean` は事前に `build` が必要です (`.build/app` から直接ビルドします)。
- `ftp`/`sftp` は BxAgents と並んで [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp) モジュールがインストールされている必要があります ([インストール](getting-started/installation.md) 参照)。

### `hash-password`

平文パスワードを、`webui` エントリの [`users`](conventions/web-ui.md) ブロックが受け付ける `passwordHash` 値に変換します。

```bash
bxAgents hash-password --password="correct horse battery staple"
```

- `--password` は**必須**です。
- ハッシュを標準出力に表示します - `pbkdf2$<iterations>$<salt>$<derivedKey>`、PBKDF2-HMAC-SHA256、呼び出しごとにソルト付きです。コミットしても安全です。一方向であり、同じパスワードを 2 回ハッシュ化しても、異なる (どちらも有効な) 2 つのハッシュが得られます。
- 生成された Web UI 自身がサインイン検証に使うハッシャーと意図的に同一に保たれています - ここで生成されたハッシュは常にそちらでも検証に通ります。

### `inspect`

再ビルドせずに、既存の `.build/manifest.json` を整形して表示します。

```bash
bxAgents inspect [--json]
```

- 事前に `build` が必要です。
- エージェント名、モデル、環境、マニフェストバージョン、ジェネレータ名/バージョン、ファイル数を表示します。
- `--json` は人間可読なサマリーの代わりに、生のマニフェストを JSON として表示します - スクリプト向けに便利です。

### `clean`

プロジェクトの `.build/` と `dist/` の出力を削除します。

```bash
bxAgents clean
```

- `.build` と `dist` のみを削除します - ソースのコンベンション (`Agent.bx`、`tools/` など) は一切触れられません。
- どちらのディレクトリも存在しない場合は "Nothing to clean" と報告します。
