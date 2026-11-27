import { describe, it, expect } from "vitest";
import { webAddress, connectorChips, connectorWho, connectorActions, connectorRows, connectorGroups } from "../../resources/assets/js/components/connectors/ConnectorsPage.js";

describe( "connector helpers", () => {
	it( "only ever opens a web address", () => {
		expect( webAddress( "https://a.example/authorize" ) ).toBe( "https://a.example/authorize" );
		expect( webAddress( "javascript:alert(1)" ) ).toBe( "" );
		expect( webAddress( "" ) ).toBe( "" );
	} );

	it( "shows the risk and the ways to connect, or that it is a local program", () => {
		expect( connectorChips( {
			risk : "high",
			ways : [
				"bearer",
				"oauth",
				"other"
			]
		} ).map( c => c.text ) ).toEqual( [
			"High risk",
			"Token",
			"Sign in"
		] );
		expect( connectorChips( { transport: "stdio", ways: [ "bearer" ] } ).map( c => c.text ) ).toEqual( [ "Local program" ] );
	} );

	it( "says who connected it, or what is wrong", () => {
		const summary = { byConnector: { gh: 1 } };
		expect( connectorWho( { id: "gh", connectedWith: "token" }, summary, false ) ).toBe( "You connected with your own token · 1 tool on" );
		expect( connectorWho( { id: "x", state: "needs_attention" }, summary, false ) ).toBe( "This connection needs your attention." );
		expect( connectorWho( { id: "git", transport: "stdio" }, summary, false ) ).toContain( "An admin switches it on" );
	} );

	it( "lets only an admin switch a local program on or off", () => {
		const program = { transport: "stdio", state: "available" };
		expect( connectorActions( program, false ) ).toEqual( { install: false, connect: "", tools: false, disconnect: "" } );
		expect( connectorActions( program, true ).connect ).toBe( "Switch on" );
		expect( connectorActions( { state: "needs_attention" }, false ) ).toEqual( { install: false, connect: "Reconnect", tools: false, disconnect: "Disconnect" } );
		expect( connectorActions( { state: "needs_program", docs: "https://x" }, true ).install ).toBe( true );
	} );

	it( "filters by tab and search", () => {
		const rows = [
			{ name: "GitHub", state: "connected" },
			{ name: "Linear", summary: "issues", state: "available" }
		];
		expect( connectorRows( rows, "connected", "" ).map( r => r.name ) ).toEqual( [ "GitHub" ] );
		expect( connectorRows( rows, "all", "ISSUES" ).map( r => r.name ) ).toEqual( [ "Linear" ] );
	} );

	it( "groups the connectors by category in the server's order, and keeps the ones with none under Other", () => {
		const rows = [
			{ id: "slack", category: "Productivity" },
			{ id: "git", category: "Developer" },
			{ id: "github", category: "Developer" },
			{ id: "odd" }
		];
		const groups = connectorGroups( rows, [
			"Developer",
			"Productivity",
			"Finance"
		] );
		expect( groups.map( g => g.category ) ).toEqual( [
			"Developer",
			"Productivity",
			"Other"
		] );
		expect( groups[ 0 ].rows.map( r => r.id ) ).toEqual( [
			"git",
			"github"
		] );
		expect( connectorGroups( rows, undefined ).map( g => g.category ) ).toEqual( [ "Other" ] );
		expect( connectorGroups( [], [ "Developer" ] ) ).toEqual( [] );
	} );


	it( "lets a person switch a public server on for themselves, and shows a sign in that waits for an admin's app", () => {
		const open = { transport: "http", ways: [ "none" ], state: "available" };
		expect( connectorChips( { risk: "low", ways: [ "none" ] } ).map( c => c.text ) ).toEqual( [
			"Low risk",
			"No sign in"
		] );
		expect( connectorActions( open, false ).connect ).toBe( "Switch on" );
		expect( connectorActions( { ...open, state: "connected" }, false ).disconnect ).toBe( "Switch off" );
		expect( connectorWho( { id: "x", connectedWith: "open" }, {}, false ) ).toBe( "You switched it on" );

		const waiting = { transport: "http", ways: [], needsApp: true, appHelp: "Register an app.", state: "available" };
		expect( connectorActions( waiting, false ).connect ).toBe( "" );
		expect( connectorWho( waiting, {}, false ) ).toContain( "An admin has to set up an app" );
		expect( connectorWho( waiting, {}, false ) ).toContain( "Register an app." );
	} );

} );
