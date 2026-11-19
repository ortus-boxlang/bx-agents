import { describe, it, expect } from "vitest";
import { classifyFile, clipText, withTextFiles, base64Of, MAX_TEXT_CHARS } from "../../resources/assets/js/utils/attachments.js";
import { approx, windowText, contextLevel, contextSummary, ringDash } from "../../resources/assets/js/utils/context.js";
import { vaultRequestOf, vaultAskUrl } from "../../resources/assets/js/utils/vault-request.js";
import { replyEffects, slashMatches } from "../../resources/assets/js/utils/reply.js";

describe( "attachments", () => {
	const room = { images: 0, seesImages: true };
	it( "takes pictures and text files and says why another cannot go", () => {
		expect( classifyFile( { name: "a.png", type: "image/png", size: 10 }, room ).kind ).toBe( "image" );
		expect( classifyFile( { name: "a.bx", type: "", size: 10 }, room ).kind ).toBe( "text" );
		expect( classifyFile( { name: "a.png", type: "image/png", size: 10 }, { images: 0, seesImages: false } ).problem ).toBe( "The model in use cannot see pictures." );
		expect( classifyFile( { name: "a.png", type: "image/png", size: 10 }, { images: 4, seesImages: true } ).problem ).toContain( "At most 4" );
		expect( classifyFile( { name: "big.jpg", type: "image/jpeg", size: 6e6 }, room ).problem ).toBe( "big.jpg is larger than 5 MB." );
		expect( classifyFile( { name: "x.exe", type: "application/octet-stream", size: 1 }, room ).problem ).toContain( "not a picture or a text file" );
	} );

	it( "puts text files inside the message and cuts a long one", () => {
		expect( withTextFiles( "hi", [ { name: "n.md", content: "x" } ] ) ).toBe( "hi\n\nAttached, the contents of the file `n.md`:\n```\nx\n```" );
		expect( clipText( "y".repeat( MAX_TEXT_CHARS + 5 ) ) ).toContain( "(the file was cut at " );
		expect( base64Of( "data:image/png;base64,AAAA" ) ).toBe( "AAAA" );
	} );
} );

describe( "context gauge", () => {
	it( "says how much of the window is used and how full the ring is", () => {
		expect( approx( 850 ) ).toBe( "~850" );
		expect( approx( 12300 ) ).toBe( "~12.3k" );
		expect( windowText( 128000 ) ).toBe( "128k" );
		expect( windowText( 1000000 ) ).toBe( "1M" );
		expect( contextLevel( { contextWindow: 100, percent: 91 } ) ).toBe( "danger" );
		expect( contextLevel( { contextWindow: 0, percent: 0 } ) ).toBe( "unknown" );
		expect( contextSummary( { total: 1200, contextWindow: 128000, percent: 1 } ) ).toBe( "~1.2k of 128k tokens (1%)" );
		expect( ringDash( { contextWindow: 100, percent: 0 } ) ).toBe( "2 100" );
	} );
} );

describe( "vault request", () => {
	it( "reads the secret asked for, and ignores a name that is not one", () => {
		expect( vaultRequestOf( [ { name: "vault_request", args: "{\"name\":\"GH_TOKEN\",\"scope\":\"agent\"}" } ] ) ).toEqual( { name: "GH_TOKEN", why: "", scope: "agent" } );
		expect( vaultRequestOf( [ { name: "vault_request", args: "{\"name\":\"bad name\"}" } ] ) ).toBeNull();
		expect( vaultRequestOf( [ { name: "vault_request", args: "{\"na" } ] ) ).toBeNull();
		expect( vaultAskUrl( "/chat", { name: "A", scope: "user", why: "x y" } ) ).toBe( "/chat/vault?ask=A&scope=user&why=x+y" );
	} );
} );

describe( "replies and the / menu", () => {
	it( "opens another conversation or reloads this one", () => {
		expect( replyEffects( { effects: [ { type: "conversation", id: "b" } ] }, "a" ) ).toEqual( { open: "b", reload: false } );
		expect( replyEffects( { effects: [ { type: "conversation", id: "a" }, { type: "reset" } ] }, "a" ) ).toEqual( { open: "", reload: true } );
		expect( replyEffects( {}, "a" ) ).toEqual( { open: "", reload: false } );
	} );

	it( "matches commands only while a name is typed", () => {
		const commands = [ { name: "/help" }, { name: "/new" } ];
		expect( slashMatches( commands, "/h" ).map( c => c.name ) ).toEqual( [ "/help" ] );
		expect( slashMatches( commands, "/help me" ) ).toEqual( [] );
		expect( slashMatches( commands, "hi" ) ).toEqual( [] );
	} );
} );
