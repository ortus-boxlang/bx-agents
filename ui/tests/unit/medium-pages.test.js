// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { groupTools, fromConnector } from "../../resources/assets/js/components/registry/RegistryPage.js";
import { sessionsPath, sourceName, facetChips } from "../../resources/assets/js/components/conversations/ConversationsPage.js";
import { listOf, keepInAddress } from "../../resources/assets/js/utils/address.js";
import { markdownName } from "../../resources/assets/js/utils/download.js";
import { confirm } from "../../resources/assets/js/stores/confirm.js";

describe( "registry helpers", () => {
	it( "groups tools by their first word, other last, and filters by a search", () => {
		const tools = [ { name: "now" }, { name: "note_remember", description: "Keep a note" }, { name: "note_recall" }, { name: "vault_list" } ];
		expect( groupTools( tools, "" ).map( g => g.key ) ).toEqual( [ "note", "vault", "other" ] );
		expect( groupTools( tools, "keep" ).map( g => g.tools.map( t => t.name ) ) ).toEqual( [ [ "note_remember" ] ] );
	} );

	it( "knows a connector's tool by its id and two underscores", () => {
		expect( fromConnector( "github__list_issues", [ "github" ] ) ).toBe( true );
		expect( fromConnector( "note_remember", [ "github" ] ) ).toBe( false );
	} );
} );

describe( "conversations helpers", () => {
	it( "asks for only the filters that are set", () => {
		const base = { q: "", source: null, agent: "", since: "", before: "", all: false, limit: 25, offset: 0 };
		expect( sessionsPath( base ) ).toBe( "/sessions?limit=25&offset=0&facets=1" );
		expect( sessionsPath( { ...base, q: "a b", source: "", all: true } ) ).toBe( "/sessions?limit=25&offset=0&facets=1&q=a%20b&source=&all=1" );
	} );

	it( "names sources and turns facets into chips", () => {
		expect( sourceName( "" ) ).toBe( "Web page" );
		expect( sourceName( "slack" ) ).toBe( "slack" );
		expect( facetChips( { main: 2 } ) ).toEqual( [ { name: "main", count: 2 } ] );
	} );
} );

describe( "small helpers", () => {
	it( "splits a typed list", () => {
		expect( listOf( " a.com, ,b.com " ) ).toEqual( [ "a.com", "b.com" ] );
	} );

	it( "keeps state in the address without empty values", () => {
		keepInAddress( "/chat/conversations", { q: "x", agent: "", source: null } );
		expect( location.pathname + location.search ).toBe( "/chat/conversations?q=x" );
	} );

	it( "makes a file name from a title", () => {
		expect( markdownName( "Plan: the launch!" ) ).toBe( "Plan-the-launch-.md" );
		expect( markdownName( "" ) ).toBe( "conversation.md" );
	} );
} );

describe( "question dialog store", () => {
	it( "answers $confirm with true or false and $prompt with the text or null", async () => {
		const store = confirm();
		const yes = store.ask( { title: "Sure?" } );
		store.answer( true );
		expect( await yes ).toBe( true );
		const typed = store.prompt( { title: "Name", value: "old" } );
		store.value = "new";
		store.answer( true );
		expect( await typed ).toBe( "new" );
		const cancelled = store.prompt( { title: "Name" } );
		store.answer( false );
		expect( await cancelled ).toBeNull();
	} );
} );
