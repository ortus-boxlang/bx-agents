---
title: "gateways/ - GitHub"
icon: phosphor-duotone:plugs-connected
tags: [conventions, gateways, github]
---

# GitHub

GitHub は push 型の [gateways/](index.md) ファミリーの一部です - 共有される「シークレットは外部に留まる」ルール、`GatewaySession`、そしてこれらのゲートウェイが動作するスケジューラについてはそちらを参照してください。このページでは GitHub 独自の設定形式と、(BxAgents がプラットフォーム固有の処理を行う場合には) GitHub との通信方法を扱います。

```javascript
// gateways/githubChannel.bx
class {
	function configure() {
		return {
			type               : "github",
			tokenEnvVar        : "GITHUB_TOKEN",           // a personal access token (repo/issues+PR read+write scope)
			webhookSecretEnvVar: "GITHUB_WEBHOOK_SECRET",  // HMAC key verifying X-Hub-Signature-256 on inbound webhooks
			botNameEnvVar      : "GITHUB_BOT_NAME"         // the bot's own GitHub login - matched as "@botName" in comments
			// apiBaseUrl: "https://api.github.com"   // optional override - defaults to "https://api.github.com"
		};
	}
}
```

`type: "github"` には `tokenEnvVar`、`webhookSecretEnvVar`、`botNameEnvVar` が必須です。 channel-adapter の `http` エントリの `secretEnvVar` と同じ方法でチェックされます。

生成される登録ステートメント:

```javascript
aiGatewayRegistry().register( aiGateway( "bxModules.bxagents.models.gateways.GitHubGateway", { "token" : getSystemSetting( "GITHUB_TOKEN", "" ), "webhookSecret" : getSystemSetting( "GITHUB_WEBHOOK_SECRET", "" ), "botName" : getSystemSetting( "GITHUB_BOT_NAME", "" ) } ) )
```

## GitHub - `@mention` によってゲートされた issue/PR コメントスレッド

`GitHubGateway` は、各 issue、PR、あるいはインラインレビューコメントスレッドを、1 つのチャット会話として扱います - エージェントは、コメント内で明示的に `@メンション` された場合に応答し、同じスレッドに新しいコメントを投稿して返信します。このセクションの他のあらゆるゲートウェイと同じ方法で Webhook 駆動です。

```javascript
post( "/webhooks/github" ).toHandler( "GitHub.process" )
```

Vercel Eve の実際の GitHub チャネル (`packages/eve/src/public/channels/github/`、MIT ライセンス) から移植されています - `X-Hub-Signature-256` の検証は、WhatsApp Cloud 自身の Meta 方式と**同一の構成**であることが確認されています (生ボディに対する HMAC-SHA256、16 進、`sha256=` プレフィックス) - このプロジェクトで唯一、独自の署名アルゴリズムが不要で他のゲートウェイの方式をそのまま再利用しているゲートウェイです。`action: "created"` を伴う `issue_comment` と `pull_request_review_comment` イベントのみがディスパッチされます (Eve 自身のデフォルトで処理されるイベント種別と一致しています - `issues`/`pull_request`/`check_suite`/`check_run`/`workflow_run` は Eve にもデフォルトのディスパッチがなく、ここにも配線されていません)。それ以外のすべてのイベント種別は (200 で) 確認応答されますが無視されます。このゲートウェイが対応しないイベントに対する GitHub の再試行/フック無効化挙動を避けるためです。

**ディスパッチのゲートは、本物の `@mention` 要件です**。Eve 自身の `extractGitHubCommentTrigger()` から移植されています - コメントは、`@<botName>` に続けて文字列の終わりか非識別子文字がある場合にのみエージェントに届きます (そのため `mybot` という名前のボットが `@mybot2` に言及するコメントで発火することは決してありません) - これは、それを信頼する前に、今回のセッションで実際の正規表現先読みのスモークテストによって確認されています。マッチした `@mention` トークンは、テキストがエージェントに届く前に取り除かれます。ボットループの防止は Eve 自身の 3 部構成のガードを反映しています - コメントの著者が GitHub 自身の `type: "Bot"` を持つか、ログインが `{botName}[bot]` に一致するか、あるいは本文にこのゲートウェイ自身の `<!-- bxagents:posted -->` マーカー (投稿するすべてのコメントに付加されます) が含まれる場合、たとえメンションを含んでいても無視されます。

「会話」は、Eve 自身のモデルに一致する 2 つの形のいずれかで識別されます: 通常の issue/PR コメントスレッドは `repo:{owner}/{repo}:issue:{issueNumber}`、インライン PR レビューコメントスレッドは `repo:{owner}/{repo}:review-comment:{reviewThreadRootCommentId}` です - レビュースレッドへの返信は常に、返信されている特定のコメントではなく**スレッドのルート**コメント (`comment.in_reply_to_id ?? comment.id`) 宛てになり、複数メッセージのやり取りが 1 つのスレッドにまとまります。送信の返信は `repos/{owner}/{repo}/issues/{issueNumber}/comments` (通常のスレッド) または `repos/{owner}/{repo}/pulls/{pullRequestNumber}/comments/{reviewCommentId}/replies` (レビュースレッド) に POST されます。

!!! info
    v1 の認証は、Eve 自身の GitHub App JWT + インストールトークンフローではなく、プレーンなパーソナルアクセストークン (`tokenEnvVar`) です - 初回実装としてよりシンプルで直接的に移植可能です (Eve 自体もまさにこの理由で事前解決済みトークンのバイパスをサポートしており、これがそこに対応します)。将来的な GitHub App モードは自然な拡張ですが、ここでは実装されていません。(ソースを読んで確認する限り) 配信 ID の重複排除をまったく持たない Eve とは異なり、`GitHubGateway` は WhatsApp Cloud 自身の `wamid` 重複排除の規律に一致する形で、`X-GitHub-Delivery` によって境界のある FIFO キャッシュ経由で重複排除します。

!!! warning
    リポジトリのチェックアウト/コード編集 (Eve 自身の `checkout.ts` で、リポジトリをサンドボックスにクローンしてエージェントがコードを読み書きできるようにするもの) は移植されていません - これはコメントイン/コメントアウトのチャット表面のみです。Human-in-the-loop は Twilio と同じ方法で劣化しています (ネイティブなボタン/カードの手段がありません) - `requestHumanInteraction()` は、許可された決定のいずれかを添えて、返信の中で再びボットに `@メンション` するよう人間に求めるコメントを投稿します。(リクエストごとのタグではなく) conversationID で紐付けられます。Twilio 自身の HITL フォールバックと同じ v1 の簡略化です。
