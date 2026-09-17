---
title: interceptors/
icon: phosphor-duotone:funnel
summary: クラス自身の @scope 注釈でスコープ付けされた、ColdBox のライフサイクルインターセプター。
description: クラス自身の @scope 注釈でスコープ付けされた、ColdBox のライフサイクルインターセプター。
tags: [conventions, interceptors]
---

# interceptors/

`interceptors/*.bx` は ColdBox のインターセプター (`preProcess`、`postProcess` などのライフサイクルフッククラス) で、クラス自身の `@scope` 注釈でスコープ付けされます。

```javascript
// interceptors/AuditLogger.bx
/**
 * @scope agent
 */
class {

	function preProcess( event, interceptData ) {
		// ...
	}

}
```

## `agent` スコープ と `runtime` スコープ

| スコープ | 効果 |
|---|---|
| `agent` (デフォルト) | 生成されたアプリ自身の `interceptors/` フォルダにコピーされ、生成された `config/ColdBox.bx` の `interceptors` リストに登録されます - このアプリにのみ影響します。 |
| `runtime` | (生成されたアプリの中にではなく) 別途コピーされ、BoxLang モジュール自身がインターセプターを登録するのと同じ方法で登録されます - このアプリだけでなく、BoxLang ランタイム全体に影響します。 |

`@scope` 注釈をまったく持たないインターセプターはデフォルトで `agent` になります - `runtime` スコープはこの 1 つのアプリを超えた影響を持つため、より狭く安全なデフォルトです。

`agent` でも `runtime` でもない `@scope` の値 (大文字小文字は区別しません) は、明確なエラーとともにビルドを失敗させます - タイプミスされたスコープに対するサイレントなフォールバックはありません。

## 生成される配線

`agent` スコープのインターセプターについては、生成された `config/ColdBox.bx` にインターセプターごとに 1 エントリが得られます。

```javascript
interceptors = [
	{ class : "interceptors.AuditLogger" }
]
```

すべての agent スコープインターセプターを、決定的にそれぞれちょうど 1 回だけ参照します。
