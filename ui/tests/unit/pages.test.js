import { describe, it, expect } from "vitest";
import { levelChip } from "../../resources/assets/js/components/admin/LogsPage.js";
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
		expect( extensionAdds( { commands: [ "a", "b" ], slots: [], keys: [ "k" ] } ) ).toBe( "commands: a, b; keys: k" );
	} );

	it( "keeps only the server facts that have a value", () => {
		const facts = serverFacts( { name: "ui-dev", model: "m", toolCount: 0, vision: "no" } );
		expect( facts.map( f => f.label ) ).toEqual( [ "Agent", "Model", "Tools", "Pictures", "Sub-agents" ] );
		expect( facts.find( f => f.label === "Sub-agents" ).value ).toBe( "None" );
	} );
} );
