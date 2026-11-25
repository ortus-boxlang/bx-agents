import { describe, it, expect } from "vitest";
import { blankEmbed, bodyOf, formOf, formProblems, noVisits, normalizeOrigin, originProblem } from "../../resources/assets/js/components/admin/EmbedsPage.js";

describe( "embed origins", () => {
	it( "accepts exactly scheme, host and an optional port", () => {
		for ( const ok of [
			"https://docs.example.com",
			"http://localhost:9100",
			"https://a.b.example.com:8443",
			"http://127.0.0.1:3000"
		] ) {
			expect( originProblem( ok ), ok ).toBe( "" );
		}
	} );

	it( "refuses a wildcard, a path, a query, a user name, a bad scheme and a bad port, and says why", () => {
		expect( originProblem( "https://*.example.com" ) ).toMatch( /wildcard/i );
		expect( originProblem( "https://docs.example.com/page" ) ).toMatch( /no path/i );
		expect( originProblem( "https://docs.example.com/" ) ).toMatch( /no path/i );
		expect( originProblem( "https://docs.example.com?x=1" ) ).toMatch( /no path|query/i );
		expect( originProblem( "https://user@docs.example.com" ) ).toMatch( /user name/i );
		expect( originProblem( "docs.example.com" ) ).toMatch( /http/ );
		expect( originProblem( "ftp://docs.example.com" ) ).toMatch( /http/ );
		expect( originProblem( "https://docs.example.com:99999" ) ).toMatch( /port/i );
		expect( originProblem( "https://exa..mple.com" ) ).not.toBe( "" );
		expect( originProblem( "" ) ).not.toBe( "" );
		expect( originProblem( "null" ) ).not.toBe( "" );
	} );

	it( "keeps an origin as the server does: trimmed and in lower case", () => {
		expect( normalizeOrigin( "  HTTPS://Docs.Example.com " ) ).toBe( "https://docs.example.com" );
	} );
} );

describe( "the embed form", () => {
	/** @returns {object} A form that can be saved */
	function good() {
		const form = blankEmbed();
		form.name = "Docs helper";
		form.limits.allowedOrigins = [ "https://docs.example.com" ];
		return form;
	}

	it( "starts with the server's defaults and cannot be saved until it has a name and a website", () => {
		const form = blankEmbed();
		expect( form.limits ).toMatchObject( { perVisitorPerMinute: 10, dailyMessages: 200, maxMessageChars: 2000 } );
		expect( formProblems( form ).map( p => p.field ) ).toEqual( [
			"name",
			"origins"
		] );
		expect( formProblems( good() ) ).toEqual( [] );
	} );

	it( "requires the three limits, as whole numbers in range", () => {
		const form = good();
		form.limits.perVisitorPerMinute = 0;
		form.limits.dailyMessages = 1.5;
		form.limits.maxMessageChars = "";
		expect( formProblems( form ).map( p => p.field ) ).toEqual( [
			"perVisitorPerMinute",
			"dailyMessages",
			"maxMessageChars"
		] );
		form.limits = { ...form.limits, perVisitorPerMinute: 601, dailyMessages: 1000001, maxMessageChars: 20001 };
		expect( formProblems( form ) ).toHaveLength( 3 );
	} );

	it( "checks the colour, the suggestions and the text lengths", () => {
		const form = good();
		form.look.color = "blue";
		form.look.suggestions = [
			"a",
			"b",
			"c",
			"d"
		];
		form.look.welcome = "x".repeat( 501 );
		expect( formProblems( form ).map( p => p.field ) ).toEqual( [
			"color",
			"suggestions",
			"welcome"
		] );
	} );

	it( "sends only what the server reads, with the limits as numbers and the websites normalised", () => {
		const form = good();
		form.limits.perVisitorPerMinute = "5";
		form.limits.allowedOrigins = [ "HTTPS://Docs.Example.com" ];
		form.look.suggestions = [
			" How? ",
			""
		];
		form.tools = [ "docs_search" ];
		const body = bodyOf( form );
		expect( body.limits ).toEqual( { allowedOrigins: [ "https://docs.example.com" ], perVisitorPerMinute: 5, dailyMessages: 200, maxMessageChars: 2000 } );
		expect( body.look.suggestions ).toEqual( [ "How?" ] );
		expect( body.tools ).toEqual( [ "docs_search" ] );
		expect( Object.keys( body ).sort() ).toEqual( [
			"enabled",
			"limits",
			"look",
			"name",
			"target",
			"tools"
		] );
	} );

	it( "makes a form from an embed without sharing its arrays, so editing does not change the list", () => {
		const embed = { id: "emb_x", name: "A", enabled: true, tools: [ "t" ], look: { suggestions: [ "q" ] }, limits: { allowedOrigins: [ "https://a.example.com" ] } };
		const form = formOf( embed );
		form.tools.push( "u" );
		form.look.suggestions.push( "r" );
		form.limits.allowedOrigins.push( "https://b.example.com" );
		expect( embed.tools ).toEqual( [ "t" ] );
		expect( embed.look.suggestions ).toEqual( [ "q" ] );
		expect( embed.limits.allowedOrigins ).toEqual( [ "https://a.example.com" ] );
		expect( form.limits.perVisitorPerMinute ).toBe( 10 );
	} );
} );

describe( "the counters", () => {
	it( "say there are no visits yet instead of showing zeros as results", () => {
		expect( noVisits( { messages: 0, blockedOrigin: 0, limited: 0 } ) ).toBe( true );
		expect( noVisits( null ) ).toBe( true );
		expect( noVisits( { messages: 1, blockedOrigin: 0, limited: 0 } ) ).toBe( false );
		expect( noVisits( { messages: 0, blockedOrigin: 2, limited: 0 } ) ).toBe( false );
	} );
} );
