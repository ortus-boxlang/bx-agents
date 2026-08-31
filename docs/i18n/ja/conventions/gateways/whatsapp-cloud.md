---
title: "gateways/ - WhatsApp Business Cloud"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, whatsappcloud]
---

# WhatsApp Business Cloud

WhatsApp Business Cloud は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは WhatsApp Business Cloud 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) WhatsApp Business Cloud との通信方法を扱います。

```javascript
// gateways/whatsappCloud.bx
class {
	function configure() {
		return {
			type               : "whatsapp-cloud",
			accessTokenEnvVar  : "WHATSAPP_ACCESS_TOKEN",     // Graph API access token
			phoneNumberIdEnvVar: "WHATSAPP_PHONE_NUMBER_ID",  // the WhatsApp Business phone number ID sends go through
			appSecretEnvVar    : "WHATSAPP_APP_SECRET",       // HMAC key verifying X-Hub-Signature-256 on inbound webhooks
			verifyTokenEnvVar  : "WHATSAPP_VERIFY_TOKEN"      // shared secret Meta's GET verify handshake must echo back
			// apiVersion: "v21.0"   // optional override - defaults to "v21.0"
		};
	}
}
```

`type: "whatsapp-cloud"` には `accessTokenEnvVar`、`phoneNumberIdEnvVar`、`appSecretEnvVar`、`verifyTokenEnvVar` が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.whatsapp.WhatsAppCloudGateway", { "accessToken" : getSystemSetting( "WHATSAPP_ACCESS_TOKEN", "" ), "phoneNumberId" : getSystemSetting( "WHATSAPP_PHONE_NUMBER_ID", "" ), "appSecret" : getSystemSetting( "WHATSAPP_APP_SECRET", "" ), "verifyToken" : getSystemSetting( "WHATSAPP_VERIFY_TOKEN", "" ) } ) )
```

## WhatsApp Business Cloud API - Webhook 駆動、接続駆動ではない

`WhatsAppCloudGateway` は、他のすべての push 型ゲートウェイとは異なる形をしています。このゲートウェイが独自の送信接続 (ポーリングタスクや WebSocket) を保持するのではなく、Meta が公開 Webhook 経由で**私たち**を呼び出します。これは `ScheduledGatewayBase` ではなく、bx-ai の `BaseGateway` を直接 extends します - 管理すべきスケジューラタスクやソケットはなく、`whatsapp-cloud` ゲートウェイエントリが存在する場合にのみ書き込まれる、2 つの固定ルートに配線された生成済みの `handlers/WhatsAppCloud.bx` があるだけです。

```javascript
get( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.verify" )
post( "/webhooks/whatsapp-cloud" ).toHandler( "WhatsAppCloud.process" )
```

どちらのアクションも、ゲートウェイ自身の `handleVerify()`/`handleWebhook()` への薄いパススルーです - `verify` は Meta のサブスクリプションハンドシェイク (`GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`) に応答し、モードとトークンが一致する場合にのみ (定数時間で比較したうえで) challenge をプレーンテキストとしてそのまま返します。`process` は、何かをパース/ディスパッチする前に、Meta 自身の `X-Hub-Signature-256` ヘッダー (**厳密な生の POST ボディ** - `event.getHTTPContent()` - に対する HMAC-SHA256。再パース/再シリアライズされた JSON では、バイト列が変わり署名が壊れてしまうため決して使いません) を検証します。これは bx-ai 自身の `HttpGateway`/`GatewaySecurity` (異なるヘッダー名、異なる HMAC 構成) とは本質的に異なる方式であるため、ここでは再利用されていません - クラス自身の docblock を参照してください。

[Hermes Agent's](https://github.com/NousResearch/hermes-agent) 自身の実際の本番用 WhatsApp Cloud アダプタ (`gateway/platforms/whatsapp_cloud.py`、MIT ライセンス) から直接移植されています - verify ハンドシェイク、署名方式、Webhook ペイロードの走査 (`entry[].changes[].value.{messages,contacts}`)、送信メッセージ/インタラクティブボタンの形 (許可された決定が 3 つ以下ならネイティブなボタンとして、4 つ以上なら「タップして開く」リストとして描画され、WhatsApp 自身が文書化している制限に一致します)、そして長さの制限 (4096 文字のメッセージ、20 文字のボタンラベル、1024 文字のインタラクティブ本文テキスト) は、今回のセッションでそのソースから直接読み取られたもので、ゼロから再実装されたものではありません。受信メッセージは自身の `wamid` によって重複排除されます (Meta は 200 以外のあらゆる応答に対して、最大 7 日間 Webhook 配信を再試行します)。境界のある FIFO キャッシュ経由で、Hermes 自身の `_dedup_wamid` を模倣しています。

!!! warning
    v1 のスコープは、Hermes 自身が文書化している制限と一致しています。Cloud API の DM には別個の「チャット」エンティティがなく - `chat_id` は送信者の `wa_id` そのものです - グループメッセージ (自身の `chat` フィールドでグループの JID を識別するもの) はスコープ外です。メディア (画像/動画/文書/音声) はダウンロードされず、存在する場合のキャプションのみが扱われます。他のすべての push 型ゲートウェイと同様に、上記で解説した「タイプごとに 1 インスタンス」というレジストリの上限を共有しており、`whatsapp-cloud` も例外ではありません。

!!! info
    生成される `handlers/WhatsAppCloud.bx` 自身の ColdBox リクエストコンテキスト呼び出し (`event.getHTTPContent()`/`event.getHTTPHeader()`/`event.renderData()`、GET ハンドシェイク用の `rc` の URL スコープにマージされたクエリパラメータ) は、文書化された標準的な ColdBox REST ハンドラのイディオムです - しかし、(今回のセッションで実際の HMAC/JSON の挙動に対して十分にユニットテストされ経験的に検証されている) ゲートウェイ自身の署名/ディスパッチロジックとは異なり、この特定の生成されたルート配線は、実際の ColdBox の起動に対しては検証されていません。known-limitations.md を参照してください。

**`"whatsapp-personal"` というタイプはありません。** 非公式の個人アカウントブリッジ (WhatsApp のマルチデバイス Web プロトコルで、Hermes Agent が Node.js/Baileys サブプロセス経由で到達する種類のもの) は調査されましたが、意図的に実装されませんでした - MIT ライセンスのネイティブ Java の選択肢だった Cobalt (`com.github.auties00:cobalt`) は、実際に Maven Central に公開されているバージョンでは商用/プロプライエタリな依存関係 (`com.aspose:aspose-words`) を引き込むことが判明し、サブプロセスブリッジによる移植もネイティブ JVM アプローチを優先して見送られました。`gateways/*` エントリで `type: "whatsapp-personal"` を宣言すると、他のあらゆる未サポートタイプと同様に「unknown type」検証エラーで失敗します。詳しい調査の全容は `docs/known-limitations.md` を参照してください。
