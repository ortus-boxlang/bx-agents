import { keepInAddress } from "../../utils/address.js";

/**
 * The Logs page (admin): one tab per area (GET /logs), the lines of one (GET /logs?area&tail&level&q), a level filter, a
 * search and a refresh every 5 seconds when asked. The area and a search to start with come from the address
 * (data-area and data-query, set by the Logs handler), so the Gateways page can link to its log.
 *
 * The agent API has no stream for logs, so the refresh polls; see the plan for a live channel.
 *
 * @returns {object} Alpine component state and actions
 */
export const LOG_AREAS = [
	{ id: "agent", label: "Agent" },
	{ id: "gateways", label: "Gateways" },
	{ id: "routines", label: "Routines" },
	{ id: "heartbeat", label: "Heartbeat" },
	{ id: "api", label: "API" }
];

/**
 * @param {{ level: string }} line A log line
 * @returns {{ kind: string, icon: string }} The chip of its level
 */
export function levelChip( line ) {
	if ( line.level === "error" ) {
		return { kind: "bad", icon: "warning-circle" };
	}
	if ( line.level === "warn" ) {
		return { kind: "warn", icon: "warning" };
	}
	return { kind: "", icon: "info" };
}

/**
 * @returns {object} Alpine component state and actions
 */
export function logsPage() {
	return {
		/** @type {string} The open area */
		area    : "agent",
		/** @type {string[]} The areas that have a log */
		present : [],
		/** @type {Object<string, number>} Errors per area */
		errors  : {},
		/** @type {string} "" | warn | error */
		level   : "",
		/** @type {string} A search in the lines */
		query   : "",
		/** @type {string} How many lines from the end */
		tail    : "200",
		/** @type {boolean} True while the page refreshes itself every 5 seconds */
		auto    : false,
		/** @type {Array<{ time: string, level: string, subject: string, message: string }>} The lines */
		lines   : [],
		/** @type {boolean} True until the first lines answered */
		loading : true,
		/** @type {string} Why the lines could not be read */
		failed  : "",
		/** @type {number|null} The refresh timer */
		timer   : null,

		/** @returns {Array<{ id: string, label: string }>} The tabs: the areas with a log, and the open one */
		get tabs() {
			return LOG_AREAS.filter( a => this.present.includes( a.id ) || a.id === this.area );
		},

		/** Reads the area and search from the address, loads, and reloads when a filter changes. */
		init() {
			const wanted = this.$el.dataset.area || "agent";
			this.area = LOG_AREAS.some( a => a.id === wanted ) ? wanted : "agent";
			this.query = this.$el.dataset.query || "";
			this.refresh();
			this.$watch( "level", () => this.loadLines() );
			this.$watch( "tail", () => this.loadLines() );
			this.$watch( "query", () => this.loadLines() );
			this.$watch( "auto", on => {
				this.stop();
				if ( on ) {
					this.timer = setInterval( () => this.refresh(), 5000 );
				}
			} );
		},

		/** Stops the refresh when the page leaves. */
		destroy() {
			this.stop();
		},

		/** Stops the refresh. */
		stop() {
			if ( this.timer ) {
				clearInterval( this.timer );
				this.timer = null;
			}
		},

		/**
		 * Opens another area and keeps it in the address, so a reload or a shared link opens it again.
		 *
		 * @param {string} id The area
		 */
		open( id ) {
			this.area = id;
			keepInAddress( this.$store.session.config.basePath + "/logs/" + id );
			this.loadLines();
		},

		/** Reloads the tabs and the lines. */
		async refresh() {
			await this.loadTabs();
			await this.loadLines();
		},

		/** Reads which areas have a log and how many errors each has. */
		async loadTabs() {
			const result = await this.$api.get( "/logs" );
			if ( result.ok ) {
				this.present = ( result.data.logs || [] ).map( log => log.area );
				this.errors = result.data.errors || {};
			}
		},

		/** Reads the lines of the open area with the filters. */
		async loadLines() {
			const q = this.query.trim();
			const path = "/logs?area=" + encodeURIComponent( this.area ) + "&tail=" + encodeURIComponent( this.tail )
				+ ( this.level ? "&level=" + encodeURIComponent( this.level ) : "" )
				+ ( q ? "&q=" + encodeURIComponent( q ) : "" );
			const result = await this.$api.get( path );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = "Could not load the log.";
				this.lines = [];
				return;
			}
			this.failed = "";
			this.lines = result.data.lines || [];
			this.$nextTick( () => {
				const box = this.$refs.box;
				if ( box ) {
					box.scrollTop = box.scrollHeight;
				}
			} );
		},

		/**
		 * @param {string} id An area
		 * @returns {string} "3 errors", or "" when it has none
		 */
		errorText( id ) {
			const n = this.errors[ id ] || 0;
			return n ? this.$fmt.countLabel( n, "error" ) : "";
		},

		/** The chip of a line's level */
		levelChip,

		/**
		 * @param {{ time: string }} line A log line
		 * @returns {string} Its time of day
		 */
		timeText( line ) {
			return line.time ? String( line.time ).slice( 11, 19 ) : "";
		}
	};
}
