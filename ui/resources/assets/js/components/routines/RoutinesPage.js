import { openInChat } from "../../utils/chat.js";
import { seenText } from "../admin/GatewaysPage.js";

/**
 * The Routines page: scheduled work (GET /routines, everyone's with ?all=1 for an admin) and what can be done with a
 * routine (POST /routines/run, /pause, /resume, /delete), the editor (GET /routines/get, /routines/schedule; POST
 * /routines, /routines/update) and the reports (GET /routines/reports, /routines/report; POST /routines/reports/delete,
 * /routines/reports/clean).
 */

export const ROUTINE_STATES = {
	"ok"                    : { kind: "ok", icon: "check-circle" },
	"failed last time"      : { kind: "bad", icon: "warning-circle" },
	"paused after failures" : { kind: "bad", icon: "pause" },
	"paused"                : { kind: "", icon: "pause" },
	"not run yet"           : { kind: "", icon: "clock" },
	"running"               : { kind: "warn", icon: "circle-notch" },
	"waiting for approval"  : { kind: "warn", icon: "hand-palm" }
};

/**
 * @param {{ statusText: string }} routine A routine
 * @returns {boolean} True when it failed and someone should look
 */
export function needsAttention( routine ) {
	return routine.statusText === "failed last time" || routine.statusText === "paused after failures";
}

/**
 * @param {Array<object>} rows The routines
 * @returns {Array<{ kind: string, icon: string, text: string }>} The summary chips
 */
export function routineSummary( rows ) {
	const count = test => rows.filter( test ).length;
	return [
		{ kind: "", icon: "stack", text: rows.length + " routine" + ( rows.length === 1 ? "" : "s" ) },
		{ kind: "ok", icon: "check-circle", text: count( r => r.statusText === "ok" ) + " ok" },
		{ kind: "warn", icon: "hand-palm", text: count( r => r.statusText === "waiting for approval" ) + " waiting for approval" },
		{ kind: "bad", icon: "warning-circle", text: count( needsAttention ) + " needs attention" },
		{ kind: "", icon: "pause", text: count( r => !r.enabled ) + " paused" }
	];
}

/**
 * @param {object} r A routine
 * @returns {string} "Next run: ... Last run: ... Answers go to ..."
 */
export function routineLine( r ) {
	const destination = r.destination === "routine" ? "its own conversation" : r.destination + ( r.destinationChat ? " (chat " + r.destinationChat + ")" : "" );
	return "Next run: " + ( r.nextRunText || "none" ) + ". Last run: " + ( r.lastRunText ? r.lastRunText + ", " + r.lastStatus : "never" )
		+ ". Answers go to " + destination + ".";
}

/**
 * @returns {object} Alpine component state and actions
 */
export function routinesPage() {
	return {
		/** @type {boolean} True when the person is an admin (sees everyone's) */
		admin     : false,
		/** @type {boolean} True until the routines answered */
		loading   : true,
		/** @type {string} Why they could not be read */
		failed    : "",
		/** @type {Array<object>} The routines */
		rows      : [],
		/** @type {string} An owner to show only (admin) */
		owner     : "",
		/** @type {boolean} Only the routines that need attention (admin) */
		attention : false,
		/** @type {Array<object>} The gateways, for where an answer goes */
		gateways  : [],
		/** @type {object} The editor dialog */
		editor    : { open: false, ref: "", name: "", schedule: "", prompt: "", where: "routine", chat: "", chatTyped: "", reading: "", readingBad: false, error: "", saving: false },
		/** @type {object} The reports dialog */
		reports   : { open: false, ref: "", name: "", files: [], text: "", showing: false, days: 30, note: "" },

		/** @returns {string[]} The owners of the routines */
		get owners() {
			return [ ...new Set( this.rows.map( r => r.ownerId ).filter( Boolean ) ) ];
		},

		/** @returns {Array<object>} The routines that pass the filters */
		get shown() {
			return this.rows.filter( r => ( !this.owner || r.ownerId === this.owner ) && ( !this.attention || needsAttention( r ) ) );
		},

		/** @returns {Array<object>} The summary chips */
		get summary() {
			return routineSummary( this.rows );
		},

		/** @returns {Array<{ chatId: string, threadId?: string, lastSeen?: number }>} The chats of the gateway chosen */
		get chats() {
			const gateway = this.gateways.find( g => "gateway:" + g.type === this.editor.where );
			return ( gateway && gateway.chats ) || [];
		},

		/** Loads the routines once the capabilities are known. */
		async init() {
			await this.$store.session.loaded();
			this.admin = this.$store.session.can( "admin" );
			this.$watch( "editor.where", () => {
				this.editor.chat = this.chats.length === 1 ? String( this.chats[ 0 ].chatId ) : "";
			} );
			this.load();
		},

		/** Reads the routines. */
		async load() {
			const result = await this.$api.get( "/routines" + ( this.admin ? "?all=1" : "" ) );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = result.error || "Could not load the routines.";
				this.rows = [];
				return;
			}
			this.failed = "";
			this.rows = result.data.routines || [];
			if ( this.owner && !this.owners.includes( this.owner ) ) {
				this.owner = "";
			}
		},

		/** The chip of a routine's state */
		state( r ) {
			return ROUTINE_STATES[ r.statusText ] || { kind: "", icon: "clock" };
		},

		/** What a routine does next and did last */
		routineLine,

		/**
		 * @param {object} r A routine
		 * @returns {string} How the API names it: an admin uses its id for another owner's routine
		 */
		ref( r ) {
			return this.admin && r.ownerId ? r.id : r.name;
		},

		/**
		 * @param {object} r A routine
		 * @returns {boolean} True when it is another owner's, seen by an admin
		 */
		othersRoutine( r ) {
			return this.admin && !!r.ownerId;
		},

		/**
		 * Runs an action on a routine and says how it went.
		 *
		 * @param {string} path The route
		 * @param {object} r The routine
		 * @param {string} done What to say when it worked
		 */
		async act( path, r, done ) {
			const result = await this.$api.post( path, { name: this.ref( r ) } );
			if ( result.ok ) {
				this.$toast.success( done );
			} else {
				this.$toast.error( result.error || "That did not work." );
			}
			await this.load();
		},

		/** @param {object} r The routine */
		run( r ) {
			return this.act( "/routines/run", r, "Marked " + r.name + " due. It starts within a minute." );
		},

		/** @param {object} r The routine */
		pause( r ) {
			return this.act( "/routines/pause", r, "Paused " + r.name + "." );
		},

		/** @param {object} r The routine */
		resume( r ) {
			return this.act( "/routines/resume", r, "Resumed " + r.name + "." );
		},

		/** @param {object} r The routine */
		async remove( r ) {
			if ( await this.$confirm( { title: "Delete the routine " + r.name + "?", body: "Its reports are kept.", danger: true } ) ) {
				await this.act( "/routines/delete", r, "Deleted " + r.name + "." );
			}
		},

		/** @param {object} r The routine */
		openConversation( r ) {
			openInChat( this.$store.session.config.chatUrl, r.conversationId );
		},

		/**
		 * Opens the editor, empty for a new routine or filled from one.
		 *
		 * @param {object} [r] The routine to change
		 */
		async edit( r ) {
			this.editor = {
				open       : true,
				ref        : r ? this.ref( r ) : "",
				name       : r ? r.name : "",
				schedule   : r ? r.schedule : "",
				prompt     : "",
				where      : r && r.destination !== "routine" ? r.destination : "routine",
				chat       : r ? String( r.destinationChat || "" ) : "",
				chatTyped  : r ? String( r.destinationChat || "" ) : "",
				reading    : "",
				readingBad : false,
				error      : "",
				saving     : false
			};
			const keep = this.editor.chat;
			const [ full ] = await Promise.all( [
				r ? this.$api.get( "/routines/get?name=" + encodeURIComponent( this.editor.ref ) ) : Promise.resolve( null ),
				this.loadGateways()
			] );
			if ( full && full.ok && full.data.routine ) {
				this.editor.prompt = full.data.routine.prompt || "";
			}
			this.editor.chat = keep;
			if ( r ) {
				this.readSchedule();
			}
		},

		/** Reads the gateways an answer can go to, once. */
		async loadGateways() {
			if ( this.gateways.length || !this.$store.session.can( "gateways" ) ) {
				return;
			}
			const result = await this.$api.get( "/gateways" );
			this.gateways = result.ok ? result.data.gateways || [] : [];
		},

		/** Reads the schedule back in words, from the server, so a typo shows before saving. */
		async readSchedule() {
			const text = this.editor.schedule.trim();
			if ( !text ) {
				this.editor.reading = "";
				return;
			}
			const result = await this.$api.get( "/routines/schedule?schedule=" + encodeURIComponent( text ) );
			if ( text !== this.editor.schedule.trim() ) {
				return;
			}
			this.editor.readingBad = !result.ok;
			this.editor.reading = result.ok ? result.data.text + ", next run " + result.data.nextRunText : result.error || "That is not a schedule.";
		},

		/** @param {{ chatId: string, threadId?: string, lastSeen?: number }} c A chat */
		chatLabel( c ) {
			return "Chat " + c.chatId + ( c.threadId ? ", thread " + c.threadId : "" ) + ", last seen " + seenText( c.lastSeen );
		},

		/** Saves the routine in the editor. */
		async save() {
			const e = this.editor;
			const body = { name: e.ref || e.name.trim(), schedule: e.schedule.trim(), prompt: e.prompt, destination: e.where };
			if ( e.where !== "routine" ) {
				body.chat = this.chats.length ? e.chat : e.chatTyped.trim();
			}
			e.saving = true;
			e.error = "";
			const result = await this.$api.post( e.ref ? "/routines/update" : "/routines", body );
			e.saving = false;
			if ( !result.ok ) {
				e.error = result.error || "Could not save the routine.";
				return;
			}
			const saved = result.data.routine || {};
			e.open = false;
			this.$toast.success( "Saved " + ( saved.name || body.name ) + ": " + ( saved.scheduleText || "" ) + ( saved.nextRunText ? ", next run " + saved.nextRunText : "" ) + "." );
			await this.load();
		},

		/** @param {object} r The routine whose reports to show */
		async openReports( r ) {
			this.reports = { open: true, ref: this.ref( r ), name: r.name, files: [], text: "", showing: false, days: 30, note: "" };
			await this.loadReports();
		},

		/** Reads the reports of the routine shown. */
		async loadReports() {
			const result = await this.$api.get( "/routines/reports?name=" + encodeURIComponent( this.reports.ref ) );
			if ( !result.ok ) {
				this.reports.note = result.error || "Could not load the reports.";
				return;
			}
			this.reports.files = result.data.files || [];
		},

		/** @param {{ file: string }} f A report */
		async viewReport( f ) {
			const result = await this.$api.get( "/routines/report?name=" + encodeURIComponent( this.reports.ref ) + "&file=" + encodeURIComponent( f.file ) );
			this.reports.showing = true;
			this.reports.text = result.ok ? ( result.data.text || "" ) + ( result.data.cut ? "\n(cut: the file is longer)" : "" ) : result.error || "Could not read the report.";
		},

		/** @param {{ file: string }} f A report */
		async deleteReport( f ) {
			if ( !await this.$confirm( { title: "Delete the report " + f.file + "?", body: "This cannot be undone.", danger: true } ) ) {
				return;
			}
			const result = await this.$api.post( "/routines/reports/delete", { name: this.reports.ref, file: f.file } );
			this.reports.note = result.ok ? "Deleted " + f.file + "." : result.error || "Could not delete the report.";
			this.reports.showing = false;
			await this.loadReports();
		},

		/** Checks how many reports are older than the days given, and deletes them once the person agrees. */
		async cleanReports() {
			const days = parseInt( this.reports.days, 10 );
			if ( !( days >= 1 ) ) {
				this.reports.note = "Give a number of days, 1 or more.";
				return;
			}
			const dry = await this.$api.post( "/routines/reports/clean", { name: this.reports.ref, olderThanDays: days, apply: false } );
			if ( !dry.ok ) {
				this.reports.note = dry.error || "Could not check the reports.";
				return;
			}
			if ( !dry.data.count ) {
				this.reports.note = "Nothing is older than " + days + " days.";
				return;
			}
			const yes = await this.$confirm( {
				title  : "Delete " + this.$fmt.countLabel( dry.data.count, "report" ) + "?",
				body   : this.$fmt.bytesText( dry.data.bytes ) + ", older than " + days + " days. This cannot be undone.",
				danger : true
			} );
			if ( !yes ) {
				this.reports.note = "Nothing was deleted.";
				return;
			}
			const done = await this.$api.post( "/routines/reports/clean", { name: this.reports.ref, olderThanDays: days, apply: true } );
			this.reports.note = done.ok ? "Deleted " + this.$fmt.countLabel( done.data.count, "report" ) + "." : done.error || "Could not clean the reports.";
			this.reports.showing = false;
			await this.loadReports();
		}
	};
}
