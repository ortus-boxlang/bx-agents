// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { applyFrame, newTurn, settleTurn, argsPreview } from "../../resources/assets/js/utils/turn.js";
import { agentOfRow, transcriptOf } from "../../resources/assets/js/components/chat/ChatPage.js";
import { renderMarkdown } from "../../resources/assets/js/utils/markdown.js";

const delta = d => ( { choices: [ { delta: d } ] } );

describe( "a turn built from the stream", () => {
	it( "joins the words, the reasoning and each tool call's arguments across frames", () => {
		const turn = newTurn();
		applyFrame( turn, delta( { reasoning: "Let me " } ) );
		applyFrame( turn, delta( { reasoning: "check." } ) );
		applyFrame( turn, delta( { tool_calls: [ { index: 0, function: { name: "now", arguments: "{\"tz\":" } } ] } ) );
		applyFrame( turn, delta( { tool_calls: [ { index: 0, function: { arguments: "\"UTC\"}" } } ] } ) );
		applyFrame( turn, delta( { content: "It is " } ) );
		applyFrame( turn, delta( { content: "noon." } ) );
		applyFrame( turn, "[DONE]" );
		settleTurn( turn );
		expect( turn ).toMatchObject( { text: "It is noon.", reasoning: "Let me check.", done: true, pending: false } );
		expect( turn.tools ).toEqual( [ { index: 0, name: "now", args: "{\"tz\":\"UTC\"}", done: true } ] );
	} );

	it( "notes a pause for approval, ignores what it cannot read, and says when nothing came", () => {
		const turn = newTurn();
		applyFrame( turn, { type: "middleware_stop" } );
		applyFrame( turn, "not json" );
		applyFrame( turn, { choices: [] } );
		settleTurn( turn );
		expect( turn.suspended ).toBe( true );
		expect( turn.empty ).toBeUndefined();
		expect( settleTurn( newTurn() ).empty ).toBe( true );
	} );

	it( "keeps a short preview of long arguments", () => {
		expect( argsPreview( "x".repeat( 61 ) ) ).toBe( "x".repeat( 60 ) + "…" );
		expect( argsPreview( "{}" ) ).toBe( "{}" );
	} );
} );

describe( "the transcript", () => {
	it( "keeps what you wrote and the agent's answers, without empty messages", () => {
		const t = transcriptOf( [ { role: "you", body: "hi" }, { role: "agent", body: "hello" }, { role: "agent", body: "" }, { role: "tool", body: "x" } ] );
		expect( t.map( m => m.role ) ).toEqual( [ "you", "agent" ] );
		expect( t[ 1 ].turn ).toMatchObject( { text: "hello", pending: false } );
	} );

	it( "knows a sub-agent's conversation", () => {
		expect( agentOfRow( { agent: "helper" }, "main" ) ).toBe( "helper" );
		expect( agentOfRow( { agent: "main" }, "main" ) ).toBe( "" );
		expect( agentOfRow( {}, "main" ) ).toBe( "" );
	} );
} );

describe( "Markdown of the model", () => {
	it( "shows the model's HTML as text and loads no picture", () => {
		const html = renderMarkdown( "<img src=x onerror=alert(1)> ![p](https://example.com/p.png) **b**" );
		expect( html ).not.toContain( "<img" );
		expect( html ).toContain( "&lt;img" );
		expect( html ).toContain( "<strong>b</strong>" );
	} );

	it( "opens links in a new tab and gives code blocks a language and a Copy button", () => {
		const html = renderMarkdown( "[a](https://example.com)\n\n```js\nlet x = 1\n```" );
		expect( html ).toContain( "target=\"_blank\"" );
		expect( html ).toContain( "rel=\"noopener noreferrer\"" );
		expect( html ).toContain( "class=\"copy-code\"" );
		expect( html ).toContain( "language-js" );
	} );
} );
