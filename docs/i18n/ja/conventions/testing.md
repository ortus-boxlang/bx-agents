---
title: tests/
icon: phosphor-duotone:test-tube
summary: スキャフォールドされたすべてのプロジェクトには、すぐに実行できる TestBox スイートが付属します。
description: スキャフォールドされたすべてのプロジェクトには、すぐに実行できる TestBox スイートが付属します。
tags: [conventions, testing]
---

# tests/

`bxAgents new` でスキャフォールドされたすべてのプロジェクトには、すぐに実行できる `tests/` フォルダが付属します: `testbox` の依存関係を宣言する `tests/box.json` と、そのまま合格するサンプルスペックである `tests/specs/AgentSpec.bx` です。

```bash
cd my-agent/tests
box install       # fetches testbox/ into tests/testbox
cd ..
bxAgents test
```

!!! info
    `coldbox-templates/boxlang` テンプレート自身の専用 `tests/` + `box.json` フォルダに着想を得て、BX Agents 独自のよりシンプルなテストの考え方に合わせて調整されています。エージェントをテストするということは、その**振る舞い** (何を言うか、どのツールを呼び出すか) を対象とするということであり、HTTP ルーティングを対象とするものではないため、ここには `Application.bx`/ColdBox の仮想アプリはまったく関与しません。

## スペックを書く

`testbox.system.BaseSpec` を直接ではなく、`bxModules.bxagents.models.testing.BaseAgentSpec` (`testbox.system.BaseSpec` のサブクラス) を extends してください。

```javascript
// tests/specs/AgentSpec.bx
class extends="bxModules.bxagents.models.testing.BaseAgentSpec" {

	function run() {
		describe( "my-agent", function() {

			it( "responds to a greeting", function() {
				mockResponses( [ "Hello! How can I help you today?" ] )

				var response = agent.run( "Hi there" )

				expect( response ).toContainText( "Hello" )
			} )

		} )
	}

}
```

`BaseAgentSpec` は、スペックバンドルごとに一度 (`beforeAll()`)、あなたのプロジェクトの**使い捨ての一時コピー**に対してエージェントをビルドします - あなたの実際の `.build/app` には一切触れないので、テストを実行しても実際の `build`/`serve`/`package` サイクルを台無しにすることは (あるいはそれによって台無しにされることも) 決してありません。ビルドされたエージェントは `agent` として公開されます。

## mock プロバイダーに対してテストする

デフォルトでは、`bxAgents test` は `Agent.bx` の `test()` 環境オーバーライド (自動的にスキャフォールドされます) を使ってエージェントをビルドします。

```javascript
// Agent.bx
function test() {
	return {
		model : "mock/mock-model"
	};
}
```

これはつまり、あなたのテストには API キーもネットワークアクセスも**一切不要**であることを意味します - BX Agents 自身のテストスイート全体を通して使われているのと同じ `mock` プロバイダーのコンベンションです。代わりに実際のプロバイダーに対してスペックを実行したい場合は、このオーバーライドを編集してください (テストを実行する環境で実際の API キーが利用可能である必要があります)。

### `mockResponses( responses )`

エージェントの次の応答をスクリプト化します。順番に消費され、ツール呼び出しループの途中のターンも含め、LLM のラウンドトリップごとに 1 つずつです。

```javascript
mockResponses( [
	{ toolCalls: [ { name: "getWeather", arguments: { city: "Miami" } } ] },
	"It's sunny in Miami!"
] )

var response = agent.run( "What's the weather in Miami?" )
```

プレーンな文字列は最終的な返信をスクリプト化します。`{ toolCalls: [ { name, arguments } ] }` 構造体はツール呼び出しターンをスクリプト化します - 名前を指定されたツールは (あなたの実際の `tools/` の実装に対して) **実際に実行され**、その実際の戻り値が次のラウンドトリップに見えるものになります。スクリプト化されるのは LLM 自身の返信だけで、ツールの振る舞いは決してスクリプト化されません。

## カスタムマッチャー

`BaseAgentSpec` は、エージェントの振る舞いのテストに合わせたいくつかのマッチャーを、TestBox 自身の `addMatchers()` 拡張ポイント経由で登録しています - 組み込みの TestBox マッチャーとまったく同じように、否定形 (`notTo...`) も含めて使用できます。

| マッチャー | 何をチェックするか |
|---|---|
| `toContainText( "substring" )` | 実際の値 (通常は応答文字列) に、指定したテキストが大文字小文字を区別せずに含まれているか。 |
| `toHaveCalledTool( "toolName" )` | エージェント自身の記録されたプロバイダーへのリクエストが、名前を指定されたツールを実際に呼び出すと決定したことを示しているか - そのツールが存在するというだけではなく。 |
| `toHaveReceivedMessage( "substring" )` | プロバイダーに実際に送信されたいずれかのメッセージ (どのロールでも、どのラウンドトリップでも) に、指定したテキストが含まれていたか - あなたのシステムプロンプト/instructions が実際にモデルに届いたことをアサートするのに便利です。 |

```javascript
expect( agent ).toHaveCalledTool( "getWeather" )
expect( agent ).notToHaveCalledTool( "getStockPrice" )
```

## テストを実行する

```bash
bxAgents test
```

あなたのプロジェクトの `tests/specs/**` を TestBox 経由で、新しい子プロセスの中で実行します (そのため、あなたが実行している他の何かと BoxLang 自身のクラスマッピングキャッシュを奪い合うことは決してありません)。バンドル/スイート/スペックの件数と、成功/失敗/エラー/スキップの合計、失敗ごとの 1 行を表示し、何か失敗があれば非ゼロで終了します - `deploy` の前の CI ゲートとして適しています。

!!! warning
    `bxAgents test` は `tests/testbox` の下に `testbox` が実際にインストールされている (`cd tests && box install`) ことを必要とします - まだそれが行われていない場合、スペック 0 件をサイレントに報告するのではなく、明確にエラーになります。
