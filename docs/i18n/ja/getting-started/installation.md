---
title: インストール
icon: phosphor-duotone:package
summary: BX Agents を実行するマシンに必要な 3 つのもの。
description: BX Agents を実行するマシンに必要な 3 つのもの。
tags: [getting-started, setup]
---

# インストール

BX Agents は BoxLang のモジュールです。これを実行するマシンには、次の 3 つが必要です。

1. [BoxLang](https://boxlang.io) ランタイム。
2. `bx-ai` BoxLang モジュール (BX Agents はこれを呼び出すコードを生成しますが、これ自体をバンドルしているわけではありません)。
3. BX Agents 自体。

!!! info
    `serve` はさらに、独立した [`boxlang-miniserver`](https://boxlang.ortusbooks.com/getting-started/running-boxlang/miniserver) バイナリが `PATH` 上にある必要があります。`build`、`chat`、`package`、`inspect`、`clean`、`new` にはこれは不要です。

!!! info
    `deploy` の `ftp`/`sftp` ターゲットには、`bx-ai`/BX Agents と並んで [`bx-ftp`](https://github.com/ortus-boxlang/bx-ftp) BoxLang モジュールがインストールされている必要があります (`install-bx-module bx-ftp`) - これはこのモジュールが `bx-ai` に対して持つのと同じ関係性の、バンドルされていない正真正銘のランタイム依存です。他の動詞やデプロイターゲットではこれは不要です。

::: stepper
::: step "BoxLang をインストールする"
[公式の BoxLang インストールガイド](https://boxlang.ortusbooks.com/getting-started/installation) に従ってください。クイックインストーラーは `~/.boxlang/bin` を `PATH` にも設定します。これは、モジュールが提供する実行ファイル (下記の BX Agents 自身の `bxAgents` コマンドなど) が置かれる場所です。
:::
::: step "bx-ai と BX Agents をインストールする"
```bash
install-bx-module bx-ai
install-bx-module bx-agents
```

これにより、両方のモジュールが BoxLang のモジュールディレクトリ (デフォルトでは `~/.boxlang/modules`、`--local` を指定すると `boxlang_modules/`) に取得されます。
:::
::: step "動作を確認する"
```bash
bxAgents --version
bxAgents --help
```

`--help` は、10 個すべての動詞 (`new`、`build`、`test`、`serve`、`chat`、`invoke`、`package`、`deploy`、`inspect`、`clean`) を、それぞれ 1 行の説明とともに一覧表示します。
:::
:::

## `bxAgents` コマンド

BX Agents は自身の `box.json` の中でネイティブな実行ファイルを宣言しています。

```json
"boxlang": { "moduleName": "bxagents", "executable": "bxAgents" }
```

インストーラーはこれを `PATH` 上の `bxAgents` ラッパースクリプトに変換するので、次のように実行できます。

```bash
bxAgents new my-agent --model=openai/gpt-5
```

これは、より長い形式の代わりです。

```bash
boxlang module:bxagents new my-agent --model=openai/gpt-5
```

どちらも等価です - どちらの方法でも、すべての動詞は同じ `ModuleConfig.bx main(args)` エントリーポイントを経由してディスパッチされます。このドキュメントでは全体を通して短い `bxAgents <verb>` 形式を使用します。

最初のエージェントをスキャフォールドするには [クイックスタート](quick-start.md) を参照してください。
