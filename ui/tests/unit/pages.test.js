import { describe, it, expect } from "vitest";
import { appendLines, atBottom, levelChip, reconnectDelay } from "../../resources/assets/js/components/admin/LogsPage.js";
import { seenText } from "../../resources/assets/js/components/admin/GatewaysPage.js";
import { extensionAdds, serverFacts } from "../../resources/assets/js/components/settings/SettingsPage.js";

describe( "page helpers", () => {
	it( "gives each log level its chip", () => {
		expect( levelChip( { level: "error" } ).kind ).toBe( "bad" );
		expect( levelChip( { level: "warn" } ).kind ).toBe( "warn" );
		expect( levelChip( { level: "info" } ).kind ).toBe( "" );
	} );

	it( "writes when a chat was last seen", () => {
		expect( seenText( Date.UTC( 2026, 10, 18, 9, 30 ) ) ).toBe( "2026-11-18 09:30" );
		expect( seenText( 0 ) ).toBe( "" );
	} );

	it( "says what an extension adds", () => {
		expect( extensionAdds( {
			commands : [
				"a",
				"b"
			],
			slots : [],
			keys  : [ "k" ]
		} ) ).toBe( "commands: a, b; keys: k" );
	} );

	it( "keeps only the server facts that have a value", () => {
		const facts = serverFacts( { name: "ui-dev", model: "m", toolCount: 0, vision: "no" } );
		expect( facts.map( f => f.label ) ).toEqual( [
			"Agent",
			"Model",
			"Tools",
			"Pictures",
			"Sub-agents"
		] );
		expect( facts.find( f => f.label === "Sub-agents" ).value ).toBe( "None" );
	} );
} );

describe( "live logs", () => {
	it( "adds new lines after the shown ones and keeps only the last ones", () => {
		expect( appendLines( [
			1,
			2
		], [ 3 ], 5 ) ).toEqual( [
			1,
			2,
			3
		] );
		expect( appendLines( [
			1,
			2,
			3
		], [
			4,
			5
		], 3 ) ).toEqual( [
			3,
			4,
			5
		] );
		expect( appendLines( [ 1 ], undefined, 3 ) ).toEqual( [ 1 ] );
	} );

	it( "waits longer each time the stream fails, at most 30 seconds", () => {
		expect( reconnectDelay( 0 ) ).toBe( 1000 );
		expect( reconnectDelay( 1 ) ).toBe( 2000 );
		expect( reconnectDelay( 3 ) ).toBe( 8000 );
		expect( reconnectDelay( 10 ) ).toBe( 30000 );
	} );

	it( "keeps the view at the end only when it was there", () => {
		expect( atBottom( { scrollTop: 900, clientHeight: 100, scrollHeight: 1000 } ) ).toBe( true );
		expect( atBottom( { scrollTop: 100, clientHeight: 100, scrollHeight: 1000 } ) ).toBe( false );
		expect( atBottom( undefined ) ).toBe( true );
	} );
} );
