import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ICONS, STATE_FILTERS, blankEmbed, filterEmbeds, stateOfEmbed, bodyOf, formOf, formProblems, noVisits, normalizeOrigin, originProblem } from "../../resources/assets/js/components/admin/EmbedsPage.js";

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

describe( "embed icons", () => {
	it( "offers the five built-in names, with the chat bubble as the default", () => {
		expect( ICONS.map( i => i.name ) ).toEqual( [
			"chat",
			"question",
			"sparkle",
			"headset",
			"book"
		] );
		expect( blankEmbed().look.icon ).toBe( "chat" );
	} );

	it( "draws what the widget draws: the same path data as widget.js", () => {
		const widget = readFileSync( new URL( "../../../src/main/bx/models/embed/widget.js", import.meta.url ), "utf8" );
		for ( const icon of ICONS ) {
			expect( widget, icon.name ).toContain( icon.svg );
		}
	} );
} );

describe( "the embeds list filter", () => {
	const now = Date.parse( "2026-11-26T12:00:00Z" );
	const embeds = [
		{ id: "emb_a", name: "Docs helper", enabled: true, limits: { allowedOrigins: [ "https://docs.example.com" ] } },
		{
			id      : "emb_b",
			name    : "Shop chat",
			enabled : false,
			limits  : {
				allowedOrigins : [
					"https://shop.example.com",
					"https://www.shop.example.com"
				]
			}
		},
		{ id: "emb_c", name: "Launch page", enabled: true, expires: "2026-11-01T00:00:00Z", limits: { allowedOrigins: [ "https://launch.example.org" ] } },
		{ id: "emb_d", name: "Old docs", enabled: true, expires: "2027-01-01T00:00:00Z", limits: { allowedOrigins: [ "https://old.example.com" ] } }
	];
	const ids = list => list.map( e => e.id );

	it( "says on, off or expired: expired is on with a date that has passed", () => {
		expect( stateOfEmbed( embeds[ 0 ], now ).id ).toBe( "on" );
		expect( stateOfEmbed( embeds[ 1 ], now ).id ).toBe( "off" );
		expect( stateOfEmbed( embeds[ 2 ], now ).id ).toBe( "expired" );
		expect( stateOfEmbed( embeds[ 3 ], now ).id ).toBe( "on" );
		// an embed that is off stays off, whatever its date says
		expect( stateOfEmbed( { enabled: false, expires: "2026-01-01T00:00:00Z" }, now ).id ).toBe( "off" );
		expect( STATE_FILTERS.map( f => f.id ) ).toEqual( [
			"all",
			"on",
			"off",
			"expired"
		] );
	} );

	it( "shows every embed, in its own order, with no search and no state", () => {
		expect( ids( filterEmbeds( embeds, "", "all", now ) ) ).toEqual( [
			"emb_a",
			"emb_b",
			"emb_c",
			"emb_d"
		] );
		expect( ids( filterEmbeds( embeds, "   ", undefined, now ) ) ).toHaveLength( 4 );
	} );

	it( "narrows by state", () => {
		expect( ids( filterEmbeds( embeds, "", "on", now ) ) ).toEqual( [
			"emb_a",
			"emb_d"
		] );
		expect( ids( filterEmbeds( embeds, "", "off", now ) ) ).toEqual( [ "emb_b" ] );
		expect( ids( filterEmbeds( embeds, "", "expired", now ) ) ).toEqual( [ "emb_c" ] );
	} );

	it( "searches the name and the websites, any case, every word having to match", () => {
		expect( ids( filterEmbeds( embeds, "DOCS", "all", now ) ) ).toEqual( [
			"emb_a",
			"emb_d"
		] );
		expect( ids( filterEmbeds( embeds, "shop.example", "all", now ) ) ).toEqual( [ "emb_b" ] );
		expect( ids( filterEmbeds( embeds, "docs old", "all", now ) ) ).toEqual( [ "emb_d" ] );
		expect( ids( filterEmbeds( embeds, "nothing like it", "all", now ) ) ).toEqual( [] );
	} );

	it( "puts a search and a state together", () => {
		expect( ids( filterEmbeds( embeds, "docs", "on", now ) ) ).toEqual( [
			"emb_a",
			"emb_d"
		] );
		expect( ids( filterEmbeds( embeds, "shop", "on", now ) ) ).toEqual( [] );
	} );

	it( "copes with an embed that has no websites listed", () => {
		expect( ids( filterEmbeds( [ { id: "x", name: "Bare", enabled: true } ], "bare", "all", now ) ) ).toEqual( [ "x" ] );
	} );
} );
