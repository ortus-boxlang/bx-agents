import { CONVERSATION_KEY } from "../../utils/chat.js";
import { applyFrame, argsPreview, newThreadId, newTurn, settleTurn } from "../../utils/turn.js";

/**
 * The chat: the list of conversations (GET /sessions; POST /sessions, /sessions/rename, /sessions/delete), the
 * transcript (GET /history) and a turn streamed with $sse (POST /stream), steered while it runs (POST /steer) or stopped
 * (POST /cancel). The open conversation is kept under the same key as the current page, so both open the same one.
 *
 * The transcript is plain data (messages) drawn by Alpine; an answer is a turn from utils/turn.js, its Markdown drawn
 * with $md.
 */

export const LOCAL_KEY = CONVERSATION_KEY + ".local";
export const CONV_PAGE = 25;

/**
 * @param {{ agent?: string }} row A conversation
 * @param {string} mainAgent The main agent's name
 * @returns {string} The sub-agent it belongs to, or "" for the main agent
 */
export function agentOfRow( row, mainAgent ) {
	return row && row.agent && row.agent !== mainAgent ? row.agent : "";
}

/**
 * @param {Array<{ role: string, body?: string, images?: string[] }>} history What GET /history answered
 * @returns {Array<object>} The transcript: { role: "you" | "agent", text, images, turn }
 */
export function transcriptOf( history ) {
	return ( history || [] )
		.filter( m => ( m.body || "" ).length || ( m.images || [] ).length )
		.filter( m => m.role === "you" || m.role === "agent" )
		.map( m => m.role === "you"
			? { role: "you", text: m.body || "", images: m.images || [] }
			: { role: "agent", turn: { ...newTurn(), text: m.body || "", pending: false } } );
}

/**
 * @returns {object} Alpine component state and actions
 */
export function chatPage() {
	return {
		/** @type {Array<object>} The conversations on the list */
		conversations : [],
		/** @type {number} How many there are in all */
		total         : 0,
		/** @type {number} How many the list asks for */
		limit         : CONV_PAGE,
		/** @type {string} A filter on the titles */
		query         : "",
		/** @type {string} The open conversation */
		conversationId: "",
		/** @type {string} The sub-agent being talked to, or "" for the main agent */
		agent         : "",
		/** @type {Array<object>} The transcript */
		messages      : [],
		/** @type {boolean} True until the transcript of the open conversation has loaded */
		loading       : true,
		/** @type {string} What is typed */
		draft         : "",
		/** @type {boolean} True while a turn runs */
		busy          : false,
		/** @type {string} The thread of the turn that runs */
		threadId      : "",
		/** @type {AbortController|null} Stops listening to the turn */
		controller    : null,
		/** @type {string} A line under the transcript */
		hint          : "",
		/** @type {string} What the empty chat says */
		welcome       : "",
		/** @type {string[]} What the empty chat offers to send with one click */
		suggestions   : [],
		/** @type {boolean} Show the model's reasoning */
		showReasoning : true,
		/** @type {boolean} Show the tool calls */
		showTools     : true,

		/** The preview of a tool call's arguments */
		argsPreview,

		/** @returns {boolean} True when the list has more than it shows */
		get hasMore() {
			return this.total > this.conversations.length && this.limit < 100;
		},

		/** Reads the settings, opens the last conversation and loads the list. */
		async init() {
			const data = this.$el.dataset;
			this.welcome = data.welcome || "";
			try {
				this.suggestions = JSON.parse( data.suggestions || "[]" );
			} catch ( e ) {
				this.suggestions = [];
			}
			this.showReasoning = data.showReasoning !== "false";
			this.showTools = data.showTools !== "false";
			this.conversationId = this.storedId() || this.mintId();
			this.$watch( "query", () => {
				this.limit = CONV_PAGE;
				this.loadConversations();
			} );
			await this.$store.session.loaded();
			await this.loadConversations();
			await this.loadHistory();
			this.$nextTick( () => this.$refs.input && this.$refs.input.focus() );
		},

		/** Stops listening when the page leaves. */
		destroy() {
			if ( this.controller ) {
				this.controller.abort();
			}
		},

		/** @returns {string} The conversation kept in this browser */
		storedId() {
			try {
				return localStorage.getItem( CONVERSATION_KEY ) || "";
			} catch ( e ) {
				return "";
			}
		},

		/**
		 * @returns {string} A new conversation id, kept as the open one; the server has no row for it until its first turn
		 */
		mintId() {
			const id = newThreadId();
			try {
				localStorage.setItem( CONVERSATION_KEY, id );
				localStorage.setItem( LOCAL_KEY, id );
			} catch ( e ) {
				// kept for this visit only
			}
			return id;
		},

		/** @returns {boolean} True for an id this page made up and has not sent a turn on yet */
		isLocalOnly() {
			try {
				return localStorage.getItem( LOCAL_KEY ) === this.conversationId;
			} catch ( e ) {
				return false;
			}
		},

		/**
		 * @param {object} body A request body
		 * @returns {object} It, with the sub-agent when one is talked to
		 */
		withAgent( body ) {
			return this.agent ? { ...body, agent: this.agent } : body;
		},

		/** Reads the list of conversations. */
		async loadConversations() {
			if ( !this.$store.session.can( "~conversations" ) ) {
				return;
			}
			const result = await this.$api.get( "/sessions?limit=" + this.limit + ( this.query.trim() ? "&q=" + encodeURIComponent( this.query.trim() ) : "" ) );
			if ( !result.ok ) {
				return;
			}
			this.conversations = result.data.sessions || [];
			this.total = typeof result.data.total === "number" ? result.data.total : this.conversations.length;
			const open = this.conversations.find( c => c.id === this.conversationId );
			if ( open ) {
				this.agent = agentOfRow( open, this.$store.session.agentName );
			}
		},

		/** Shows more of the list, up to 100; past that the Conversations page takes over. */
		showMore() {
			this.limit = Math.min( 100, this.limit + CONV_PAGE );
			this.loadConversations();
		},

		/** Reads the transcript of the open conversation. */
		async loadHistory() {
			this.messages = [];
			if ( this.isLocalOnly() ) {
				this.loading = false;
				return;
			}
			this.loading = true;
			const result = await this.$api.get( "/history?conversationId=" + encodeURIComponent( this.conversationId ) );
			this.loading = false;
			// a history that cannot be read never blocks the chat
			this.messages = result.ok ? transcriptOf( result.data.messages ) : [];
			this.scrollToEnd( true );
		},

		/**
		 * Opens a conversation of the list.
		 *
		 * @param {{ id: string }} conv The conversation
		 */
		async open( conv ) {
			if ( this.controller ) {
				this.controller.abort();
			}
			this.conversationId = conv.id;
			this.agent = agentOfRow( conv, this.$store.session.agentName );
			try {
				localStorage.setItem( CONVERSATION_KEY, conv.id );
			} catch ( e ) {
				// kept for this visit only
			}
			this.hint = "";
			await this.loadHistory();
		},

		/** Starts a new conversation with the agent talked to; the server mints its id. */
		async newChat() {
			const result = await this.$api.post( "/sessions", this.agent ? { agent: this.agent } : {} );
			this.conversationId = result.ok && result.data.conversationId ? result.data.conversationId : this.mintId();
			try {
				localStorage.setItem( CONVERSATION_KEY, this.conversationId );
			} catch ( e ) {
				// kept for this visit only
			}
			// the transcript is cleared now, before the list is fetched: a message sent meanwhile must not be wiped
			this.messages = [];
			this.hint = "";
			this.$refs.input && this.$refs.input.focus();
			await this.loadConversations();
		},

		/** @param {{ id: string, title?: string }} conv The conversation */
		async rename( conv ) {
			const title = await this.$prompt( { title: "Rename this conversation", label: "Title", value: conv.title || "", yes: "Rename" } );
			if ( title === null || !title.trim() ) {
				return;
			}
			const result = await this.$api.post( "/sessions/rename", { conversationId: conv.id, title: title.trim() } );
			if ( !result.ok ) {
				this.$toast.error( result.error || "Could not rename that conversation." );
			}
			await this.loadConversations();
		},

		/** @param {{ id: string }} conv The conversation */
		async remove( conv ) {
			if ( !await this.$confirm( { title: "Delete this conversation?", body: "Its messages go too.", danger: true } ) ) {
				return;
			}
			const result = await this.$api.post( "/sessions/delete", { conversationId: conv.id } );
			if ( !result.ok ) {
				this.$toast.error( result.error || "Could not delete that conversation." );
				return;
			}
			await this.loadConversations();
			// deleting the open chat leaves nothing shown: open the newest one left, or start fresh
			if ( conv.id === this.conversationId ) {
				if ( this.conversations.length ) {
					await this.open( this.conversations[ 0 ] );
				} else {
					await this.newChat();
				}
			}
		},

		/**
		 * @param {string} text A suggestion
		 */
		suggest( text ) {
			this.draft = text;
			this.send();
		},

		/** Sends what is typed: a new turn, or a steer when one is running. */
		async send() {
			const text = this.draft.trim();
			if ( !text ) {
				return;
			}
			this.draft = "";
			if ( this.busy && this.threadId ) {
				this.messages.push( { role: "you", text, images: [] } );
				this.scrollToEnd( true );
				const result = await this.$api.post( "/steer", this.withAgent( { threadId: this.threadId, input: text } ) );
				this.hint = result.ok ? "Steered: the agent picks this up at its next step." : "Could not steer this run.";
				return;
			}
			await this.runTurn( text );
		},

		/**
		 * Streams one turn into the transcript.
		 *
		 * @param {string} text The message
		 */
		async runTurn( text ) {
			this.messages.push( { role: "you", text, images: [] } );
			const answer = { role: "agent", turn: newTurn() };
			this.messages.push( answer );
			// the reactive copy, so each frame redraws the answer
			const turn = this.messages[ this.messages.length - 1 ].turn;
			this.scrollToEnd( true );
			this.busy = true;
			this.hint = "";
			this.threadId = newThreadId();
			try {
				localStorage.removeItem( LOCAL_KEY );
			} catch ( e ) {
				// nothing kept
			}
			this.controller = new AbortController();
			const outcome = await this.$sse( "/stream", {
				body   : this.withAgent( { input: text, conversationId: this.conversationId, threadId: this.threadId, options: {} } ),
				signal : this.controller.signal,
				onEvent: ( name, data ) => {
					applyFrame( turn, data );
					this.scrollToEnd();
				}
			} );
			const stopped = this.controller.signal.aborted;
			settleTurn( turn );
			if ( !outcome.ok && !stopped ) {
				this.messages.splice( this.messages.indexOf( this.messages.find( m => m.turn === turn ) ), 1 );
				this.messages.push( { role: "error", text: outcome.status === 401 ? "This server asks for a password." : outcome.error || "Something went wrong." } );
			}
			if ( stopped ) {
				this.hint = "Stopped.";
			} else if ( turn.suspended ) {
				this.hint = "The agent paused for your approval.";
			}
			this.controller = null;
			this.threadId = "";
			this.busy = false;
			this.$refs.input && this.$refs.input.focus();
			// the turn moved this conversation to the top of the list, and may have given it its title
			this.loadConversations();
		},

		/** Stops the turn: the server first (tools stop firing, tokens stop being spent), then the listening. */
		async stop() {
			await this.$api.post( "/cancel", this.withAgent( { threadId: this.threadId, reason: "Stopped by the user." } ) );
			if ( this.controller ) {
				this.controller.abort();
			}
		},

		/**
		 * Enter sends, Shift+Enter is a new line.
		 *
		 * @param {KeyboardEvent} evt The key
		 */
		onKey( evt ) {
			if ( evt.key === "Enter" && !evt.shiftKey && !evt.isComposing ) {
				evt.preventDefault();
				this.send();
			}
		},

		/** Grows the composer with what is typed, up to a limit. */
		grow() {
			const el = this.$refs.input;
			if ( el ) {
				el.style.height = "auto";
				el.style.height = Math.min( el.scrollHeight, 200 ) + "px";
			}
		},

		/**
		 * Copies an answer's Markdown, which is what someone pasting it wants back.
		 *
		 * @param {{ text: string }} turn The answer
		 */
		async copy( turn ) {
			try {
				await navigator.clipboard.writeText( turn.text );
				this.$toast.success( "Copied." );
			} catch ( e ) {
				this.$toast.error( "Could not copy." );
			}
		},

		/**
		 * Follows the stream only when the reader is already at the bottom, so scrolling up to re-read is not undone.
		 *
		 * @param {boolean} [force] Scroll whatever the position
		 */
		scrollToEnd( force ) {
			this.$nextTick( () => {
				const el = this.$refs.messages;
				if ( !el ) {
					return;
				}
				if ( force || el.scrollHeight - el.scrollTop - el.clientHeight < 48 ) {
					el.scrollTop = el.scrollHeight;
				}
			} );
		}
	};
}
