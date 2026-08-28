---
title: Agent.bx
icon: phosphor-duotone:robot
summary: "唯一の必須ファイル - bx-ai 自身の AiAgent を extends するクラスなので、それ自体がエージェントである。"
description: "唯一の必須ファイル - bx-ai 自身の AiAgent を extends するクラスなので、それ自体がエージェントである。"
tags: [conventions, configuration]
---

# Agent.bx

`Agent.bx` は BxAgents プロジェクトで唯一の必須ファイルです。これは **bx-ai 自身の [`AiAgent`](https://ai.ortusbooks.com/main-components/agents/class-based-agents) を extends** するので、それ自体が*エージェント*です - ビルドは config 構造体から再構築するのではなくこれをそのままインスタンス化するので、書いたものがそのまま実行されます。継承して、必要なものを何でも追加してください。プライベートヘルパー、オーバーライドしたメソッド、コード内で登録したツールなど何でもです。構造体を返すディスクリプタではなく実際のクラスなので、IDE は他の通常の BoxLang クラスと同じように解析できます - 定義へのジャンプ、継承メソッドの補完、すべてです。

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "A helpful assistant",
			instructions: "You are a helpful assistant.",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

`bxAgents new` はまさにこの形をスキャフォールドします。`instructions.md` は任意です - `super.init()` の中で `instructions` を直接設定しても、`Agent.bx` の隣にファイルを置いてビルドに組み込ませてもかまいません (下の表を参照)。

## クラスの上にビルドが積み重ねるもの

> **ルール:** 明示的に宣言されたコンベンションが勝ち、そうでなければクラスが主導します。

そのため、すべてを自身の `init()` で設定するエージェントには何も強制されず、最低限しか設定しないエージェントでも、自分が言及しなかったコンベンションはきちんと取り込まれます。以下はすべて**任意**です - これらのキーのいずれかを返す `configure()` を宣言すれば、クラス自身が設定したものや、対応する `instructions.md`/`tools/`/`subagents/` コンベンションフォルダを上書きできます。

| 宣言すると | ビルドが出力するもの | 宣言しない場合 |
|---|---|---|
| `instructions.md` | `withInstructions( fileRead( ... ) )` | クラス自身の instructions がそのまま使われる |
| `configure()` の `model` | `setModel( aiModel( ... ) )` | クラス自身の model がそのまま使われる |
| `configure()` の `name` / `description` | `setName()` / `setDescription()` | クラス自身のものがそのまま使われる |
| `configure()` の `memory` | `setMemory( ... )` | クラス自身のものがそのまま使われる |
| *(宣言なし)* | `withTools( aiToolRegistry().getAll() )` | 常に - `withTools()` は bx-ai では置き換えではなく**追加**なので、クラスが自ら登録したツールは維持されたまま、発見された `tools/` が追加される |
| クラス上の `subAgents`、またはディスク上の `subagents/` | 子ごとに `addSubAgent( ... )` | 同じ方法で追加される |
| `configure()` の `checkpointer` | `withCheckpointer( ... )` | クラスが何も設定していない場合は**それでも注入される** - 下記参照 |

!!! info
    チェックポインターは、ビルドが尋ねられなくても埋める唯一のものです。ゲートウェイから到達可能なのにチェックポインターを持たないエージェントは human-in-the-loop が*サイレントに*壊れているため、何も設定していないクラスでも `cache` デフォルトが与えられます。クラスが自身のものを設定している場合はそのままにされます。

!!! warning
    意図的に、あなたのインスタンスを bx-ai の `DEFAULT_AGENT_*` の値と比較する実装にはなっていません。「作者がこれを意図したのか、それとも単なるデフォルトなのか?」は答えようがなく、本当にデフォルトの名前を望んでいた作者が、それをサイレントに置き換えられてしまうことになります。外部宣言の存在は事実ですが、デフォルト値の背後にある意図はそうではありません。

このクラスは生成されたアプリの `agent/classes/` にコピーされ、そこで自身の絶対ファイルパスによってインスタンス化されます (登録されたマッピングに依存する相対的な参照は決して使いません)。`tools/`、`skills/`、`mcp/` がコピーされるのとまったく同じ方法です - そのため、パッケージ化された `.bxa` はこれを保持し、実際の ColdBox コンテナが起動しているかどうかに関わらず `chat`/`invoke`/`serve` はすべて同じ方法でこれをインスタンス化します。

## `configure()` (任意) - クラスの設定を上書きする

`configure()` メソッドは完全に任意です。クラスの外部から特定のフィールドだけを上書きしたい場合にのみ宣言してください - デプロイ固有の値 (環境ごとに異なるモデルなど) をクラス本体の外に保つのに便利です。

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "with-mcp-servers-agent",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function configure() {
		return {
			mcpServers : [
				"https://example.com/mcp",
				{ url : "https://other.com/mcp", name : "other" }
			]
		};
	}

}
```

| フィールド | 型 | メモ |
|---|---|---|
| `name` | string | ビルド時にこのエージェントの `config/WireBox.bx` バインディングキーにもなります (`getInstance( name )`) - [schedules/](schedules.md) 参照 - そのためプロジェクト全体 (ルート + すべてのサブエージェント) で一意である必要があります。2 つのエージェントが同じ名前を共有していると `build` は失敗します。 |
| `model` | string | `provider/model` スラッグ、素のプロバイダー名、または [`models/`](models.md) エントリの名前のいずれかです。下記参照。 |
| `description` | string | 任意です。 |
| `subAgents` | array of strings | ルートプロジェクトの `subagents/` 直下にある兄弟フォルダの名前です。[subagents/](subagents.md) 参照。 |
| `mcpServers` | array | リモート MCP サーバーです - 各エントリは URL 文字列、または `{ url, name }` です。[mcp/](mcp.md) 参照。 |
| `security` | struct | 生成されたアプリの `bxai` モジュール設定にそのまま転送されます。bx-ai 自身の `SecurityDirector` がこれをガードレールミドルウェアに変換します。パススルーのみで、BxAgents 独自のガードレールコンベンションはありません。 |
| `memory` | string or struct | エージェントの会話メモリです。素の文字列は型の省略形です (`"cache"`)。構造体は `{ type, ...config }` で `aiMemory()` にそのまま渡されます - 例えば `{ type: "cache", maxMessages: 50 }`、あるいは Web UI の `/compact` を機能させるために `summaryProvider`/`summaryModel`/`summaryThreshold` を付けます。ノードごとに適用されるので、サブエージェントは自身のものを宣言できます。 |
| `checkpointer` | struct | `{ type: "cache"\|"file"\|"jdbc", ...config }`。省略時は `{ type: "cache" }` がデフォルトです。常に適用されます - これがないと、`cli` 以外のどのゲートウェイを通した human-in-the-loop 承認フローも完全に壊れてしまいます。 |
| `gatewaySession` | struct | `{ policy, maxQueueDepth }`、どちらも任意です (デフォルトは `"queue"` / `50`)。プロジェクトが少なくとも 1 つの push 型 [ゲートウェイ](gateways.md#3-push-style-gateways-type-telegram--slack--discord--email--whatsapp-cloud--teams--twilio--github--signal-and-friends) エントリを持つ場合にのみ意味を持ちます - すでにターンが進行中のスレッドに 2 通目の受信メッセージが到着した際の、生成される `GatewaySession` のポリシーを制御します。`policy` は `reject`/`queue`/`steer`/`interrupt` のいずれかである必要があります。 |
| その他のキー | any | マージされ、解決済み config 構造体で利用できますが、BxAgents 自身では解釈されません。 |

## The model slug

`model` は BxAgents 独自のコンベンションです - bx-ai 自身は `provider` と `model` を `aiModel()` への 2 つの別々の引数として受け取ります。BxAgents はスラッグを**最初の `/` だけで**分割するので、それ自体にスラッシュを含むプロバイダー (OpenRouter の `openrouter/anthropic/claude-x` のような) でも正しく解析されます。

| `model` の値 | provider | model |
|---|---|---|
| `openai/gpt-5` | `openai` | `gpt-5` |
| `openrouter/anthropic/claude-x` | `openrouter` | `anthropic/claude-x` |
| `mock/mock-model` | `mock` | `mock-model` |

`model` に `/` がまったく含まれない場合、既知のコアプロバイダー名か、[`models/`](models.md) エントリの名前のいずれかに一致する必要があります - それ以外は検証で拒否されます。認識されているコアプロバイダーは次の通りです: `bedrock`、`claude`、`cohere`、`deepseek`、`docker`、`elevenlabs`、`gemini`、`grok`、`groq`、`huggingface`、`minimax`、`mistral`、`mock`、`ollama`、`openai`、`openai-compatible`、`openrouter`、`perplexity`、`voyage` (bx-ai 自身の `CORE_PROVIDERS` と同期しています)。`mock` は実在するプロバイダーで、テストや CI に便利です - ネットワーク呼び出しを一切行いません。

このスラッグ分割のコンベンションは、`configure()` で宣言された `model` 文字列が通過するものです - `super.init()` 自身の `model` 引数は代わりに実際の `AiModel` インスタンスを直接受け取ります (`aiModel( provider: "...", params: { model: "..." } )`)。クラスがすでに bx-ai 自身の API を話しているためです。

## 環境オーバーライド

`Agent.bx` は、環境にちなんだ名前のメソッド (例えば `production()`、`development()`、または任意のカスタム名) を宣言し、オーバーライドの構造体を返すことができます - これはクラスが `configure()` を宣言しているかどうかに関わらず機能します。

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "override-agent",
			description : "An agent with an environment override",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

	function production() {
		return {
			model : "openai/gpt-5-mini"
		};
	}

}
```

アクティブな環境は、次の優先順位で解決されます (最上位が優先されます)。

1. `--environment` CLI フラグ (`bxAgents build --environment=production`)
2. `BX_AGENTS_ENV` 環境変数
3. `"development"` (デフォルト)

これは**ビルド時**の決定のみで、ColdBox 自身のランタイム環境検出 (生成されたアプリは ColdBox の `environments` コンベンションに従って自身で `getSetting("environment")` を読み取ります) とは別物です - この優先順位は、`Agent.bx` のどの `environment()` オーバーライドメソッド、そしてどの `boxlang-{env}.json`/`miniserver-{env}.json` ファイルをビルドパイプラインが適用するかだけを決定します。

アクティブな環境に一致するメソッドが存在しない場合、オーバーライドは適用されません。

## マージのセマンティクス

完全な解決順序 (優先度の低い順から高い順) は次の通りです。

1. `configure()` (任意)
2. 一致する環境オーバーライドメソッド (あれば)
3. `boxlang.json`
4. `boxlang-{environment}.json`
5. `miniserver.json`
6. `miniserver-{environment}.json`

構造体のキーは**再帰的に**マージされます - より優先度の高いソースにあるネストされた構造体は、それが実際に設定しているキーだけを上書きし、より優先度の低いソースにある兄弟キーはそのまま残されます。配列とすべてのスカラー値は、追加や連結ではなく**丸ごと置き換え**られます。

`boxlang.json`/`boxlang-{env}.json`/`miniserver.json`/`miniserver-{env}.json` はすべて任意のプロジェクトルート JSON ファイルで、BoxLang コードよりもデータとして表現しやすい config (例えばモデルのデフォルト値) に便利です。

```json
// boxlang.json
{
	"modelDefaults": { "temperature": 0.7, "maxTokens": 1000 }
}
```

```json
// boxlang-production.json
{
	"modelDefaults": { "temperature": 0.2 }
}
```

ここで `--environment=production` でビルドすると `modelDefaults: { temperature: 0.2, maxTokens: 1000 }` になります - 再帰的マージにより、`boxlang-production.json` が一切言及していない `maxTokens` はベースファイルから保持されます。

!!! warning
    シークレット (API キー、トークン) は、BxAgents によってビルド時に読み込まれたりマージされたりすることは決してありません - それらは外部に留まり (OS の環境変数、`.env`、プラットフォームのシークレットマネージャー)、実行時に bx-ai 自身によってライブに解決されます。[デプロイとシークレット](../deployment-and-secrets.md) を参照してください。
