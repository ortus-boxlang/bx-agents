---
title: "gateways/ - Slack"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, slack]
---

# Slack

Slack は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは Slack 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) Slack との通信方法を扱います。

```javascript
// gateways/slackChannel.bx
class {
	function configure() {
		return {
			type          : "slack",
			botTokenEnvVar: "SLACK_BOT_TOKEN",   // xoxb-... - chat.postMessage/chat.update
			appTokenEnvVar: "SLACK_APP_TOKEN"    // xapp-... - apps.connections.open (Socket Mode)
		};
	}
}
```

`type: "slack"` には `botTokenEnvVar` と `appTokenEnvVar` の両方が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SlackGateway", { "appToken" : getSystemSetting( "SLACK_APP_TOKEN", "" ), "botToken" : getSystemSetting( "SLACK_BOT_TOKEN", "" ) } ) )
```

## Slack の永続的な接続

`SlackGateway` は、`java.net.http.HttpClient` の非同期 WebSocket クライアントを通じて、`implements="java:java.net.http.WebSocket$Listener"` を直接実装する BoxLang のリスナークラス (`models/gateways/support/SlackSocketListener.bx`) からブリッジされる形で、自身の WebSocket を保持します - BoxLang はこれを、そのインターフェースの実際の JVM 実装としてコンパイルします。これは、インスタンスをそのまま `HttpClient.newWebSocketBuilder().buildAsync( uri, listener )` に渡してもキャストエラーが発生しないこと (実際のネットワーク境界に到達した際に期待される `java.net.ConnectException` のみが発生すること) によって経験的に確認されています。クラスが実際に宣言しているメソッドだけが JDK インターフェースの `default` メソッドをオーバーライドします。実装されていないものは自動的に JDK 自身のデフォルト動作にフォールスルーします。これは、他のあらゆる永続接続ゲートウェイ (後述の Discord) が従う参照パターンでもあります。

再接続は、Slack 自身のプロトコルシグナル - `disconnect` フレーム (`warning`/`refresh_requested`) や予期しないソケットクローズ - によって能動的に駆動され、Slack が文書化して推奨する通り、古い接続を閉じる前に**新しい**接続を開きます。軽量なスケジューラウォッチドッグ (`slack-watchdog-<name>`、30 秒ごと) は、これらどちらのシグナルも発火しなかった場合のためのセーフティネットに過ぎません。
