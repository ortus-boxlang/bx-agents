---
title: "gateways/ - Microsoft Teams"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, teams]
---

# Microsoft Teams

Microsoft Teams は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは Microsoft Teams 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) Microsoft Teams との通信方法を扱います。

```javascript
// gateways/teamsChannel.bx
class {
	function configure() {
		return {
			type                : "teams",
			appIdEnvVar         : "TEAMS_APP_ID",         // the bot's own Microsoft App ID (also the inbound JWT's required aud claim)
			appPasswordEnvVar   : "TEAMS_APP_PASSWORD"    // OAuth2 client-credentials secret
			// tenantId: "..."   // optional override for single-tenant apps - defaults to "botframework.com" (multi-tenant)
		};
	}
}
```

`type: "teams"` には `appIdEnvVar` と `appPasswordEnvVar` が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.TeamsGateway", { "appId" : getSystemSetting( "TEAMS_APP_ID", "" ), "appPassword" : getSystemSetting( "TEAMS_APP_PASSWORD", "" ) } ) )
```

## Microsoft Teams - Bot Framework Activity プロトコル

`TeamsGateway` は `WhatsAppCloudGateway` と同じ方法で Webhook 駆動です - `BaseGateway` を直接 extends し、Microsoft 自身の Bot Connector サービスが単一の生成済みルート経由で**私たち**を呼び出します。

```javascript
post( "/webhooks/teams" ).toHandler( "Teams.process" )
```

WhatsApp Cloud とは異なり GET verify ハンドシェイクはありません (Bot Framework には Meta の `hub.challenge` に相当するものがありません) - すべての受信アクティビティは、ボディに対する HMAC 署名ではなく、`Authorization` ヘッダー内の**ベアラー JWT** によって検証される署名済み POST として届きます。この JWT は Bot Connector 自身の JWKS (`https://login.botframework.com/v1/.well-known/openidconfiguration` → その `jwks_uri`) に対してチェックされます - RS256 署名、`aud` はボット自身の設定済み `appId` と一致する必要があり、`iss` は Bot Connector の固定された発行者文字列 (`https://api.botframework.com`) と一致する必要があります。どちらも 5 分間のクロックスキュー許容付きです。これは BoxLang 自身の Java 相互運用 (`java.security.Signature`、`java.security.KeyFactory`、`java.math.BigInteger`) から構築された、本物の RSA/JWT 検証です - 外部の JWT ライブラリはありません。送信呼び出しは別個の OAuth2 クライアントクレデンシャルトークンを使います (`login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` から取得し、キャッシュされ、記載された有効期限の 60 秒前に再取得されます)。

[Vercel Eve's](https://github.com/vercel/eve) 自身の実際の Teams チャネル (`packages/eve/src/public/channels/teams/`、MIT ライセンス) から移植されています - OAuth2 フロー、JWT 検証方式、`v3/conversations/{id}/activities[/{activityId}]` REST の三点セット、そして Adaptive Card による human-in-the-loop の形 (schema 1.5、許可された決定ごとに 1 つの `Action.Submit` ボタン) は、すべてこの実装を反映しています。**Hermes Agent 自身の `msgraph_webhook.py` は無関係です**。「Microsoft Webhook」という似た名前にもかかわらず、これは Microsoft Graph の*変更通知*Webhook (メールボックス/ドライブ/リストのリソース変更イベントという、送信 Teams メッセージングがまったく動作しない別の Microsoft 製品表面) を実装したものであり、ここには何も移植されていません。

!!! warning
    v1 のスコープは**個人 (1:1 DM) の会話のみ**です - グループチャットとチャンネル全体へのメッセージには、ボットのメンションゲーティングと、Eve 自身は実装しているがこの移植には含まれない、別のリプライスレッディングモデルが必要です。他のすべての push 型ゲートウェイ自身の DM ファーストな v1 スコープと一致します。UI の可読性のため、Bot Framework プロトコルの本来の 80 KiB 上限ではなく、4000 文字のメッセージチャンクの上限が使われています (Eve 自身の Adaptive Card テキスト切り詰め定数です)。

!!! info
    Bot Connector の JWKS は一度取得され、ゲートウェイインスタンスの生存期間中キャッシュされます - Microsoft が、すでにキャッシュされている `kid` と一致しない状態で署名鍵をローテーションした場合、そのゲートウェイ (ひいてはアプリ全体) が再起動されるまで検証が失敗し続けます。v1 では定期的なキャッシュ無効化は実装されていません。JWT 検証ロジック自体は、今回のセッションで、実際にローカルで生成した RSA 鍵ペアと手で署名したテスト JWT に対して経験的に検証されています (有効な署名は受理され、改ざんされた署名/誤った audience/期限切れのトークンはいずれも 401 で拒否されます) - Eve のソースを読んだだけではありません。
