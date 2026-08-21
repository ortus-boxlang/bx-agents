---
title: クイックスタート
icon: phosphor-duotone:rocket-launch
summary: "プロジェクトの全ライフサイクル: スキャフォールド、編集、ビルド、実行。"
description: "プロジェクトの全ライフサイクル: スキャフォールド、編集、ビルド、実行。"
tags: [getting-started]
---

# クイックスタート

BX Agents プロジェクトの全ライフサイクル - スキャフォールド、編集、ビルド、実行 - を一通り確認します。

## 1. プロジェクトをスキャフォールドする

```bash
bxAgents new my-agent --model=openai/gpt-5
```

`--model` は必須です (`provider/model` スラッグです - どう解析されるかは [Agent.bx](../conventions/agent-bx.md) を参照)。`--name` と `--description` は任意で、`--name` のデフォルトは対象ディレクトリ自身の名前です。

これにより、以下が作成されます。

```
my-agent/
├── Agent.bx
├── instructions.md
├── tools/
├── skills/
├── subagents/
├── models/
├── gateways/
├── schedules/
├── mcp/
├── interceptors/
├── modules/
└── tests/
    ├── box.json
    └── specs/
        └── AgentSpec.bx
```

`Agent.bx` は次のようになります。

```javascript
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name        : "my-agent",
			description : "",
			model       : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

これは bx-ai 自身の `AiAgent` を `extends` するので、それ自体が*エージェント*です - 継承して、あなたのエージェントに必要なものをクラスに直接追加してください。詳しくは [Agent.bx](../conventions/agent-bx.md) を参照してください。

すべてのコンベンションフォルダは空の状態で作成されます - 実際にエージェントが必要とするフォルダにファイルを追加し、残りは削除する (あるいは単に無視する) だけです。

## 2. 編集する

`instructions.md` を開き、エージェントのシステムプロンプトを書きます。ツールを追加します。

```javascript
// tools/Greeter.bx
class {

	@AITool( "Say hello to someone by name." )
	function sayHello( name ) {
		return "Hello, " & arguments.name & "!";
	}

}
```

他のすべてのフォルダ (`skills/`、`subagents/`、`gateways/`、`schedules/`、`mcp/`、`interceptors/`、`models/`、`modules/`) については [コンベンション](../conventions/agent-bx.md) セクションを参照してください。

## 3. テストする

```bash
cd tests && box install && cd ..   # once, to fetch testbox/
bxAgents test
```

スキャフォールドされた `tests/specs/AgentSpec.bx` はそのまま合格します - `mock` プロバイダーに対してエージェントをビルドし (API キーもネットワークも不要)、スクリプト化された応答をアサートします。自分のスペックで使える `mockResponses()` とカスタムマッチャー (`toHaveCalledTool` など) については [tests/](../conventions/testing.md) を参照してください。

## 4. ビルドする

```bash
bxAgents build
```

[ビルドパイプライン](../build-pipeline.md) 全体 - config の解決、発見、検証、コード生成、マニフェストの正規化 - を実行し、実際の ColdBox アプリケーションを `.build/app/` に、加えて `.build/manifest.json` を書き込みます。`Agent.bx` の環境オーバーライドに対してビルドするには `bxAgents build --environment=production` を実行してください ([Agent.bx](../conventions/agent-bx.md) 参照)。

プロジェクトが検証に失敗した場合 (重複したツール名、不正な cron 式、未知のモデルプロバイダーなど)、`build` は最初のエラーだけでなく、収集されたすべてのエラーとともに失敗します。

## 5. 実行する

ビルド済みエージェントと対話する方法は 2 通りあり、どちらも同一の `GeneratedAgentFactory.bx` をロードし、まったく同じエージェントツリーを構築するため、決して食い違うことはありません。

**対話的に、ターミナルから:**

```bash
bxAgents chat
```

**HTTP 経由で**、実際の [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) プロセスを通じて:

```bash
bxAgents serve --port=8080
```

プロジェクトに `{ exposes: "agent", path: "/api/chat" }` を持つ `gateways/*` エントリがあれば、エージェントは `POST http://localhost:8080/api/chat/invoke` (および `/stream`、`/batch`、`/info` - [gateways/](../conventions/gateways.md) 参照) で到達可能になります。

!!! warning
    新しく起動したアプリの `toAi()` ルートへの最初のリクエストは一時的に失敗することがあります - [既知の制限](../known-limitations.md) を参照してください。負荷がかかる状況で信頼して使う前に、ウォームアップリクエストを送ってください。

## 6. 確認、パッケージ化、デプロイ

```bash
bxAgents inspect              # pretty-print .build/manifest.json
bxAgents package --version=1.0.0   # writes dist/my-agent-1.0.0.bxa + .sha256
bxAgents deploy --destination=/path/to/somewhere   # copies the newest .bxa there
```

[マニフェスト](../manifest.md) と [デプロイとシークレット](../deployment-and-secrets.md) を参照してください。

## 7. 後片付け

```bash
bxAgents clean
```

`.build/` と `dist/` のみを削除します - あなたのソースのコンベンション (`Agent.bx`、`tools/` など) は一切触れられません。

## 次のステップ

- [コンベンション](../conventions/agent-bx.md) で、すべてのコンベンションフォルダを一通り確認する。
- [`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples) にある、実際に動くサンプルプロジェクトを見る。
- [CLI リファレンス](../cli-reference.md) で、すべての動詞のフラグを確認する。
