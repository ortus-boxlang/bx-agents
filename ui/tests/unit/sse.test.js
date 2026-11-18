import { describe, it, expect } from "vitest";
import { parseFrames, streamEvents } from "../../resources/assets/js/utils/sse.js";

/**
 * @param {string[]} parts The chunks the server sends
 * @returns {Function} A fetch that answers them as a stream
 */
function streamingFetch( parts ) {
	return async () => new Response( new ReadableStream( {
		start( controller ) {
			parts.forEach( p => controller.enqueue( new TextEncoder().encode( p ) ) );
			controller.close();
		}
	} ), { status: 200 } );
}

describe( "sse", () => {
	it( "reads named events, multi-line data and skips keep-alives", () => {
		const { events, rest } = parseFrames( ":hi\n\nevent: thread\ndata: {\"a\":1}\n\nevent: chunk\ndata: one\ndata: two\n\nevent: do" );
		expect( events ).toEqual( [ { event: "thread", data: "{\"a\":1}" }, { event: "chunk", data: "one\ntwo" } ] );
		expect( rest ).toBe( "event: do" );
	} );

	it( "joins an event split across chunks and parses JSON data", async () => {
		const seen = [];
		const done = await streamEvents( "/x", {
			body     : { input: "hi" },
			fetchImpl: streamingFetch( [ "event: chunk\nda", "ta: {\"text\":\"he\"}\n\nevent: done\n", "data: [DONE]\n\n" ] ),
			onEvent  : ( name, data ) => seen.push( [ name, data ] )
		} );
		expect( done.ok ).toBe( true );
		expect( seen ).toEqual( [ [ "chunk", { text: "he" } ], [ "done", "[DONE]" ] ] );
	} );

	it( "answers the server's error instead of throwing", async () => {
		const done = await streamEvents( "/x", {
			fetchImpl: async () => new Response( JSON.stringify( { error: "Not allowed" } ), { status: 403 } ),
			onEvent  : () => {}
		} );
		expect( done ).toEqual( { ok: false, status: 403, error: "Not allowed" } );
	} );
} );
