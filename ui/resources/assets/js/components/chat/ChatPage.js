import { CONVERSATION_KEY } from "../../utils/chat.js";
import { applyFrame, argsPreview, newThreadId, newTurn, settleTurn } from "../../utils/turn.js";
import { base64Of, classifyFile, clipText, withTextFiles } from "../../utils/attachments.js";
import { approx, contextLevel, contextSummary, ringDash, windowText } from "../../utils/context.js";
import { vaultAskUrl, vaultRequestOf } from "../../utils/vault-request.js";
import { replyEffects, slashMatches } from "../../utils/reply.js";
import { drawSlots } from "../../utils/extensions.js";

/** Where this browser keeps the profile (model) for the next messages (the Settings page uses it too) */
export const PROFILE_KEY = "bxagents_webui_profile";

/**
 * @param {Array<{ name: string, parent?: string, description?: string }>} agents The agent and its sub-agents
 * @returns {Array<{ value: string, label: string, title: string }>} The choices of the "Talk to" picker: the main agent
 *          is "" (its conversations carry no agent), a sub-agent its name
 */
export function talkChoices( agents ) {
	return ( agents || [] ).map( a => ( { value: a.parent ? a.name : "", label: a.parent ? a.name : a.name + " (main)", title: a.description || "" } ) );
}

/**
 * @param {string} agent The sub-agent talked to, or ""
 * @param {Array<{ name: string, parent?: string }>} agents The agent tree
 * @returns {string} What the banner says while a sub-agent is talked to directly, or ""
 */
export function talkBanner( agent, agents ) {
	if ( !agent ) {
		return "";
	}
	const node = ( agents || [] ).find( a => a.name === agent ) || {};
	return "You are talking to " + agent + " directly" + ( node.parent ? " (a sub-agent of " + node.parent + ")" : "" )
		+ ". It keeps its own memory of this conversation, and it uses your notes and the notes every agent shares.";
}

/**
 * The chat: the list of conversations (GET /sessions; POST /sessions, /sessions/rename, /sessions/delete), the
 * transcript (GET /history) and a turn streamed with $sse (POST /stream), steered while it runs (POST /steer) or stopped
 * (POST /cancel). The open conversation is kept in this browser (CONVERSATION_KEY), so a reload opens it again.
 *
 * The transcript is plain data (messages) drawn by Alpine: { role: "you" | "agent" | "error" | "reply" | "approval" }.
 * An answer is a turn from utils/turn.js, its Markdown drawn with $md. A slash command (POST /command) answers a Reply
 * of blocks; a paused tool call shows an approval (GET /pending) answered with POST /resume, streamed like a turn.
 * Pictures and text files go with a message (utils/attachments.js); the context gauge reads GET /context.
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
		/** @type {Array<{ name: string, hint: string, extension?: string }>} The slash commands offered */
		commands      : [],
		/** @type {number} The command picked in the "/" menu */
		slashPick     : 0,
		/** @type {boolean} True while the "/" menu may show */
		slashOpen     : false,
		/** @type {Array<{ name: string, mime: string, data: string, url: string }>} Pictures that go with the next message */
		images        : [],
		/** @type {Array<{ name: string, content: string }>} Text files that go with the next message */
		texts         : [],
		/** @type {boolean} True while files are dragged over the composer */
		dragging      : false,
		/** @type {object|null} What GET /context answered for the open conversation */
		context       : null,
		/** @type {boolean} True while the context breakdown is open */
		contextOpen   : false,
		/** @type {Array<{ name: string, model?: string, description?: string, provider?: string }>} Profiles offered */
		profiles      : [],
		/** @type {string} The profile for the next messages ("" for the default model) */
		profile       : "",
		/** @type {Array<{ name: string, text: string }>} What the extensions' status items say */
		status        : [],

		/** @returns {Array<object>} The choices of the "Talk to" picker, when there are sub-agents */
		get talkChoices() {
			const agents = this.$store.session.agents;
			return agents.length > 1 ? talkChoices( agents ) : [];
		},

		/** @returns {string} What the banner says while a sub-agent is talked to */
		get talkBanner() {
			return talkBanner( this.agent, this.$store.session.agents );
		},

		/** Tokens as "~1.2k" */
		approx,
		/** A window as "128k" */
		windowText,

		/** @returns {Array<object>} The commands that match what is typed */
		get slashShown() {
			return this.slashOpen ? slashMatches( this.commands, this.draft ) : [];
		},

		/** @returns {string} The context gauge's level: ok, warn, danger or unknown */
		get contextLevel() {
			return this.context ? contextLevel( this.context ) : "unknown";
		},

		/** @returns {string} What the context gauge says */
		get contextText() {
			return this.context ? "Context: " + contextSummary( this.context ) + ". Click for the breakdown" : "";
		},

		/** @returns {string} How much of the ring is filled */
		get contextDash() {
			return this.context ? ringDash( this.context ) : "0 100";
		},

		/**
		 * @param {string} name A command, such as "/fork"
		 * @returns {boolean} True when the server offers it
		 */
		offers( name ) {
			return this.commands.some( c => c.name === name );
		},

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
			this.plugExtensions();
			this.guardLeaving();
			await this.$store.session.loaded();
			if ( this.$store.session.can( "profiles" ) ) {
				this.loadProfiles();
			}
			if ( this.$store.session.can( "commands" ) ) {
				this.$api.get( "/commands" ).then( result => {
					this.commands = result.ok ? result.data.commands || [] : [];
				} );
			}
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
			this.refreshContext();
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
			this.context = null;
			this.$refs.input && this.$refs.input.focus();
			await this.loadConversations();
			this.refreshExtensions();
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

		/** Sends what is typed: a command, a steer when a turn is running, or a new turn. */
		async send() {
			let text = this.draft.trim();
			if ( !text ) {
				return;
			}
			this.slashOpen = false;
			// a lone question mark asks which keys do what
			if ( this.commands.length && text === "?" ) {
				text = "/keys";
			}
			if ( this.commands.length && text.startsWith( "/" ) ) {
				if ( this.busy ) {
					this.hint = "Wait for the answer, or press Stop, before running a command.";
					return;
				}
				this.draft = "";
				this.grow();
				await this.runCommand( text );
				return;
			}
			this.draft = "";
			this.grow();
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
		 * Sends one message as a new turn, with the files that wait.
		 *
		 * @param {string} text The message
		 */
		async runTurn( text ) {
			const images = this.images.slice();
			const body = { input: withTextFiles( text, this.texts ), conversationId: this.conversationId, threadId: newThreadId(), options: {} };
			if ( this.profile ) {
				body.options.profile = this.profile;
			}
			if ( images.length ) {
				body.attachments = images.map( i => ( { name: i.name, mime: i.mime, data: i.data } ) );
			}
			this.images = [];
			this.texts = [];
			this.messages.push( { role: "you", text, images: images.map( i => i.url ) } );
			try {
				localStorage.removeItem( LOCAL_KEY );
			} catch ( e ) {
				// nothing kept
			}
			await this.streamTurn( "/stream", this.withAgent( body ) );
		},

		/**
		 * Streams a turn into the transcript: a new one (/stream) or the rest of a paused one (/resume).
		 *
		 * @param {string} path /stream or /resume
		 * @param {object} body What to send; its threadId names the turn
		 */
		async streamTurn( path, body ) {
			this.messages.push( { role: "agent", turn: newTurn() } );
			// the reactive copy, so each frame redraws the answer
			const turn = this.messages[ this.messages.length - 1 ].turn;
			this.scrollToEnd( true );
			this.busy = true;
			this.hint = "";
			this.threadId = body.threadId;
			this.controller = new AbortController();
			const outcome = await this.$sse( path, {
				body,
				signal : this.controller.signal,
				onEvent: ( name, data ) => {
					applyFrame( turn, data );
					this.scrollToEnd();
				}
			} );
			const stopped = this.controller.signal.aborted;
			settleTurn( turn );
			if ( !outcome.ok && !stopped ) {
				const at = this.messages.findIndex( m => m.turn === turn );
				this.messages.splice( at, 1 );
				this.messages.push( { role: "error", text: outcome.status === 401 ? "This server asks for a password." : outcome.error || "Something went wrong." } );
				if ( outcome.status === 401 ) {
					window.dispatchEvent( new CustomEvent( "bxagents:refused" ) );
				}
			}
			const threadId = this.threadId;
			this.controller = null;
			this.threadId = "";
			this.busy = false;
			if ( stopped ) {
				this.hint = "Stopped.";
			} else if ( turn.suspended ) {
				await this.offerApproval( threadId );
			}
			this.$refs.input && this.$refs.input.focus();
			// the turn moved this conversation to the top of the list, and may have given it its title
			this.loadConversations();
			this.refreshContext();
			this.offerVaultRequest( turn );
		},

		/**
		 * The agent paused a tool call for a person to approve: ask the server what it wants to do, and show it.
		 *
		 * @param {string} threadId The paused turn
		 */
		async offerApproval( threadId ) {
			const result = await this.$api.get( "/pending?threadId=" + encodeURIComponent( threadId ) + ( this.agent ? "&agent=" + encodeURIComponent( this.agent ) : "" ) );
			if ( !result.ok || !result.data.pending ) {
				this.hint = "The agent paused, but no pending approval was found.";
				return;
			}
			const actions = ( result.data.pendingActions || [] ).map( a => ( {
				name: a.name || a.tool || "action",
				args: a.arguments ? ( typeof a.arguments === "string" ? a.arguments : JSON.stringify( a.arguments ) ) : ""
			} ) );
			this.messages.push( { role: "approval", threadId, actions } );
			this.scrollToEnd( true );
		},

		/**
		 * Answers an approval: the rest of the same turn streams in, so the answer lands in this conversation.
		 *
		 * @param {{ threadId: string }} m The approval
		 * @param {string} decision approve | reject
		 */
		async decide( m, decision ) {
			this.messages.splice( this.messages.indexOf( m ), 1 );
			await this.streamTurn( "/resume", this.withAgent( { threadId: m.threadId, decision } ) );
		},

		/**
		 * When the agent asked for a secret, send the person to the Vault page with the ask: the value never passes
		 * through the chat.
		 *
		 * @param {{ tools: Array }} turn The answer
		 */
		offerVaultRequest( turn ) {
			const ask = vaultRequestOf( turn.tools );
			if ( ask && this.$store.session.can( "vault" ) ) {
				window.location.href = vaultAskUrl( this.$store.session.config.basePath, ask );
			}
		},

		/**
		 * Runs a slash command on the server and shows its Reply.
		 *
		 * @param {string} line The command, as typed
		 */
		async runCommand( line ) {
			this.messages.push( { role: "you", text: line, images: [] } );
			this.scrollToEnd( true );
			const result = await this.$api.post( "/command", { line, conversationId: this.conversationId } );
			if ( !result.data || !result.data.blocks ) {
				this.messages.push( { role: "error", text: result.error || "That command did not work." } );
				return;
			}
			const reply = result.data;
			// a command that moves to another conversation, or empties this one, redraws the transcript first; its
			// answer is shown after that so it is not wiped with it
			const effects = replyEffects( reply, this.conversationId );
			if ( effects.open ) {
				await this.open( { id: effects.open } );
			} else if ( effects.reload ) {
				await this.loadHistory();
			}
			this.messages.push( { role: "reply", reply } );
			reply.blocks.filter( b => b.type === "file" ).forEach( b => this.saveFile( b ) );
			this.scrollToEnd( true );
			this.loadConversations();
			this.refreshContext();
		},

		/**
		 * Hands a file a command answered to the browser to save.
		 *
		 * @param {{ name: string, mime: string, text: string }} block The file block
		 */
		saveFile( block ) {
			const url = URL.createObjectURL( new Blob( [ block.text ], { type: block.mime } ) );
			const link = document.createElement( "a" );
			link.href = url;
			link.download = block.name;
			document.body.appendChild( link );
			link.click();
			link.remove();
			setTimeout( () => URL.revokeObjectURL( url ), 60000 );
		},

		/** Copies this conversation under a new name (the /fork command). */
		async fork() {
			const name = await this.$prompt( { title: "Fork this conversation", body: "A copy you can take another way. Leave the name empty for Fork of this one.", label: "Name of the copy", yes: "Fork" } );
			if ( name !== null && !this.busy ) {
				await this.runCommand( ( "/fork " + name.trim() ).trim() );
			}
		},

		/** Saves this conversation as a Markdown file (the /export command). */
		async exportChat() {
			if ( !this.busy ) {
				await this.runCommand( "/export" );
			}
		},

		/** Summarizes older messages and keeps the recent ones. */
		async compact() {
			this.contextOpen = false;
			this.hint = "Compacting...";
			const result = await this.$api.post( "/compact", { conversationId: this.conversationId } );
			if ( !result.ok ) {
				this.hint = "Compaction failed.";
				return;
			}
			if ( !result.data.compacted ) {
				// not an error: too few messages to be worth summarizing
				this.hint = "Nothing to compact yet (" + result.data.before + " messages).";
				return;
			}
			this.hint = "Compacted " + result.data.before + " messages down to " + result.data.after + ".";
			await this.loadHistory();
			this.loadConversations();
		},

		/** Reads what the extensions show (status chips and slots), then how much of the window the conversation uses. */
		async refreshContext() {
			this.refreshExtensions();
			await this.readContext();
		},

		/** Reads how much of the model's window the open conversation uses. */
		async readContext() {
			if ( !this.$store.session.can( "context" ) || this.isLocalOnly() ) {
				this.context = null;
				return;
			}
			const result = await this.$api.get( "/context?conversationId=" + encodeURIComponent( this.conversationId ) );
			this.context = result.ok ? result.data : null;
		},

		/** Reads the extensions' status items and slots for the open conversation, then tells their scripts. */
		async refreshExtensions() {
			const id = encodeURIComponent( this.conversationId );
			const session = this.$store.session;
			const [ status, slots ] = await Promise.all( [
				session.can( "status" ) ? this.$api.get( "/status?conversationId=" + id ) : Promise.resolve( null ),
				session.can( "slots" ) ? this.$api.get( "/slots?conversationId=" + id ) : Promise.resolve( null )
			] );
			this.status = status && status.ok ? status.data.items || [] : [];
			drawSlots( document, slots && slots.ok ? slots.data.items || [] : [] );
			window.bxagents && window.bxagents.notify && window.bxagents.notify();
		},

		/** Gives window.bxagents what only the chat knows. */
		plugExtensions() {
			if ( !window.bxagents || !window.bxagents.plug ) {
				return;
			}
			window.bxagents.plug( {
				conversationId: () => this.conversationId,
				runCommand    : line => ( this.busy ? null : this.runCommand( line ) ),
				refresh       : () => this.refreshContext()
			} );
		},

		/**
		 * Warns before the page is left while an answer streams: the browser's own question when the page closes or
		 * reloads, and the app's when a link of the app is followed (the answer stops; nothing already said is lost).
		 */
		guardLeaving() {
			window.addEventListener( "beforeunload", evt => {
				if ( this.busy ) {
					evt.preventDefault();
					evt.returnValue = "";
				}
			} );
			document.addEventListener( "click", async evt => {
				const link = evt.target.closest && evt.target.closest( "a[href]" );
				if ( !this.busy || !link || link.getAttribute( "href" ).startsWith( "#" ) || link.target === "_blank" || evt.ctrlKey || evt.metaKey ) {
					return;
				}
				evt.preventDefault();
				const leave = await this.$confirm( { title: "Leave while the agent answers?", body: "The answer stops. What it already said stays in the conversation.", yes: "Leave" } );
				if ( leave ) {
					this.busy = false;
					window.location.href = link.href;
				}
			}, true );
		},

		/** Reads the profiles the server offers, and the one this browser chose. */
		async loadProfiles() {
			const result = await this.$api.get( "/profiles" );
			this.profiles = result.ok ? result.data.profiles || [] : [];
			let remembered = "";
			try {
				remembered = localStorage.getItem( PROFILE_KEY ) || "";
			} catch ( e ) {
				remembered = "";
			}
			this.profile = this.profiles.some( p => p.name === remembered ) ? remembered : "";
		},

		/** Keeps the chosen profile in this browser, as the Settings page does. */
		pickProfile() {
			try {
				localStorage.setItem( PROFILE_KEY, this.profile );
			} catch ( e ) {
				// the choice still holds for this visit
			}
		},

		/**
		 * Talks to another agent: a conversation belongs to the agent it started with, so this starts a new one.
		 *
		 * @param {string} agent The sub-agent, or "" for the main agent
		 */
		async talkTo( agent ) {
			if ( this.busy ) {
				return;
			}
			this.agent = agent;
			await this.newChat();
		},

		/**
		 * Takes the files a person chose, pasted or dropped.
		 *
		 * @param {FileList|File[]} files The files
		 */
		addFiles( files ) {
			Array.from( files || [] ).forEach( file => {
				const verdict = classifyFile( file, { images: this.images.length, seesImages: this.$store.session.vision !== "no" } );
				if ( verdict.problem ) {
					this.hint = verdict.problem;
					return;
				}
				const reader = new FileReader();
				if ( verdict.kind === "image" ) {
					reader.onload = () => {
						const url = String( reader.result );
						this.images.push( { name: file.name || "pasted.png", mime: file.type, data: base64Of( url ), url } );
					};
					reader.readAsDataURL( file );
				} else {
					reader.onload = () => this.texts.push( { name: file.name, content: clipText( String( reader.result ) ) } );
					reader.readAsText( file );
				}
			} );
		},

		/** @param {ClipboardEvent} evt A paste: files in it are attached */
		onPaste( evt ) {
			const files = evt.clipboardData && evt.clipboardData.files;
			if ( this.$store.session.can( "attachments" ) && files && files.length ) {
				evt.preventDefault();
				this.addFiles( files );
			}
		},

		/** @param {DragEvent} evt Files dropped on the composer */
		onDrop( evt ) {
			this.dragging = false;
			if ( this.$store.session.can( "attachments" ) && evt.dataTransfer && evt.dataTransfer.files.length ) {
				this.addFiles( evt.dataTransfer.files );
			}
		},

		/**
		 * @param {{ name: string }} c A command of the "/" menu
		 */
		pickCommand( c ) {
			this.draft = c.name + " ";
			this.slashOpen = false;
			this.$refs.input && this.$refs.input.focus();
		},

		/** Opens the "/" menu with every command. */
		openCommands() {
			this.draft = "/";
			this.slashPick = 0;
			this.slashOpen = true;
			this.$refs.input && this.$refs.input.focus();
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
			const open = this.slashShown;
			if ( open.length ) {
				if ( evt.key === "ArrowDown" || evt.key === "ArrowUp" ) {
					evt.preventDefault();
					this.slashPick = ( this.slashPick + ( evt.key === "ArrowDown" ? 1 : open.length - 1 ) ) % open.length;
					return;
				}
				if ( evt.key === "Tab" ) {
					evt.preventDefault();
					this.pickCommand( open[ Math.min( this.slashPick, open.length - 1 ) ] );
					return;
				}
				if ( evt.key === "Escape" ) {
					this.slashOpen = false;
					return;
				}
			}
			if ( evt.key === "Enter" && !evt.shiftKey && !evt.isComposing ) {
				evt.preventDefault();
				this.send();
			}
		},

		/** Opens the "/" menu again as a command name is typed, and grows the composer. */
		onInput() {
			this.slashPick = 0;
			this.slashOpen = true;
			this.grow();
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
			// after Alpine has drawn the change (nextTick) and the browser has laid it out (a frame), so a card that
			// was just added is measured
			this.$nextTick( () => requestAnimationFrame( () => {
				const el = this.$refs.messages;
				if ( !el ) {
					return;
				}
				if ( force || el.scrollHeight - el.scrollTop - el.clientHeight < 48 ) {
					el.scrollTop = el.scrollHeight;
				}
			} ) );
		}
	};
}
