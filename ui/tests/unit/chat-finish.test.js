// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { talkChoices, talkBanner } from "../../resources/assets/js/components/chat/ChatPage.js";
import { createBxagents, drawSlots, iconMarkup } from "../../resources/assets/js/utils/extensions.js";
import { createApi, KEY_STORAGE } from "../../resources/assets/js/utils/api.js";
import { password } from "../../resources/assets/js/stores/password.js";

describe( "talking to a sub-agent", () => {
	const tree = [
		{ name: "main", parent: "" },
		{ name: "helper", parent: "main", description: "Helps" }
	];
	it( "offers the main agent as \"\" and each sub-agent by name", () => {
		expect( talkChoices( tree ) ).toEqual( [
			{ value: "", label: "main (main)", title: "" },
			{ value: "helper", label: "helper", title: "Helps" }
		] );
	} );
	it( "says who is talked to, only for a sub-agent", () => {
		expect( talkBanner( "", tree ) ).toBe( "" );
		expect( talkBanner( "helper", tree ) ).toContain( "You are talking to helper directly (a sub-agent of main)" );
	} );
} );

describe( "the extension contract", () => {
	beforeEach( () => {
		document.body.innerHTML = "<span id=\"slotHeader\" hidden></span><div id=\"slotSidebar\" hidden></div>";
	} );

	it( "fills a slot, refuses an unknown place, and tells listeners", () => {
		const api = createBxagents( "/__bxagents", document );
		expect( Object.keys( api ).sort() ).toEqual( [
			"apiBase",
			"conversationId",
			"icon",
			"onRefresh",
			"refresh",
			"runCommand",
			"slot"
		] );
		api.slot( "header" ).textContent = "x";
		expect( document.getElementById( "slotHeader" ).hidden ).toBe( false );
		expect( () => api.slot( "nowhere" ) ).toThrow( /no place/ );
		const heard = vi.fn();
		api.onRefresh( heard );
		api.notify();
		expect( heard ).toHaveBeenCalledOnce();
		expect( api.conversationId() ).toBe( "" );
		api.plug( { conversationId: () => "c1", runCommand: () => "ran", refresh: () => {} } );
		expect( api.conversationId() ).toBe( "c1" );
	} );

	it( "draws server slots as text unless marked html, and keeps what scripts added", () => {
		const api = createBxagents( "/__bxagents", document );
		api.slot( "header" ).textContent = "mine";
		drawSlots( document, [
			{ place: "header", text: "<b>t</b>" },
			{ place: "sidebar", text: "<b>h</b>", html: true }
		] );
		expect( document.getElementById( "slotHeader" ).textContent ).toBe( "mine<b>t</b>" );
		expect( document.querySelector( "#slotSidebar b" ).textContent ).toBe( "h" );
		drawSlots( document, [] );
		expect( document.getElementById( "slotHeader" ).textContent ).toBe( "mine" );
		expect( iconMarkup( "x\"><script>" ) ).toBe( "<svg class=\"i\" aria-hidden=\"true\"><use href=\"#i-xscript\"/></svg>" );
	} );
} );

describe( "the password", () => {
	it( "is sent with every call once kept, and a refusal is reported", async() => {
		localStorage.setItem( KEY_STORAGE, "s3cret" );
		const seen = [];
		const refused = vi.fn();
		const api = createApi( "/api", async( url, init ) => {
			seen.push( init.headers[ "x-bxagents-token" ] );
			return new Response( "{}", { status: 401 } );
		}, refused );
		await api.get( "/agent" );
		expect( seen ).toEqual( [ "s3cret" ] );
		expect( refused ).toHaveBeenCalledWith( 401 );
		localStorage.removeItem( KEY_STORAGE );
	} );

	it( "opens by itself once, and always from the button", () => {
		const store = password();
		store.ask( "refused" );
		expect( store.open ).toBe( true );
		store.open = false;
		store.ask( "refused again" );
		expect( store.open ).toBe( false );
		store.ask();
		expect( store.open ).toBe( true );
	} );
} );
