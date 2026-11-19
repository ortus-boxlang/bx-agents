// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { notesSummary } from "../../resources/assets/js/components/memory/MemoryPage.js";
import { talkTo, CONVERSATION_KEY } from "../../resources/assets/js/utils/chat.js";

describe( "memory helpers", () => {
	it( "says how much a set of notes uses", () => {
		expect( notesSummary( { notes: [ {} ], stats: { used: 10, limit: 2000 } } ) ).toBe( "1 note, 10 of 2000 characters (about 3 tokens in every conversation)" );
		expect( notesSummary( { notes: [], stats: { used: 0, limit: 0 } } ) ).toBe( "0 notes, 0 of 0 characters (about 0 tokens in every conversation)" );
	} );
} );

describe( "talking to an agent", () => {
	it( "does not leave the page when the server will not start a conversation", async() => {
		localStorage.setItem( CONVERSATION_KEY, "kept" );
		const api = { post: vi.fn( async() => ( { ok: false, data: null } ) ) };
		expect( await talkTo( api, "/chat", "helper" ) ).toBe( false );
		expect( api.post ).toHaveBeenCalledWith( "/sessions", { agent: "helper" } );
		expect( localStorage.getItem( CONVERSATION_KEY ) ).toBe( "kept" );
	} );
} );
