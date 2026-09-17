---
title: "gateways/ - Email"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, email]
---

# Email

Email は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは Email 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) Email との通信方法を扱います。

```javascript
// gateways/emailChannel.bx
class {
	function configure() {
		return {
			type              : "email",
			imapHostEnvVar    : "IMAP_HOST",
			imapUsernameEnvVar: "IMAP_USERNAME",
			imapPasswordEnvVar: "IMAP_PASSWORD",
			fromAddressEnvVar : "EMAIL_FROM_ADDRESS"
			// imapPort: 993   // optional override - defaults to 993 (IMAPS)
			// pollIntervalSeconds: 60   // optional override - defaults to 60
		};
	}
}
```

`type: "email"` には `imapHostEnvVar`、`imapUsernameEnvVar`、`imapPasswordEnvVar`、`fromAddressEnvVar` が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.EmailGateway", { "imapHost" : getSystemSetting( "IMAP_HOST", "" ), "imapUsername" : getSystemSetting( "IMAP_USERNAME", "" ), "imapPassword" : getSystemSetting( "IMAP_PASSWORD", "" ), "fromAddress" : getSystemSetting( "EMAIL_FROM_ADDRESS", "" ) } ) )
```

## Email - サーバーレベルの依存関係、そして劣化したスレッディング/HITL

`EmailGateway` は、自身のプラットフォームの API を直接話さない唯一の push 型ゲートウェイです。送信メールは、自前で組んだ HTTP/SMTP 呼び出しではなく、ColdBox 自身の [`cbmailservices`](https://coldbox.ortusbooks.com/the-basics/modules/core-modules) モジュール (`MailService@cbmailservices`、その `BXMail` プロトコル - これ自体は `bx-mail` モジュールの BoxLang 自身の `bx:mail` コンポーネントを呼び出しているだけです) を経由します。**どちらも実際の、サーバーレベルのモジュールインストールです** - このプロジェクト自身の `box.json` の `dependencies` として宣言されています (そのため `bx-agents` をインストールするとサーバーにもそれらが引き込まれます) が、cbmailservices/bx-mail はどちらも、生成されたアプリを実際に実行するサーバー上で明示的なインストールが必要です (両モジュール自身のドキュメント/ソースに照らして確認済みです - どちらも ColdBox や BoxLang にプリインストールされて出荷されることはありません) - `email` ゲートウェイを持つプロジェクトを `bxAgents serve`/デプロイする前に、実際の `box install` (または同等のもの) を行ってください。`EmailGateway` は `application.cbController.getWireBox()` から手動で `MailService@cbmailservices` を解決します (`ScheduledGatewayBase.resolveScheduler()` 自身の docblock で理由を確認できます - このクラスは `aiGateway()` によって WireBox の外側で直接構築されるため、`inject=""` はここでは決して機能しません)。スケジューラ自体が解決される方法と同じです。

`bx-mail` も `cbmailservices` もメールの受信は行わない (送信のみ) ため、受信は JDK 標準の `jakarta.mail` API による手組みの IMAP です - このプロジェクト自身のクラスパス上で推移的に到達可能であることが確認済みです (`bx-mail` は `commons-email2-jakarta` に依存し、それ自体が `jakarta.mail-api` + Angus Mail の実装に依存します)。これは推測ではなく、今回のセッションで実際の jar に対して経験的に検証されています。スケジュールされたタスク (`email-poll-<name>`) が未読メールを求めて IMAP をポーリングします。Telegram のロングポーリングと同じ形です。

スレッディングと human-in-the-loop は、どちらもチャットプラットフォームのゲートウェイと比べて**劣化して**おり、`getDeclaredCapabilities()` は意図的に `"interactiveActions"` を省いて正直にそれを表明しています。

- **スレッディング**は、通常の返信については実際の `Message-ID`/`In-Reply-To`/`References` ヘッダーを使います (ゲートウェイは自分が返信している受信 `Message-ID` を常に把握しているので、送信する返信に `In-Reply-To` を設定するのは確実です) - v1 の簡略化として、チェーン全体の完全な走査ではなく `References` の最初のエントリ (なければ `In-Reply-To`、それもなければメッセージ自身の `Message-ID`) でスレッド化します。
- **Human-in-the-loop にはネイティブなボタン/コンポーネント表面がまったくありません** - `requestHumanInteraction()` は、許可された決定キーワードを列挙したプレーンテキストのメールを送り、人間にその 1 つを最初の行として返信するよう求めます。その返信を正しい保留中リクエストに紐付ける処理は、通常の返信のようには `In-Reply-To` に頼れません (cbmailservices の `send()` は送信した承認メール自体がどんな `Message-ID` を割り当てられたかを公開しないため)。そのため、代わりに Subject 行に埋め込まれた `[bxagents:<requestID>]` タグ経由で行われます - 実際のメールベースのサポートチケットシステムが同じ理由で使うのと同じ手法です。返信の最初の行は、そのリクエスト自身の許可された決定と (完全一致またはプレフィックス一致、大小文字を区別せず) 照合されます。認識されない返信は再プロンプトされずそのまま通過し、bx-ai 自身の HITL コーディネーターに拒否させます。
