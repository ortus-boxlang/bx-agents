import { keepInAddress } from "../../utils/address.js";
import { talkTo } from "../../utils/chat.js";

/**
 * The Agent page (admin): how the agent is put together (GET /agent/composition), its files read only (GET
 * /agent/files, /agent/file) and its usage (GET /usage?days=). The tab comes from the address (data-tab).
 */

export const MOTION_KEY = "bxagents.motion";

/**
 * @returns {object} Alpine component state and actions
 */
export function agentPage() {
	return {
		/** @type {string} composition | files | usage */
		tab     : "composition",
		/** @type {Object<string, boolean>} True for each tab that has loaded */
		loaded  : {},
		/** @type {string} Why the open tab could not be read */
		failed  : "",
		/** @type {boolean} True when the moving lines are stopped (kept in this browser) */
		still   : false,
		/** @type {object|null} What GET /agent/composition answered */
		comp    : null,
		/** @type {Array<{ path: string, size: number }>} The project's files */
		files   : [],
		/** @type {{ path: string, text: string } | null} The file being read */
		viewing : null,
		/** @type {string} The usage period, in days */
		days    : "30",
		/** @type {object|null} What GET /usage answered */
		usage   : null,

		/** Opens the tab from the address and loads it. */
		init() {
			const wanted = this.$el.dataset.tab;
			this.tab = [
				"composition",
				"files",
				"usage"
			].includes( wanted ) ? wanted : "composition";
			try {
				this.still = localStorage.getItem( MOTION_KEY ) === "off";
			} catch {
				this.still = false;
			}
			this.$watch( "still", still => {
				try {
					localStorage.setItem( MOTION_KEY, still ? "off" : "on" );
				} catch {
					// not remembered
				}
			} );
			this.$watch( "tab", tab => {
				keepInAddress( this.$store.session.config.basePath + "/agent/" + tab );
				this.load();
			} );
			this.$watch( "days", () => this.loadUsage() );
			this.load();
		},

		/** Loads the open tab, once. */
		async load() {
			if ( this.loaded[ this.tab ] ) {
				return;
			}
			this.failed = "";
			const tab = this.tab;
			if ( tab === "composition" ) {
				const result = await this.$api.get( "/agent/composition" );
				this.failed = result.ok ? "" : result.error || "Could not load the composition.";
				this.comp = result.ok ? result.data : null;
			} else if ( tab === "files" ) {
				const result = await this.$api.get( "/agent/files" );
				this.failed = result.ok ? "" : result.error || "Could not load the files.";
				this.files = result.ok ? result.data.files || [] : [];
			} else {
				await this.loadUsage();
			}
			this.loaded[ tab ] = true;
		},

		/**
		 * @param {string} state A gateway's state
		 * @returns {{ kind: string, icon: string, label: string }} Its chip
		 */
		stateChip( state ) {
			return state === "on" ? { kind: "ok", icon: "check-circle", label: "On" } : { kind: "warn", icon: "pause", label: String( state ) };
		},

		/**
		 * Starts a conversation with a sub-agent and opens it in the chat.
		 *
		 * @param {{ name: string }} agent The sub-agent
		 */
		async talkTo( agent ) {
			if ( !await talkTo( this.$api, this.$store.session.config.chatUrl, agent.name ) ) {
				this.$toast.error( "Could not start a conversation with " + agent.name + "." );
			}
		},

		/**
		 * @param {{ path: string }} file A file
		 */
		async read( file ) {
			this.viewing = { path: file.path, text: "Loading..." };
			const result = await this.$api.get( "/agent/file?path=" + encodeURIComponent( file.path ) );
			this.viewing.text = result.ok
				? ( result.data.text || "" ) + ( result.data.truncated ? "\n(cut: the file is longer)" : "" )
				: result.error || "Could not read that file.";
		},

		/** Reads the usage of the period. */
		async loadUsage() {
			const result = await this.$api.get( "/usage?days=" + encodeURIComponent( this.days ) );
			this.failed = result.ok ? "" : result.error || "Could not load the usage.";
			this.usage = result.ok ? result.data : null;
		}
	};
}
