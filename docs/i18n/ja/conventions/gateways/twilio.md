---
title: "gateways/ - Twilio SMS"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, twilio]
---

# Twilio SMS

Twilio SMS は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは Twilio SMS 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) Twilio SMS との通信方法を扱います。

```javascript
// gateways/twilioChannel.bx
class {
	function configure() {
		return {
			type            : "twilio",
			accountSidEnvVar: "TWILIO_ACCOUNT_SID",
			authTokenEnvVar : "TWILIO_AUTH_TOKEN",   // also the X-Twilio-Signature HMAC key
			fromEnvVar      : "TWILIO_FROM_NUMBER"   // the Twilio phone number outbound sends go through, E.164
			// messagingServiceSid: "MG..."   // optional - if set, used instead of `from` on outbound sends
			// publicUrl: "https://your-real-public-host/webhooks/twilio"   // optional override for reverse-proxy/tunnel deployments - see the Twilio subsection below
		};
	}
}
```

`type: "twilio"` には `accountSidEnvVar`、`authTokenEnvVar`、`fromEnvVar` が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TwilioGateway", { "accountSid" : getSystemSetting( "TWILIO_ACCOUNT_SID", "" ), "authToken" : getSystemSetting( "TWILIO_AUTH_TOKEN", "" ), "from" : getSystemSetting( "TWILIO_FROM_NUMBER", "" ) } ) )
```

## Twilio SMS - 本質的に異なる署名方式、そしてデュアルパスのレスポンスモデル

`TwilioGateway` は `WhatsAppCloudGateway`/`TeamsGateway` と同じ方法で Webhook 駆動です。

```javascript
post( "/webhooks/twilio" ).toHandler( "Twilio.process" )
```

Twilio 自身の Webhook 契約を、このプロジェクトの他のあらゆるゲートウェイと本質的に異なるものにしている点が 2 つあり、どちらも Vercel Eve の実際の Twilio チャネル (`packages/eve/src/public/channels/twilio/`、MIT ライセンス) から忠実に移植されています。

- **受信ボディは form-urlencoded です** (`Body`、`From`、`To`、`MessageSid`、`AccountSid`)。JSON ではありません - `TwilioGateway` はこれを自分自身でパースします (`java.net.URLDecoder`)。JSON のデシリアライズは関与しません。
- **署名検証は `X-Twilio-Signature`: HMAC-SHA1、base64 エンコード**です (このプロジェクトの他のあらゆる Webhook ゲートウェイは HMAC-SHA256、16 進エンコードを使っています) - 署名対象文字列は、実際のリクエスト URL に続けて、キーでアルファベット順にソートされたすべての POST パラメータ自身の `key & value` を (区切り文字なしで) そのまま連結したものです。URL 自体が署名対象の一部であるため、リバースプロキシやトンネルの背後で動くプロジェクト (ColdBox が `event.getUrl()` で見る URL が、Twilio が実際に POST した先と一致しない場合) には、任意の `publicUrl` config オーバーライドが必要です。Eve 自身のドキュメントがその `webhookUrl` オプションについて指摘しているのと同じ種類の落とし穴です。
- **同期 Webhook のレスポンスは常に空の TwiML `<Response></Response>` です** - Twilio 自身のクラシックなデュアルパスモデルです。実際のエージェントの返信は、GatewaySession の非同期ターンが完了した後、Messages API への別個の `deliver()` REST 呼び出しを通じて、アウトオブバンドで後から送られます。Eve 自身の `emptyTwilioResponse()` と正確に一致します (Eve は同期的な TwiML `<Message>` でインラインに応答することは決してありません)。

送信は、Basic 認証の REST 呼び出しで `POST /2010-04-01/Accounts/{AccountSid}/Messages.json` に対して行われ、form エンコードされたボディ (`To`、`Body`、そして設定されていれば `From` または `MessagingServiceSid`) です。v1 は SMS テキストのみです - Eve 自身の Twilio チャネルは SMS+音声の複合チャネルです (`/voice` ルート、`<Gather>`/`<Say>` TwiML、通話文字起こし)。音声関連の部分は一切移植されていません。

!!! warning
    SMS には**ネイティブなボタン/カードの手段がまったくありません** (Eve 自身のドキュメントで確認済み)。そのため human-in-the-loop は Email と同じ方法で劣化しています - `getDeclaredCapabilities()` は `"interactiveActions"` を省いています (Twilio のクラシックな Messages API にはネイティブな返信/引用の概念もないため `"threads"` も省いています)。`requestHumanInteraction()` は許可された決定を列挙したプレーンテキストの SMS を送ります。Email (最終的な返信を紐付けるために Subject 行に `[bxagents:<requestID>]` タグを埋め込みます) とは異なり、SMS にはタグを付けられる Subject 行がありません - そのため保留中のリクエストは、送信者自身の電話番号 (conversationID) をキーにします。これは、一度に電話番号あたり最大 1 件の未処理 HITL リクエストしかないことを前提とする v1 の簡略化です。

!!! info
    (ソースをグレップして確認する限り) 長さ制限ロジックをまったく持たず、もっぱら Twilio 自身のサーバー側セグメンテーションに頼っている Eve とは異なり、`TwilioGateway` は他のすべてのゲートウェイのチャンキング挙動との一貫性のため、1600 文字 (Twilio 自身が文書化している単一メッセージの連結上限) で `MessageChunker` を適用します。HMAC-SHA1 署名方式は、今回のセッションで、BoxLang の実装を信頼する前に、独立して計算した Python の `hmac`/`hashlib` の参照値と照らし合わせて検証されています。WhatsApp Cloud 自身の HMAC-SHA256 方式と同じ規律です。
