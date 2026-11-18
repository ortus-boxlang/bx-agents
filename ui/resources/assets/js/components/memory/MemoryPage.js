/**
 * The Memory page: notes about the person (theirs alone), the agent's notes (global), and the conversation memory each
 * agent keeps (GET /notes; POST /notes, /notes/update, /notes/remove, /notes/clear; GET /sessions; POST /memory/clear).
 */

export const NOTE_SCOPES = [
	{
		id   : "user",
		title: "About you",
		blurb: "Facts about you that the agent keeps: your name, how you like answers. They are yours alone: nobody sees them, an admin included, and every agent and sub-agent you talk to uses them."
	},
	{
		id   : "agent",
		title: "Notes of the agent",
		blurb: "Lessons about the work itself. They are global: the agent and every sub-agent read and write the same set, and everyone who talks to the agent shares them."
	}
];

/**
 * @param {{ notes: Array, stats: { used: number, limit: number } }} part One scope of GET /notes
 * @returns {string} "3 notes, 120 of 2000 characters (about 30 tokens in every conversation)"
 */
export function notesSummary( part ) {
	const n = part.notes.length;
	const used = part.stats.used || 0;
	return n + ( n === 1 ? " note, " : " notes, " ) + used + " of " + ( part.stats.limit || 0 ) + " characters (about " + Math.ceil( used / 4 ) + " tokens in every conversation)";
}

/**
 * @returns {object} Alpine component state and actions
 */
export function memoryPage() {
	return {
		scopes    : NOTE_SCOPES,
		/** @type {boolean} True until the notes answered */
		loading   : true,
		/** @type {string} Why the notes could not be read */
		failed    : "",
		/** @type {Object<string, { notes: Array<{ id: string, text: string }>, stats: { used: number, limit: number } }>} */
		notes     : {},
		/** @type {Object<string, string>} The note being typed, per scope */
		drafts    : { user: "", agent: "" },
		/** @type {{ scope: string, id: string, text: string } | null} The note being edited */
		editing   : null,
		/** @type {boolean} True when the person is an admin */
		admin     : false,
		/** @type {Array<{ value: string, label: string }>} The agents whose conversation memory can be shown */
		agents    : [],
		/** @type {string} The agent shown ("" when there is only one) */
		agentKey  : "",
		/** @type {Array<object>} The newest conversations of that agent */
		convs     : [],
		/** @type {number} How many it has in all */
		convTotal : 0,
		/** @type {string} Why they could not be read */
		convFailed: "",

		/** Loads the notes, and the conversation memory once the agents are known. */
		async init() {
			this.loadNotes();
			await this.$store.session.loaded();
			this.admin = this.$store.session.can( "admin" );
			const main = this.$store.session.agentName;
			const tree = this.$store.session.agents.length ? this.$store.session.agents : [ { name: main || "the agent", parent: "" } ];
			this.agents = tree.map( a => ( { value: a.parent ? a.name : main || "", label: a.name + ( a.parent ? "" : " (main)" ) } ) );
			this.agentKey = tree.length > 1 ? main || "" : "";
			this.$watch( "agentKey", () => this.loadConvs() );
			this.loadConvs();
		},

		/** Reads both sets of notes. */
		async loadNotes() {
			const result = await this.$api.get( "/notes" );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = "Could not load the notes.";
				return;
			}
			this.failed = "";
			const empty = { notes: [], stats: { used: 0, limit: 0 } };
			this.notes = { user: result.data.user || empty, agent: result.data.agent || empty };
		},

		/**
		 * @param {string} scope user | agent
		 * @returns {{ notes: Array, stats: object }} That scope's notes
		 */
		part( scope ) {
			return this.notes[ scope ] || { notes: [], stats: { used: 0, limit: 0 } };
		},

		/** How much a scope uses */
		notesSummary,

		/**
		 * @param {string} scope user | agent
		 * @returns {boolean} True when this person may remove that scope's notes (the agent's take an admin)
		 */
		canRemove( scope ) {
			return scope === "user" || this.admin;
		},

		/**
		 * Posts a change to the notes and reloads them.
		 *
		 * @param {string} path The route
		 * @param {object} body Its body
		 * @param {string} done What to say when it worked
		 * @param {string} fallback What to say when it did not
		 */
		async change( path, body, done, fallback ) {
			const result = await this.$api.post( path, body );
			if ( result.ok ) {
				this.$toast.success( done );
			} else {
				this.$toast.error( result.error || fallback );
			}
			await this.loadNotes();
			return result.ok;
		},

		/**
		 * @param {string} scope user | agent
		 */
		async add( scope ) {
			const text = this.drafts[ scope ].trim();
			if ( !text ) {
				return;
			}
			if ( await this.change( "/notes", { scope, text }, "Noted.", "Could not add the note." ) ) {
				this.drafts[ scope ] = "";
			}
		},

		/**
		 * @param {string} scope user | agent
		 * @param {{ id: string, text: string }} note The note
		 */
		edit( scope, note ) {
			this.editing = { scope, id: note.id, text: note.text };
		},

		/** Saves the note being edited (an unchanged or empty one just closes). */
		async save() {
			const edit = this.editing;
			const before = this.part( edit.scope ).notes.find( n => n.id === edit.id );
			const text = edit.text.trim();
			this.editing = null;
			if ( !text || ( before && before.text === text ) ) {
				return;
			}
			await this.change( "/notes/update", { scope: edit.scope, id: edit.id, text }, "Updated.", "Could not update the note." );
		},

		/**
		 * @param {string} scope user | agent
		 * @param {{ id: string, text: string }} note The note
		 */
		async remove( scope, note ) {
			if ( await this.$confirm( { title: "Remove this note?", body: note.text, yes: "Remove", danger: true } ) ) {
				await this.change( "/notes/remove", { scope, id: note.id }, "Removed.", "Could not remove the note." );
			}
		},

		/**
		 * @param {string} scope user | agent
		 */
		async clear( scope ) {
			const n = this.part( scope ).notes.length;
			if ( await this.$confirm( { title: "Clear all " + n + " notes?", body: "This cannot be undone.", yes: "Clear all", danger: true } ) ) {
				await this.change( "/notes/clear", { scope }, "Cleared.", "Could not clear the notes." );
			}
		},

		/** Reads the newest conversations of the agent shown. */
		async loadConvs() {
			const result = await this.$api.get( "/sessions?limit=25" + ( this.agentKey ? "&agent=" + encodeURIComponent( this.agentKey ) : "" ) );
			if ( !result.ok ) {
				this.convFailed = "Could not load the conversations.";
				return;
			}
			this.convFailed = "";
			this.convs = result.data.sessions || [];
			this.convTotal = typeof result.data.total === "number" ? result.data.total : this.convs.length;
		},

		/** @returns {string} The Conversations page, filtered to the agent shown */
		get allConvsUrl() {
			return this.$store.session.config.basePath + "/conversations" + ( this.agentKey ? "?agent=" + encodeURIComponent( this.agentKey ) : "" );
		},

		/**
		 * Forgets what was said in one conversation; the conversation stays.
		 *
		 * @param {{ id: string, messageCount?: number }} conv The conversation
		 */
		async clearConv( conv ) {
			const yes = await this.$confirm( { title: "Forget the " + ( conv.messageCount || 0 ) + " messages of this conversation?", body: "The conversation stays.", yes: "Clear", danger: true } );
			if ( !yes ) {
				return;
			}
			const result = await this.$api.post( "/memory/clear", { conversationId: conv.id } );
			if ( result.ok ) {
				this.$toast.success( "Cleared." );
			} else {
				this.$toast.error( result.error || "Could not clear that conversation." );
			}
			await this.loadConvs();
		},

		/** Forgets what was said in every conversation of the agent shown (admin). */
		async clearAllConvs() {
			const yes = await this.$confirm( {
				title : "Forget the messages of all " + this.convTotal + " conversations" + ( this.agentKey ? " of " + this.agentKey : "" ) + "?",
				body  : "The conversations stay, empty. This cannot be undone.",
				yes   : "Clear all",
				danger: true
			} );
			if ( !yes ) {
				return;
			}
			const result = await this.$api.post( "/memory/clear", this.agentKey ? { all: true, agent: this.agentKey } : { all: true } );
			if ( result.ok ) {
				this.$toast.success( "Cleared " + result.data.messages + " messages in " + result.data.conversations + " conversations." );
			} else {
				this.$toast.error( result.error || "Could not clear the memory." );
			}
			await this.loadConvs();
		}
	};
}
