---
title: schedules/
icon: phosphor-duotone:clock-countdown
summary: 実際に手書きされた ColdBox スケジューラを、そのまま通過させます。
description: 実際に手書きされた ColdBox スケジューラを、そのまま通過させます。
tags: [conventions, scheduling]
---

# schedules/

`schedules/Scheduler.bx` は - 存在する場合 - **実際に手書きされた ColdBox スケジューラクラス**で、そのまま (生成も変換もされない、単なるファイルコピーとして `config/Scheduler.bx` へ) ビルドに通されます。

```javascript
// schedules/Scheduler.bx
class extends="coldbox.system.web.tasks.ColdBoxScheduler" {

	function configure() {
		task( "nightly" )
			.call( () => getInstance( "SupportBot" ).run( "cleanup" ) )
			.everyDayAt( "00:00" )
			.withNoOverlaps()
	}

}
```

このファイルの本体には、BX Agents 固有のものは何もありません - `.cron( "0 9 * * 1-5" )`、`.everyWeekOn()`、`.startOn()`/`.endOn()`/`.between()`、`.when()`、`.withNoOverlaps()`、`before()`/`after()`/`onSuccess()`/`onFailure()` フック、タイムゾーンなど、まるごと ColdBox 自身のスケジューラ DSL です - ColdBox の `ScheduledTask` がサポートするものなら何でも、このプロジェクトは一切制限も再解釈もしません。(このコンベンションの以前のバージョンは `{ cron, action }` というデータ形状を ColdBox の頻度メソッド DSL に変換するものでしたが、その変換は cron のごく一部しかカバーしておらず、実際のスケジューラ API が提供するそれ以外のすべてを捨ててしまうものだったため、廃止されました。古いプロジェクトを移行する場合は下記を参照してください。)

## エージェントを取得する

プロジェクトのツリー内のすべてのエージェント - ルートプロジェクト自身の `Agent.bx` と、どれだけ深くネストされていても、すべての `subagents/*` エントリ - は、生成された `config/WireBox.bx` に、自身の宣言された `name` (`Agent.bx` が `super.init()` で設定した `name`、または `configure()` によってそれを上書きして宣言された `name`) の下で登録されます。スケジュールは、単純な `getInstance( "TheAgentName" )` によって、望むどのエージェントにも到達できます - BX Agents 固有の検索はまったくなく、他の ColdBox アプリのどこにでもある `getInstance()` 呼び出しとまったく同じです。

```javascript
// subagents/researcher/Agent.bx
class extends="bxModules.bxai.models.runnables.AiAgent" {

	function init() {
		super.init(
			name  : "ResearchBot",
			model : aiModel( provider: "openai", params: { model: "gpt-5" } )
		)
		return this
	}

}
```

```javascript
// schedules/Scheduler.bx
task( "weekly-digest" )
	.call( () => getInstance( "ResearchBot" ).run( "summarize this week's findings" ) )
	.everyWeekOn( 1, "08:00" )
```

`name` は今や WireBox のバインディングキーでもあるため、**プロジェクト全体で一意**である必要があります - 2 つのエージェント (ルートまたはどんな深さのサブエージェントでも) が同じ名前を共有していると (どちらも未設定のままサイレントに `"BxAi"` にデフォルトになるケースも含め) `build` は検証に失敗します。サブエージェントのフォルダ名 (`subAgents: [...]` を配線するのに使われます) と、その自身の宣言された `name` (ここで使われます) の違いについては、[subagents/](subagents.md#retrieving-an-agent-from-schedulesschedulerbx) を参照してください。

## 検証

- `build` は正確に 1 つのファイルだけを探します: `schedules/Scheduler.bx`。それ以外の `schedules/` にあるもの (このコンベンションが変更される前の古い `{ cron, action }` ファイルも含む) はすべて無視されます - `schedules/` が存在するのに `Scheduler.bx` がない場合、`build` は警告を出します。そのため、サイレントに動かなくなったスケジュールでも、少なくとも目に見えるようになっています。
- それを除けば、`schedules/Scheduler.bx` は実際のコードです - 他のあらゆる BoxLang クラスと同じ「実際に ColdBox を起動しない限り、意味のある検証はできない」領域です。構文エラーや不正な `getInstance()` の名前は、`build` の検証時ではなく、生成されたアプリが実際に起動した際 (`serve`) に表面化します。

## 古い `{ cron, action }` コンベンションからの移行

以前は、`schedules/` の下の各ファイルはそれぞれ独自の `{ cron: "0 0 * * *", action: "cleanup" }` エントリで、単一のルート `"GeneratedAgent"` バインディングに対する ColdBox の頻度メソッド呼び出しに変換されていました。移行するには: それらのファイルを削除し、`coldbox.system.web.tasks.ColdBoxScheduler` を extends する `schedules/Scheduler.bx` を 1 つ追加し、古いエントリごとに、古い cron 式に一致する実際の ColdBox の頻度メソッドか `.cron()` 呼び出しを添えて `task( name ).call( () => getInstance( "TheAgentName" ).run( "action text" ) )` を追加してください。
