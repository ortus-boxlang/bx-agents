---
title: "gateways/ - Discord"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, discord]
---

# Discord

Discord は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは Discord 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) Discord との通信方法を扱います。

```javascript
// gateways/discordChannel.bx
class {
	function configure() {
		return {
			type          : "discord",
			botTokenEnvVar: "DISCORD_BOT_TOKEN"   // Authorization: Bot <token> on every REST call and inside Identify
			// intents: 37377   // optional override - defaults to GUILDS+GUILD_MESSAGES+DIRECT_MESSAGES+MESSAGE_CONTENT
		};
	}
}
```

`type: "discord"` には `botTokenEnvVar` が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.DiscordGateway", { "botToken" : getSystemSetting( "DISCORD_BOT_TOKEN", "" ) } ) )
```

## Discord の永続的な接続 - クライアント駆動の必須ハートビート

`DiscordGateway` も同じ方法 (`models/gateways/support/DiscordSocketListener.bx`、Slack と同じ `implements="java:java.net.http.WebSocket$Listener"` パターン) で接続しますが、Discord の Gateway プロトコルには Slack の Socket Mode にはない要件があります - サーバー自身の `Hello` フレーム (opcode 10) がクライアントに `heartbeat_interval` を伝え、クライアントはそのペースで自分から `Heartbeat` フレーム (opcode 1) を送り続ける必要があります。さもなければ Discord は接続を「ゾンビ化」したとみなして切断します。この間隔は `Hello` が届いて初めて分かる (接続前には分からない) ため、ハートビートはそれ自身のスケジューラタスク (`discord-heartbeat-<name>`) としてフレームハンドラの内部から動的に登録され、新しい `Hello` が届くたびに再登録されます - これは他のすべての push 型ゲートウェイの `registerScheduledTasks()` 時に固定されるタスクとも、Discord 自身のセーフティネットウォッチドッグ (`discord-watchdog-<name>`、30 秒ごと、Slack と同じ役割) とも異なります。

各ハートビートのティックは、*直前の*ハートビートが実際に確認応答されたか (`Heartbeat ACK`、opcode 11) をチェックします - されていなければ、その接続はゾンビ化しているとみなされ、タイムアウトを待つのではなく能動的に再接続されます。それ以外の再接続は、Discord 自身が文書化しているセッションモデルに従います - `Reconnect` フレーム (opcode 7) や大半のクローズコードは、既存のセッションがある場合は新しい接続上での `Resume` (opcode 6、最後のシーケンス番号を再生) をトリガーします。`d: false` を持つ `Invalid Session` フレーム (opcode 9)、または Discord がセッション無効化と文書化しているクローズコード (`4007`、`4009`) は、代わりに新規の `Identify` (opcode 2) を強制します。小さな固定セットのクローズコード (`4004` 不正なトークン、`4010` 不正なシャード、`4011` シャーディング必須、`4012` 不正な API バージョン、`4013`/`4014` 不正/未許可のインテント) は Discord 自身のドキュメントに従い回復不能です - このゲートウェイは、どうせ再び失敗するであろう接続を再試行するのではなく停止します。

!!! warning
    `MESSAGE_CONTENT` (ギルドチャンネルと DM の両方で、メッセージテキストを読み取るために必要) は Discord の**特権 (privileged)** Gateway インテントです - Discord Developer Portal で自分のボットに対して明示的に有効化する必要があり、あなたのアプリが認証済み (100 以上のギルド) になった後は Discord による承認も必要です。これがないと、すべての受信メッセージは空の `content` フィールドで届きます。
