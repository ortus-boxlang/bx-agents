---
title: "gateways/ - Signal"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, signal]
---

# Signal

Signal は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは Signal 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) Signal との通信方法を扱います。

```javascript
// gateways/signalChannel.bx
class {
	function configure() {
		return {
			type         : "signal",
			accountEnvVar: "MY_SIGNAL_ACCOUNT"   // the signal-cli-registered phone number this gateway sends/receives as, E.164
			// httpUrl: "http://127.0.0.1:8080"   // optional override - defaults to "http://127.0.0.1:8080", where signal-cli's own daemon HTTP API is expected to be listening
		};
	}
}
```

`type: "signal"` には `accountEnvVar` が必須です - すべて `http` の `secretEnvVar` と同じ方法でチェックされます。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.SignalGateway", { "account" : getSystemSetting( "MY_SIGNAL_ACCOUNT", "" ) } ) )
```

## Signal - 4 つ目の転送形式、外部の `signal-cli` デーモンに対して

`SignalGateway` は、上記の WhatsApp Cloud/Teams/Twilio/GitHub のように Webhook 駆動でもなければ、Slack/Discord のような WebSocket でもありません - Telegram/Slack/Discord/Email と同じように `ScheduledGatewayBase` を extends しますが、自身の接続は**サーバー送信イベント**です。`java.net.http.HttpClient` の非同期 API (`sendAsync()` + `BodyHandlers.ofLines()`) 経由で保持される、単一の長時間持続する `GET {httpUrl}/api/v1/events?account=...` リクエストで、signal-cli 自身のデーモンが同じレスポンスボディを通して push してくる 1 行 1 JSON イベントを読み取ります。送信はプレーンな JSON-RPC 2.0 です (`POST {httpUrl}/api/v1/rpc`、`{"jsonrpc":"2.0","method":"send","params":{...},"id":...}`)。同じデーモンに対して行われます。

公式の Signal ボット API は存在しません - `SignalGateway` は、[`signal-cli`](https://github.com/AsamK/signal-cli) が自身の `daemon --http` モードで動いているものと完全に通信します。これはこのゲートウェイが依存しているものの、自身では管理しない**外部の前提条件**であり、`EmailGateway` が外部の IMAP/SMTP サーバーと持つ関係と同じです。[Hermes Agent's](https://github.com/NousResearch/hermes-agent) 自身の実際の Signal チャネルから移植されています - SSE/JSON-RPC のワイヤー形式、再接続のバックオフ定数 (2 秒から 60 秒への指数関数的増加、+20% のジッター)、そして 30 秒/120 秒のアイドルウォッチドッグは、すべてそのソースから直接読み取られたもので、ゼロから再実装されたものではありません。

!!! warning
    動作する `signal-cli` デーモンを用意することは、このプロジェクトの外側にある、実際の、手動の、一度きりのセットアップ作業です: `signal-cli` をインストールし、実際の Signal アカウントに登録/リンクし (`signal-cli link` または `register`、どちらも実際の電話番号とデバイスリンクの QR/検証ステップが必要です)、`signal-cli -a <account> daemon --http=127.0.0.1:8080` を実行し、そのプロセスを稼働させ続ける (systemd サービスやコンテナのサイドカーであり、`bxAgents serve` があなたのために起動してくれるものではありません) 必要があります。`SignalGateway` 自身の `onConnect()` は `account` が設定されていなければ `MissingConfig` で大きく失敗しますが、デーモン自体を検出したり起動したりすることはできません - 接続時点で `httpUrl` に到達できない場合、素早い失敗ではなく通常の再接続バックオフサイクルとして表面化します。

!!! info
    v1 は**DM のみ**です - Hermes 自身の Signal チャネルはグループ会話をデフォルトでオプトイン/オフとして扱っており、ここではそのモードのみが移植されています。Human-in-the-loop は Twilio/GitHub のフォールバックと同じ方法で劣化しています (`getDeclaredCapabilities()` は `"interactiveActions"` を省いています) - Signal の既読/リアクションは signal-cli 自身の API では書き込み専用の見た目上のステータスであり、本物の回答チャネルではないため、`requestHumanInteraction()` は Twilio 自身の電話番号キー方式のフォールバックのように、conversationID で紐付けられたプレーンテキストメッセージにフォールバックします。JSON-RPC/SSE のパースロジック (`handleSseEvent()`、引用スレッディング、グループメッセージのフィルタリング、HITL 決定のマッチング) は、最も外側の `rpcCaller`/`connector` の I/O 呼び出しだけをスタブ化した状態で、実際の公開メソッドを通して駆動されました。他のあらゆるゲートウェイと同じシームテストの規律です - しかしこの環境では実際の `signal-cli` デーモンが利用できなかったため、実際の非同期接続のライフサイクル (SSE ストリームを開くこと、本当に不安定な接続に対する再接続バックオフループ、ライブなデーモンに対する JSON-RPC のラウンドトリップ) はエンドツーエンドでは一度も演習されていません。相互運用のプラモービングレベルでのみスモークテストされています。`java.net.http.HttpClient` の相互運用チェーン自体は健全であることが確認されています - スタンドアロンのスモークテストが、到達不能なテストアドレスに対して実際のネットワーク境界で本物の `java.net.ConnectException` に到達し、ライブなデーモンに触れたことは一度もないものの、配線が機能することを証明しています。
