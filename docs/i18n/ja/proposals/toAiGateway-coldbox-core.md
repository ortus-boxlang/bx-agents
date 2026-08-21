---
title: toAiGateway() for ColdBox Core
icon: phosphor-duotone:lightbulb
summary: "ドラフト提案: ColdBox 自身の toAi() の、ゲートウェイ版の兄弟。"
description: "ドラフト提案: ColdBox 自身の toAi() の、ゲートウェイ版の兄弟。"
tags: [proposals]
---

# 提案: `toAiGateway()` — bx-ai Gateway Webhook 表面のためのネイティブな ColdBox ルーティング DSL 終端子

ステータス: ドラフト、BX Agents (`ortus-boxlang/bx-agents`) から執筆。最初のドラフトからの更新:
`coldbox-platform` (具体的には ColdBox 自体、`Router.cfc`) は、同じセッション内の後の時点で
実際にアタッチされ、直接読み込まれました — クロスオーナーの制限は永続的なものではなく、
セッションごとの状態であったことが判明しました。`ColdBox/coldbox-platform` の zip を実際の
ダウンロード URL から取得して展開した後、その `system/web/routing/Router.cfc` のソースが
全文読み込まれました。これにより、下記の「確認が必要」な 2 つの項目が解決され、より重要な
こととして、この提案の `toAi()`/`IAiRunnable` セクションが以前のドキュメントのみのパスから
引き継いでいた実際の誤りが修正されました (インラインの修正メモを参照)。

## なぜ

ColdBox 8.1 は 2 つの AI 専用ルーティング DSL 終端子を出荷しています。

- `route(pattern).toAi(target)` — `IAiRunnable` ターゲットに対する、4 つの自動登録される
  ルート (`invoke`/`stream`/`batch`/`info`)。
- `route(pattern).toMCP(target)` — 1 つのルート、`MCPRequestProcessor` にディスパッチ。

bx-ai は、ColdBox の終端子がまったく存在しない 3 つ目の HTTP 表面も出荷しています:
`IGateway`/`aiGatewayRegistry()` チャネルアダプタ Webhook 表面 (Slack/Webhook 配信、
human-in-the-loop 承認) で、固定の 3 ルートプロセッサ
(`bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()`) が前面にあります。
今日、ColdBox アプリからこれを使うということは、パススルーハンドラに 3 つのプレーンなルートを
手で配線することを意味します。それはまさに、`toAi()`/`toMCP()` がすでに、bx-ai の他の 2 つの
表面のためにそれを手作業で行わずに済むように存在している類のものです - これは、同じ方法で
構築される 3 つ目の終端子、`toAiGateway()` によって、そのギャップを埋めることを提案します。

BX Agents (bx-ai + ColdBox の上に構築された、コンベンションベースのエージェントフレームワーク
モジュール) は、当面はこの配線を自分自身で出荷しています - 下記「現在の回避策」参照 - まさに
これがコアに搭載された時点で削除できるようにするためです。

## すでに証明されていること (今回のセッションで `bx-ai` ソースに照らして検証済み)

`bxModules.bxai.models.gateway.http.GatewayRequestProcessor`:

```javascript
static string function processHttp() {
    var requestData = static.httpTransport.readRequest();
    var response     = route( requestData );
    static.httpTransport.writeResponse( response );
    return response.content;
}
```

- **引数なし、static。** これは (`cgi.PATH_INFO`、`cgi.REQUEST_METHOD`、`getHTTPRequestData()`
  経由で) 実際の HTTP リクエストを自分自身で読み取り、(`bx:header`/`bx:content reset=true`
  経由で) レスポンスも自分自身で書き込みます。これは自身のロジックのために ColdBox の
  `event`/`rc`/`prc` を必要とせず、使うこともできません。
- **`cgi.PATH_INFO` を自身の内部でルーティングし**、正確に 3 つの形を期待します:
  - `POST /gateways/{gatewayName}/events` — 受信プラットフォームイベント
  - `GET  /interactions/{requestID}` — 保留中の人間による承認インタラクションをポーリング
  - `POST /interactions/{requestID}/decisions` — 人間の決定を送信
  - (加えて、これも内部で処理される `OPTIONS` CORS プリフライト)
- パスセグメントを自身でパースするため、これの前面に立つものは何であれ、
  `GatewayRequestProcessor.route()` のセグメント数/名前チェックが一致するために、
  この 3 つの形を**そのまま** (追加のパスプレフィックスなしで) 公開する必要があります。
- `aiGatewayRegistry()` はゲートウェイを名前で解決します。ルーティングに関することは何も
  レジストリの中身を必要とせず、ただリクエストが到着する前 (通常はアプリ起動時) のどこかで
  ゲートウェイが登録されていたことだけが必要です。

これはつまり、`toAiGateway()` には**アダプタインターフェースがまったく不要**であることを
意味します - `toAi()` の `IAiRunnable` とは異なり、ターゲットクラスが実装すべきものは何も
ありません。この終端子の仕事全体は、適切なルートを適切な static 呼び出しに登録し、その後
何もレンダリングしないよう ColdBox に伝えることだけです (プロセッサはすでに実際のレスポンスを
書き込んでいます)。

## 提案されるコアの実装

`toAi()` の「1 呼び出し → N ルート」という形を反映して、3 つのルートを自動登録する単一の
終端子で、(ルーティングは WireBox マッピングではなく URL 自体から名前駆動であるため)
`toMCP()` のターゲットなし形も反映した、**ターゲット引数なし**のものです:

```javascript
route( "/bxai" ).toAiGateway();
```

これは、`route()` のパターンがどこにアンカーされていようとそれを基準に、以下を登録します:

| 動詞 | パス | 振る舞い |
|---|---|---|
| POST | `{pattern}/gateways/:gatewayName/events` | 受信プラットフォームイベント |
| GET  | `{pattern}/interactions/:requestID` | インタラクションをポーリング |
| POST | `{pattern}/interactions/:requestID/decisions` | 人間の決定を送信 |

3 つすべてが、次のことだけを行う同じ生成済み/内部アクションにディスパッチします:

```javascript
function process( event, rc, prc ) {
    bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp();
    return event.noRender();
}
```

これを実際の `Route.bx` ソースに対して実装する人向けの未解決の問題: `{pattern}` の
プレフィックス付けが安全かどうか。`GatewayRequestProcessor` が `cgi.PATH_INFO` を
**プレフィックスなし**と仮定してパースしていることを踏まえてです (上記「そのまま」の注記
参照)。解決方法は 2 つあり、優先順に並べると:
1. `toAiGateway()` は常にアプリのルートにアンカーする (空でないパターンは無視/拒否する)。
   プロセッサ自身のパスパース処理がどのみちプレフィックスに耐えられないためです。
2. ColdBox の URL リライトが常に `cgi.PATH_INFO` にリクエストされたフルパスを反映するので
   あれば (典型的な、すべてを index.bxm にリライトする ColdBox のデプロイでは)、プレフィックスは
   透過的に「そのまま動く」ため、これは実際には制約にならないかもしれません -
   どちらかを選ぶ前に経験的に検証してください。

標準的なルート修飾子 (`.as()`、`.withModule()`、`.withDomain()` など) は、`toAi()`/`toMCP()`
と同じ方法で適用されるべきです。

## 現在の回避策 (BX Agents、これがコアに搭載されたら削除する)

BX Agents のビルドパイプラインは、今日、同等の配線を手作業で生成しています:

- `RouterGenerator.bx` は、少なくとも 1 つの `http` タイプのチャネルアダプタゲートウェイが
  設定されている場合にのみ、以下を出力します:
  ```javascript
  post( "/gateways/:gatewayName/events" ).toHandler( "Gateway.process" )
  get( "/interactions/:requestID" ).toHandler( "Gateway.process" )
  post( "/interactions/:requestID/decisions" ).toHandler( "Gateway.process" )
  ```
- `GatewayGenerator.bx` は、正確に 1 つのアクションを持つ、生成された `handlers/Gateway.bx`
  を出力します:
  ```javascript
  function process( event, rc, prc ) {
      bxModules.bxai.models.gateway.http.GatewayRequestProcessor::processHttp()
      return arguments.event.noRender()
  }
  ```
- `aiGatewayRegistry().register( aiGateway( type, options ) )` 呼び出しが、設定された
  チャネルアダプタゲートウェイごとに 1 回、生成されたアプリの `Application.bx`
  `onApplicationStart()` に挿入されます。

`toAiGateway()` がコアに存在するようになれば、`RouterGenerator` は手書きの 3 つのルートを
単一の `route( ... ).toAiGateway()` 呼び出しに置き換え、`GatewayGenerator` は
`handlers/Gateway.bx` の生成を完全にやめます - 純粋な削除であり、BX Agents 側の新しい
ロジックは一切不要です。

## コア PR のためのテスト計画

- ユニット: `route(...).toAiGateway()` が正確に 3 つのルートを登録すること、動詞/パスが
  正しいこと、標準的なルート修飾子が適用されること。
- 統合: それぞれ 3 つのパスへの実際のライブリクエストが `GatewayRequestProcessor::processHttp()`
  に到達し、そのレスポンス (ステータスコード、ヘッダー、ボディ) をそのまま返すこと —
  テストハーネスで `aiGatewayRegistry()` 経由で `mock` タイプのゲートウェイを登録する
  (実際のネットワーク/LLM 呼び出しは不要で、`bx-ai` はまさにこのためのリテラルな `"mock"`
  プロバイダーを出荷しています)。
- 回帰: `event.noRender()` が、`processHttp()` がすでに `bx:content reset=true` 経由で
  レスポンスをフラッシュした後に ColdBox が二重にレスポンスを書き込むのを防ぐことを確認する。

## このセッションの後半で確認されたこと (更新)

`ColdBox/coldbox-platform` (8.1.0) が直接取得され
(`https://downloads.ortussolutions.com/ortussolutions/coldbox/8.1.0/coldbox-8.1.0.zip`)、
`system/web/routing/Router.cfc` が全文読み込まれました。ここで元々「確認が必要」として
挙げられていた両方の項目は今や解決され、この提案自体の中にあった以前の 1 つの仮定は
誤りであったことが判明し、修正されました:

1. **`toAi(target)` のターゲット解決 — 想定通りであることが確認されました。** Router.cfc:
   `var runnableInstance = isSimpleValue( capturedRunnable ) ? getInstance( capturedRunnable ) : capturedRunnable`。
   文字列は WireBox の `getInstance()` で解決され、ライブなオブジェクトはそのまま使われます。

2. **実際の `IAiRunnable` の契約 — この提案が元々述べていたことから、修正されました。**
   上記の「すでに証明されていること」セクション (変更なし、Gateway 表面については引き続き
   正確です) は bx-ai のソースのみから書かれました。別に、BX Agents 自身の M8 の作業は、
   誤りであったことが判明した `toAi()` のターゲット契約についての*公開ドキュメントの*
   説明に依拠していました: `invoke`/`stream`/`batch`/`info` は**サブルート名**であって、
   `toAi()` がターゲット上で呼び出すメソッド名ではありません。Router.cfc の実際のクロージャは
   `runnableInstance.run( input, params, options )` と
   `runnableInstance.stream( onChunk, input, params, options )` を呼び出します — つまり
   bx-ai 自身の `IAiRunnable` インターフェース (`bxModules.bxai.models.runnables.IAiRunnable`)
   であり、これは `AiAgent` がすでに `AiBaseRunnable` を通じてネイティブに実装しています。
   **アダプタサブクラスはまったく不要です** - プレーンな `aiAgent()` BIF の戻り値がすでに
   `toAi()` を満たします。BX Agents のジェネレータはこれに一致するよう修正されました
   (`GeneratedAgentRunnable.bx`/`exposeAgentAsRunnable` はもうありません)。

3. **WireBox の `.toProvider(closure)`** — 今回のセッションでは再確認されていません
   (Router.cfc は WireBox のバインダー構文には触れません)。BX Agents の `config/WireBox.bx`
   ジェネレータの中では依然として仮定のままです。リスクは低いです: `.toProvider()` は
   確立され広く使われている WireBox の DSL であり、今回のこの特定のソースパスがたまたま
   触れなかっただけです。
