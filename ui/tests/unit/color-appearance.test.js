// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { accentForeground, contrastRatio, normalizeHex } from "../../resources/assets/js/utils/color.js";
import { appearance } from "../../resources/assets/js/stores/appearance.js";
import { theme } from "../../resources/assets/js/stores/theme.js";

describe( "color", () => {
	it( "normalizes what a person types", () => {
		expect( normalizeHex( "#3B5BDB" ) ).toBe( "#3b5bdb" );
		expect( normalizeHex( "abc" ) ).toBe( "#aabbcc" );
		expect( normalizeHex( "red" ) ).toBe( "" );
		expect( normalizeHex( "" ) ).toBe( "" );
	} );

	it( "picks the text colour that reads on the accent", () => {
		expect( accentForeground( "#3b5bdb" ) ).toBe( "#ffffff" );
		expect( accentForeground( "#ffe066" ) ).toBe( "#101828" );
		expect( contrastRatio( "#000000", "#ffffff" ) ).toBeCloseTo( 21, 0 );
	} );
} );

describe( "appearance store", () => {
	beforeEach( () => {
		localStorage.clear();
		document.documentElement.removeAttribute( "style" );
		document.documentElement.removeAttribute( "data-density" );
	} );

	it( "reads the current page's format and applies it", () => {
		localStorage.setItem( "bxagents_webui_appearance", JSON.stringify( { accent: "#e03131", size: "large", density: "compact" } ) );
		const store = appearance();
		store.init();
		const root = document.documentElement;
		expect( root.style.getPropertyValue( "--accent" ) ).toBe( "#e03131" );
		expect( root.style.getPropertyValue( "--font-size" ) ).toBe( "1.05rem" );
		expect( root.getAttribute( "data-density" ) ).toBe( "compact" );
	} );

	it( "keeps a change in the same format and ignores what is not a choice", () => {
		const store = appearance();
		store.init();
		store.set( { accent: "nope", size: "huge", density: "compact" } );
		expect( JSON.parse( localStorage.getItem( "bxagents_webui_appearance" ) ) ).toEqual( { accent: "", size: "medium", density: "compact" } );
		store.reset();
		expect( document.documentElement.hasAttribute( "data-density" ) ).toBe( false );
	} );
} );

describe( "theme store", () => {
	it( "keeps the mode as the plain word the current page uses, and tells the server", () => {
		localStorage.clear();
		const posted = [];
		const store = theme( { post: ( path, body ) => posted.push( [ path, body ] ) } );
		store.init();
		store.set( "dark" );
		expect( localStorage.getItem( "bxagents_webui_theme" ) ).toBe( "dark" );
		expect( document.documentElement.getAttribute( "data-theme" ) ).toBe( "dark" );
		store.set( "system" );
		expect( localStorage.getItem( "bxagents_webui_theme" ) ).toBeNull();
		expect( posted ).toEqual( [ [ "/preferences/set", { key: "theme", value: "dark" } ], [ "/preferences/set", { key: "theme", value: "system" } ] ] );
	} );
} );
