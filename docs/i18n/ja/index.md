---
title: BX Agents
order: 1
icon: phosphor-duotone:robot
summary: フォルダとファイルでエージェントを記述し、実際に動く ColdBox アプリケーションへとビルドします。
description: フォルダとファイルでエージェントを記述し、実際に動く ColdBox アプリケーションへとビルドします。
tags: [overview]
toc: false
---

<div class="bxdocs-hero">
	<img class="bxdocs-hero__banner" src="assets/home-banner.jpg" alt="BX Agents - Build. Constrain. Orchestrate. A conventions-based agent framework for BoxLang. Conventions first: convention over configuration for faster development. Pluggable and extensible: swap models, tools, memory and more with ease. Powerful agents: create agents that reason, act, and collaborate effectively. Production ready: built for performance, reliability, and real-world applications. The agent framework native to BoxLang.">
	<div class="bxdocs-hero__actions">
		<a class="bxdocs-hero__btn bxdocs-hero__btn--primary" href="getting-started/installation.md">Get Started</a>
		<a class="bxdocs-hero__btn bxdocs-hero__btn--secondary" href="https://github.com/ortus-boxlang/bx-agents">View on GitHub</a>
	</div>
</div>

**BX Agents** は [BoxLang](https://boxlang.io) 向けの、コンベンションベースの AI エージェントフレームワークです。
[ColdBox](https://coldbox.ortusbooks.com) と
[BX AI](https://boxlang.ortusbooks.com/boxlang-+-++/modules/bx-ai) の上に構築されています。エージェントは
フレームワークの API を直接扱うのではなく、ファイルとフォルダで記述します。すると `bxAgents build` がそこから
実際に動く、実行可能な ColdBox アプリケーションを組み立てます。

::: cards
::: card title="ビルド時に組み立てる" icon="phosphor-duotone:gear-six" href="build-pipeline.md"
発見・検証・コード生成は起動のたびにではなく、**一度だけ**実行されます。ビルド後に実行するのは
ただの ColdBox アプリです。
:::
::: card title="フォルダが API" icon="phosphor-duotone:tree-structure" href="conventions/agent-bx.md"
`Agent.bx` と `instructions.md` だけが必須ファイルです。それ以外のコンベンションフォルダは
すべて任意で、存在する場合にのみ出力に反映されます。
:::
::: card title="ツールとスキル" icon="phosphor-duotone:wrench" href="conventions/tools.md"
`@AITool` 注釈付きの関数を `tools/` に置くか、`SKILL.md` フォルダを `skills/` に置くだけで、
どちらも自動的に検出・組み込みされます。
:::
::: card title="どこまでもエージェント" icon="phosphor-duotone:users-three" href="conventions/subagents.md"
`subagents/` はまったく同じコンベンションツリーを入れ子にできるので、専門家チームは単にフォルダを
増やすだけで作れます - リーフ (末端) から先にビルドされます。
:::
::: card title="12 種類のゲートウェイ" icon="phosphor-duotone:chats-circle" href="conventions/gateways.md"
Telegram、Slack、Discord、Email、WhatsApp、Teams、Twilio、GitHub、Signal に加え、`http`、
`cli`、`mock`。
:::
::: card title="Web チャット UI を自動生成" icon="phosphor-duotone:globe-hemisphere-west" href="conventions/web-ui.md"
`Agent.bx` でリクエストすれば、ビルドがセッション履歴付きの、テーマ変更可能なストリーミング
チャットフロントエンドを生成します。
:::
:::

## 4 ステップでエージェントを構築する

::: stepper
::: step "インストール"
=== "BoxLang"
    ```bash
    install-bx-module bx-ai bx-agents
    ```

=== "CommandBox"
    ```bash
    box install bx-ai,bx-agents
    ```
:::
::: step "スキャフォールド"
```bash
bxAgents new my-agent --model=openai/gpt-5
```
続いて `instructions.md` を編集し、必要なコンベンションフォルダを追加します。
:::
::: step "ビルド"
```bash
bxAgents build
```
発見・検証・マニフェスト生成・コード生成を行い `.build/app/` に出力します。
:::
::: step "対話する"
```bash
bxAgents chat
# または HTTP で公開する:
bxAgents serve --port=8080
```
:::
:::

## `build` が実際に生成するもの

あなたのコンベンションツリーと、`build` がそれを変換する、ただの ColdBox アプリケーション。

::: columns
::: column
```
your-agent/
├── Agent.bx           # name, model, description
├── instructions.md    # the system prompt
├── tools/             # @AITool functions
├── skills/            # SKILL.md capabilities
├── subagents/         # nested agent trees
├── models/            # named model configs
├── gateways/          # HTTP/MCP/chat exposure
├── schedules/         # a real ColdBox scheduler
├── mcp/               # MCP servers you host
├── interceptors/      # lifecycle hooks
└── modules/           # module dependencies
```
:::
::: column
```
.build/app/
├── Application.bx
├── config/
│   ├── ColdBox.bx
│   ├── WireBox.bx
│   ├── Router.bx
│   └── Scheduler.bx
├── agent/
│   └── GeneratedAgentFactory.bx
├── tools/  skills/  mcp/
├── handlers/  interceptors/
└── index.bxm
```
:::
:::

::: expandable "なぜリクエスト時ではなくビルド時に組み立てるのか?"
多くのエージェントフレームワークは、起動のたびに、**リクエスト時に**ツール・スキル・ルート・
スケジュールを配線します。BX Agents はその逆です。`bxAgents build` が発見・検証・コード生成を
正確に一度だけ実行し、`.build/app/` の下にただの ColdBox アプリケーションを生成します。

それを起動する - `bxAgents serve` 経由でも、実際の
[`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver)
プロセスでも、BoxLang が動くどこにでもデプロイできるポータブルな `.bxa` でも - あとは通常の
アプリを起動するのと同じです。コンベンションのスキャンも、動的なファイル走査も、リクエストパスに
先送りされるビルド時作業も一切ありません。
:::

::: columns
::: column
!!! tip "まずは 1 ファイルから始める"
    必須なのは `Agent.bx` だけです。`instructions.md` は任意です - クラス内で直接 instructions を
    設定してもよいですし、ファイルを置いてビルドに組み込ませることもできます。他のフォルダは
    すべて、それが**存在し、かつ**中身がある場合にのみ生成出力に影響します - つまり実際に
    必要になった時点でコンベンションを足していけます。
:::
::: column
!!! faq "Agent.bx こそがエージェントである"
    `Agent.bx` は BX AI 自身の `AiAgent` を直接 extends します - ビルドは config 構造体から
    再構築するのではなく、あなたのクラスをそのままインスタンス化するので、書いたものがそのまま
    実行されます。IDE も他の通常のクラスと同じように解析できます。詳しくは
    [Agent.bx](conventions/agent-bx.md) を参照してください。
:::
:::

## どこからでも到達できるように

::: cards
::: card title="チャットプラットフォーム" icon="phosphor-duotone:plugs-connected" href="conventions/gateways.md"
9 種類の push 型ゲートウェイ - Telegram、Slack、Discord、Email、WhatsApp Cloud、Teams、Twilio、
GitHub、Signal - を、`queue` / `steer` / `interrupt` ポリシーを持つ 1 つのセッションが調整します。
:::
::: card title="HTTP と MCP" icon="phosphor-duotone:stack" href="conventions/mcp.md"
エージェントを HTTP ルートとして公開したり、`mcp/` からローカル MCP サーバーをホストして
他のクライアントからツールを呼び出せるようにします。
:::
::: card title="出荷する" icon="phosphor-duotone:package" href="deployment-and-secrets.md"
ポータブルな `.bxa` をパッケージ化し、`local`、`ssh`、`docker`、`digitalocean`、
`ftp`、`sftp` のいずれかでデプロイします - シークレットは常に環境変数のままで、ビルド成果物には
決して含まれません。
:::
:::

## 次に読むべきもの

::: cards
::: card title="インストール" icon="phosphor-duotone:rocket-launch" href="getting-started/installation.md"
BoxLang、BX AI、BX Agents をインストールします。
:::
::: card title="クイックスタート" icon="phosphor-duotone:lightning" href="getting-started/quick-start.md"
最初のエージェントをスキャフォールドし、ビルドし、対話します。
:::
::: card title="コンベンション" icon="phosphor-duotone:cube" href="conventions/agent-bx.md"
コンベンションフォルダごとに 1 ページ、最初から最後まで解説します。
:::
::: card title="ビルドパイプライン" icon="phosphor-duotone:graph" href="build-pipeline.md"
`build` が何を、どの順序で行うかを正確に説明します。
:::
::: card title="CLI リファレンス" icon="phosphor-duotone:terminal-window" href="cli-reference.md"
すべての動詞 (verb) とそのフラグ。
:::
::: card title="デプロイとシークレット" icon="phosphor-duotone:cloud-arrow-up" href="deployment-and-secrets.md"
`.bxa` をパッケージ化し、安全に出荷します。
:::
:::

すべてのコンベンションフォルダには、実際に動く、ビルド可能なサンプルが
[`examples/`](https://github.com/ortus-boxlang/bx-agents/tree/development/examples) 以下に用意されています。

!!! warning
    BX Agents は現在も活発に開発が進められています。[既知の制限](known-limitations.md) では、
    実際に動くアプリに対して検証済みの部分、BX AI の `"mock"` プロバイダーに対してしか
    まだ実行されていない部分、そしてこのプロジェクトが遭遇し回避した実際の ColdBox 側の
    癖について、正直に記録しています。
