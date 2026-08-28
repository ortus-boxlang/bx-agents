---
title: skills/
icon: phosphor-duotone:graduation-cap
summary: "Claude Agent Skills: SKILL.md ごとに 1 つのサブフォルダで、オンデマンドにロードされます。"
description: "Claude Agent Skills: SKILL.md ごとに 1 つのサブフォルダで、オンデマンドにロードされます。"
tags: [conventions, skills]
---

# skills/

`skills/` の直下のサブフォルダのうち、`SKILL.md` ファイルを含むものはそれぞれ 1 つのスキルとなり、Claude Agent Skills のコンベンションに従います: YAML フロントマター (`name`、`description`) の後に、自由形式の指示の本文が続きます。

```
skills/
└── greeting/
    └── SKILL.md
```

```markdown
---
name: greeting
description: How to greet people warmly.
---

Always greet the user warmly and use their name if known.
```

## 命名

スキルの名前は、存在すればフロントマターの `name:` です。そうでなければフォルダ名にフォールバックします (フロントマターに名前がない `greeting/` はどのみち `greeting` として発見されますが、明示的な `name:` は、フォルダ名と異なっていても常に優先されます)。2 つのスキルが同じ名前に解決される場合、重複名エラーで検証に失敗します。

内部に `SKILL.md` を持たないフォルダは、スキルとしてまったく発見されません - 単純に無視されます (スクラッチ用のサブフォルダや、`SKILL.md` を持たずに `skills/` の直下に自分自身が置かれない限り、別の構造でスキルと一緒に保持されるアセットなどに便利です)。

## ランタイムでどう配線されるか

`skills/` は生成されたアプリにそのままコピーされます ([`tools/`](tools.md) と同じ、消去してから書き直す、ドットファイルを除外するコピーです)。生成された `config/ColdBox.bx` は、常に bx-ai 自身の `skillsDirectory` モジュール設定を `/skills` に向けます。

```javascript
moduleSettings = {
	bxai : { skillsDirectory : "/skills" }
}
```

!!! info
    bx-ai 自身のデフォルトの `skillsDirectory` は `/.agents/skills` です - BxAgents の `skills/` コンベンションとは異なるパスです。ジェネレータは常にこれを明示的に上書きするので、あなたのプロジェクトの `skills/` フォルダこそが bx-ai が実際にロードするものになります。これを自分で設定する必要は一切ありません。
