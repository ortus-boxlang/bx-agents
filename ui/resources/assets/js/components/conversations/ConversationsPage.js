import { keepInAddress } from "../../utils/address.js";
import { downloadFile, markdownName } from "../../utils/download.js";
import { openInChat } from "../../utils/chat.js";

/**
 * The Conversations page: every conversation the person may see, paged and filtered by the server (GET /sessions takes
 * limit, offset, q, source, agent, since, before and all; with facets=1 it answers the counts per source and agent), and
 * open, rename, fork, export and delete (one or many). Filters start from the address (data-q, data-source, data-agent).
 * Open and New chat go to the chat (utils/chat.js).
 */

/**
 * @param {object} state The filters and the page
 * @returns {string} The GET /sessions path for them
 */
export function sessionsPath( state ) {
	return "/sessions?limit=" + state.limit + "&offset=" + state.offset + "&facets=1"
		+ ( state.q ? "&q=" + encodeURIComponent( state.q ) : "" )
		+ ( state.source !== null ? "&source=" + encodeURIComponent( state.source ) : "" )
		+ ( state.agent ? "&agent=" + encodeURIComponent( state.agent ) : "" )
		+ ( state.since ? "&since=" + encodeURIComponent( state.since ) : "" )
		+ ( state.before ? "&before=" + encodeURIComponent( state.before ) : "" )
		+ ( state.all ? "&all=1" : "" );
}

/**
 * @param {string} value A conversation's source
 * @returns {string} How to show it
 */
export function sourceName( value ) {
	return value === "" || value === "web" ? "Web page" : value;
}

/**
 * @param {Object<string, number>} [counts] Counts per name, as the facets answer them
 * @returns {Array<{ name: string, count: number }>} One chip per name
 */
export function facetChips( counts ) {
	return Object.keys( counts || {} ).map( name => ( { name, count: counts[ name ] } ) );
}

/**
 * @returns {object} Alpine component state and actions
 */
export function conversationsPage() {
	return {
		/** @type {{ q: string, source: string|null, agent: string, since: string, before: string, all: boolean, limit: number, offset: number }} */
		state    : { q: "", source: null, agent: "", since: "", before: "", all: false, limit: 25, offset: 0 },
		/** @type {boolean} True when the person is an admin (may see everyone's) */
		admin    : false,
		/** @type {boolean} True until the list answered */
		loading  : true,
		/** @type {string} Why the list could not be read */
		failed   : "",
		/** @type {Array<object>} The conversations of this page */
		rows     : [],
		/** @type {number} How many match in all */
		total    : 0,
		/** @type {{ agent?: Object<string, number>, source?: Object<string, number> }} Counts per agent and source */
		facets   : {},
		/** @type {string[]} The ids selected */
		selected : [],

		/** @returns {Array<{ name: string, count: number }>} The agents and their counts, when choosing one helps */
		get agentChips() {
			const agents = facetChips( this.facets.agent );
			return agents.length > 1 || this.state.agent ? agents : [];
		},

		/** @returns {Array<{ name: string, count: number }>} The sources and their counts, when choosing one helps */
		get sourceChips() {
			const sources = facetChips( this.facets.source );
			return sources.length > 1 || this.state.source !== null ? sources : [];
		},

		/** @returns {boolean} True when a filter is set */
		get filtered() {
			const s = this.state;
			return !!( s.q || s.source !== null || s.agent || s.since || s.before );
		},

		/** @returns {boolean} True when every row of this page is selected */
		get allSelected() {
			return this.rows.length > 0 && this.rows.every( r => this.selected.includes( r.id ) );
		},

		/** @returns {string} "Showing 1 to 25 of 80" */
		get showing() {
			return "Showing " + ( this.state.offset + 1 ) + " to " + ( this.state.offset + this.rows.length ) + " of " + this.total;
		},

		/** Reads the filters from the address and loads. */
		async init() {
			const data = this.$el.dataset;
			this.state.q = data.q || "";
			this.state.agent = data.agent || "";
			this.state.source = data.hasSource === "true" ? data.source || "" : null;
			await this.$store.session.loaded();
			this.admin = this.$store.session.can( "admin" );
			this.$watch( "state.q", () => this.refilter() );
			this.$watch( "state.since", () => this.refilter() );
			this.$watch( "state.before", () => this.refilter() );
			this.$watch( "state.limit", () => this.refilter() );
			this.$watch( "state.all", () => {
				this.selected = [];
				this.refilter();
			} );
			this.load();
		},

		/** Back to the first page after a filter changed, and the filters in the address. */
		refilter() {
			this.state.offset = 0;
			keepInAddress( this.$store.session.config.basePath + "/conversations", {
				q      : this.state.q,
				agent  : this.state.agent,
				source : this.state.source
			} );
			this.load();
		},

		/** Reads the page of conversations. */
		async load() {
			const result = await this.$api.get( sessionsPath( this.state ) );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = "Could not load the conversations.";
				return;
			}
			this.failed = "";
			const rows = result.data.sessions || [];
			// a page past the end (its last row was deleted): step back
			if ( !rows.length && this.state.offset > 0 ) {
				this.state.offset = Math.max( 0, this.state.offset - this.state.limit );
				return this.load();
			}
			this.rows = rows;
			this.total = typeof result.data.total === "number" ? result.data.total : rows.length;
			this.facets = result.data.facets || {};
		},

		/**
		 * @param {string} name An agent, or "" for any
		 */
		pickAgent( name ) {
			this.state.agent = this.state.agent === name ? "" : name;
			this.refilter();
		},

		/**
		 * @param {string|null} name A source, or null for any
		 */
		pickSource( name ) {
			this.state.source = this.state.source === name ? null : name;
			this.refilter();
		},

		/** The name of a source */
		sourceName,

		/**
		 * @param {number} step -1 for the previous page, 1 for the next
		 */
		page( step ) {
			this.state.offset = Math.max( 0, this.state.offset + step * this.state.limit );
			this.load();
		},

		/** Selects every row of this page, or none. */
		toggleAll() {
			const all = this.allSelected;
			const ids = this.rows.map( r => r.id );
			this.selected = all ? this.selected.filter( id => !ids.includes( id ) ) : [
				...new Set( [
					...this.selected,
					...ids
				] )
			];
		},

		/**
		 * @param {object} conv A conversation
		 * @returns {string} Its title, or "Untitled"
		 */
		titleOf( conv ) {
			return conv.title || "Untitled";
		},

		/**
		 * Opens a conversation in the chat.
		 *
		 * @param {{ id: string }} conv The conversation
		 */
		open( conv ) {
			openInChat( this.$store.session.config.chatUrl, conv.id );
		},

		/** Starts a new conversation in the chat. */
		newChat() {
			openInChat( this.$store.session.config.chatUrl );
		},

		/**
		 * @param {{ id: string, title?: string }} conv The conversation
		 */
		async rename( conv ) {
			const title = await this.$prompt( { title: "Rename this conversation", label: "Title", value: conv.title || "", yes: "Rename" } );
			if ( title === null || !title.trim() ) {
				return;
			}
			const result = await this.$api.post( "/sessions/rename", { conversationId: conv.id, title: title.trim() } );
			if ( !result.ok ) {
				this.$toast.error( result.error || "Could not rename that conversation." );
				return;
			}
			await this.load();
		},

		/**
		 * @param {{ id: string }} conv The conversation
		 */
		async fork( conv ) {
			const title = await this.$prompt( { title: "Fork this conversation", body: "A copy you can take another way. Leave the name empty for Fork of this one.", label: "Name of the copy", yes: "Fork" } );
			if ( title === null ) {
				return;
			}
			const result = await this.$api.post( "/sessions/fork", { conversationId: conv.id, title: title.trim() } );
			if ( result.ok ) {
				this.$toast.success( "Forked." );
			} else {
				this.$toast.error( result.error || "Could not fork that conversation." );
			}
			await this.load();
		},

		/**
		 * @param {{ id: string, title?: string }} conv The conversation
		 */
		async exportMarkdown( conv ) {
			const done = await downloadFile( this.$api, "/export?conversationId=" + encodeURIComponent( conv.id ) + "&format=md", markdownName( conv.title ) );
			if ( done ) {
				this.$toast.success( "Exported " + this.titleOf( conv ) + "." );
			} else {
				this.$toast.error( "Could not export that conversation." );
			}
		},

		/**
		 * Deletes conversations, once the person agrees.
		 *
		 * @param {string[]} ids The conversations
		 */
		async remove( ids ) {
			const many = ids.length > 1;
			const yes = await this.$confirm( {
				title  : many ? "Delete " + this.$fmt.countLabel( ids.length, "conversation" ) + "?" : "Delete this conversation?",
				body   : "Their messages go too. This cannot be undone.",
				danger : true
			} );
			if ( !yes ) {
				return;
			}
			const results = await Promise.all( ids.map( id => this.$api.post( "/sessions/delete", { conversationId: id } ) ) );
			const failed = results.filter( r => !r.ok ).length;
			this.selected = this.selected.filter( id => !ids.includes( id ) );
			if ( failed ) {
				this.$toast.error( "Could not delete " + this.$fmt.countLabel( failed, "conversation" ) + "." );
			} else {
				this.$toast.success( many ? "Deleted " + ids.length + "." : "Deleted." );
			}
			await this.load();
		}
	};
}
