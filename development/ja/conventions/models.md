---
title: models/
icon: phosphor-duotone:brain
summary: 再利用可能な、名前付きモデル設定。Agent.bx から名前で参照します。
description: 再利用可能な、名前付きモデル設定。Agent.bx から名前で参照します。
tags: [conventions, models]
---

# models/

`models/` を使うと、再利用可能な名前付きモデル設定を、1 つの `.bx` または `.json` ファイルとして定義でき、`Agent.bx` の `model` フィールドから名前で参照できます (`/` を含まないので、`provider/model` スラッグと誤認されることはありません)。

```javascript
// models/summarizer.bx
class {

	function configure() {
		return {
			provider : "openai",
			model    : "gpt-5-mini"
		};
	}

}
```

```javascript
// Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init( name: "my-agent", model: aiModel( provider: "openai", params: { model: "gpt-5-mini" } ) )
		return this
	}

	// Overrides the class's own model above - resolves against models/summarizer.bx
	function configure() {
		return {
			model : "summarizer"
		};
	}

}
```

## 発見のルール

- `models/` の直下にあるトップレベルの `.bx` または `.json` ファイルごとに 1 エントリです (再帰的ではありません)。
- エントリ名はファイルのベース名です (`summarizer.bx` → `summarizer`)。
- ドットファイルと、認識されない拡張子のファイル (自分用のメモとしてフォルダに残された `README.md` など) は無視されます。
- 2 つのファイルが同じ名前に解決される場合、重複名エラーで検証に失敗します。

## 検証

`Agent.bx` の `model` に `/` が含まれない場合、既知のコアプロバイダー名 ([Agent.bx](agent-bx.md#the-model-slug) 参照) **か**、`models/` エントリの名前の**いずれか**に一致する必要があります - それ以外は「no provider and does not match any models/ entry」という明確なエラーで検証に失敗します。
