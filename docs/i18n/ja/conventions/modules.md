---
title: modules/
icon: phosphor-duotone:cube
summary: BoxLang のモジュール依存関係。モジュールごとに 1 つの直下のサブフォルダ。
description: BoxLang のモジュール依存関係。モジュールごとに 1 つの直下のサブフォルダ。
tags: [conventions, modules]
---

# modules/

`modules/` は、あなたのエージェントが必要とする BoxLang のモジュール依存関係を保持します - モジュールごとに直下に 1 つのサブフォルダがあり、フォルダ名で発見されます (再帰的ではなく、`modules/` のトップレベルのみが列挙されます)。

```
modules/
└── my-extra-module/
    ├── module.json
    └── ...
```

## モジュール間の依存関係を宣言する

モジュールフォルダには、他の `modules/*` エントリをフォルダ名で指定する `dependsOn` 配列を持つ `module.json` を含めることができます。

```json
{
	"dependsOn": [ "some-other-module" ]
}
```

これは検証目的のための BX Agents 独自の依存関係宣言コンベンションです - BoxLang 自身のモジュールロード機構とは独立しています。

## 検証

- 有効な JSON ではない `module.json` は、問題のあるモジュールの名前を挙げたパースエラーでビルドを失敗させます。
- 発見された `modules/*` フォルダではないモジュールを指す `dependsOn` エントリは検証に失敗します ("depends on unknown module")。
- **循環依存**は、[サブエージェント](subagents.md) の循環と同じ方法で拒否されます - 完全な循環パスが報告され、DFS ベースの検出が行われ、グラフが非巡回になるまでコード生成は一切行われません。
- `module.json` は完全に任意です - 存在しないモジュールフォルダは、依存関係が宣言されていないものとみなされます。
