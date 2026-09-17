---
title: マニフェスト
icon: phosphor-duotone:clipboard-text
summary: 生成されたアプリに何が組み込まれたかを、すべてのビルドが記録する内容。
description: 生成されたアプリに何が組み込まれたかを、すべてのビルドが記録する内容。
tags: [reference, build]
---

# マニフェスト

すべての `build` は `.build/manifest.json` を書き込みます - これは、生成されたアプリに実際に何が組み込まれたかについての、BxAgents 自身の記録です。`bxAgents inspect` は再ビルドせずにこれを整形して表示します。`bxAgents package` は**機密情報を除去した**バージョンを `.bxa` と一緒にコピーします ([デプロイとシークレット](deployment-and-secrets.md) 参照)。

## スキーマ

```json
{
	"manifestVersion": "1.0.0",
	"generator": { "name": "bx-agents", "version": "dev" },
	"agent": {
		"name": "my-agent",
		"description": "",
		"model": "openai/gpt-5",
		"environment": "development"
	},
	"files": [
		{ "category": "tools", "name": "Greeter", "path": "tools/Greeter.bx", "hash": "..." }
	]
}
```

| フィールド | 意味 |
|---|---|
| `manifestVersion` | マニフェストスキーマ自体の Semver スタンプ (現在は `1.0.0`) - これが未設定または不正な形式の場合、`package` は実行を拒否します。 |
| `generator.name` / `generator.version` | 常に `"bx-agents"` / このビルドを生成した BxAgents モジュールのバージョンです。 |
| `agent` | 安全で構造的なフィールド (`name`、`description`、`model`、`environment`) のみです - シークレットは**決して**含まれません。シークレットはそもそもマニフェストに読み込まれることがなく、実行時に bx-ai 自身によってライブに解決されます。 |
| `files` | 発見されたコンベンションフォルダ内の項目ごとに 1 エントリで、決定的な順序のために category、続いて path でソートされています - ファイルシステムの列挙順序には依存しません。 |

## コンテンツハッシュ

各 `files[]` エントリの `hash` は、その内容の SHA-256 です。

- **ファイル**: 内容のハッシュです。ただし最初に改行コードが正規化されます (同じ内容の CRLF と LF のチェックアウトは同一のハッシュになります)。
- **ディレクトリ** (スキルフォルダ、サブエージェントフォルダ、モジュールフォルダ): 含まれるすべてのファイル自身の `relativePath:contentHash` を再帰的に、決定性のためにソートしてハッシュ化したものです - つまり内部の任意の 1 ファイルの名前変更や編集は、そのフォルダ全体のハッシュを変化させます。

これにより、変更のないプロジェクトを再ビルドすると**同一の**マニフェストが生成されることが保証されます - 同じカテゴリ、同じ順序、同じハッシュが毎回得られます - そしてまさにこの理由で、あるツールファイルの内容を変更すると、そのエントリのハッシュだけが変化し、他は一切変化しません。

## 互換性ポリシー

`manifestVersion` が存在するのは、このスキーマへの将来の破壊的変更を、`manifest.json` を読み取るあらゆるもの (デプロイターゲット、将来の `inspect` のバージョン、外部ツール) が検知できるようにするためです - 認識できないメジャーバージョンに遭遇したツールは、フィールドの形状を勝手に推測してサイレントに誤読するのではなく、明確に失敗を報告すべきです。
