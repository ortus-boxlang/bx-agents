import { describe, it, expect } from "vitest";
import { createApi } from "../../resources/assets/js/utils/api.js";

describe( "api", () => {
	it( "sends the page's headers and answers { ok, status, data, error }", async () => {
		let sent;
		const api = createApi( "/__bxagents", async ( url, init ) => {
			sent = { url, init };
			return new Response( JSON.stringify( { success: true, items: [ 1 ] } ), { status: 200 } );
		} );
		const res = await api.post( "/notes", { text: "x" } );
		expect( sent.url ).toBe( "/__bxagents/notes" );
		expect( sent.init.headers[ "x-bxagents-csrf" ] ).toBe( "1" );
		expect( JSON.parse( sent.init.body ) ).toEqual( { text: "x" } );
		expect( res ).toEqual( { ok: true, status: 200, data: { success: true, items: [ 1 ] }, error: "" } );
	} );

	it( "turns a refusal and a dead server into an error, never a throw", async () => {
		const refused = createApi( "", async () => new Response( JSON.stringify( { success: false, error: "No such note" } ), { status: 404 } ) );
		expect( ( await refused.get( "/notes/9" ) ).error ).toBe( "No such note" );
		const dead = createApi( "", async () => {
			throw new TypeError( "fetch failed" );
		} );
		expect( await dead.get( "/x" ) ).toEqual( { ok: false, status: 0, data: null, error: "The server could not be reached." } );
	} );
} );
