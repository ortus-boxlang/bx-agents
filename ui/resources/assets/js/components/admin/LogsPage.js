import { keepInAddress } from "../../utils/address.js";

/**
 * The Logs page (admin): one tab per area (GET /logs), the lines of one (GET /logs?area&tail&level&q), a level filter, a
 * search, and Live: the new lines as they are written (GET /logs/stream, lines and reset events). The area and a search
 * to start with come from the address (data-area and data-query, set by the Logs handler), so the Gateways page can
 * link to its log.
 *
 * Live reopens the stream when it ends (the server closes it after ten minutes) or drops, waiting a little longer each
 * time it fails. A server without the stream (404) is read every 5 seconds instead.
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
 * Adds new lines after the ones shown, keeping only the last `cap`.
 *
 * @param {Array<object>} shown The lines on the page
 * @param {Array<object>} added The new lines, oldest first
 * @param {number} cap How many lines to keep at most
 * @returns {Array<object>} The lines to show
 */
export function appendLines( shown, added, cap ) {
	const all = shown.concat( added || [] );
	return all.length > cap ? all.slice( all.length - cap ) : all;
}

/**
 * @param {number} failures How many times in a row the stream failed
 * @returns {number} How long to wait before opening it again, in ms: 1 s, then doubling, at most 30 s
 */
export function reconnectDelay( failures ) {
	return Math.min( 30000, 1000 * 2 ** Math.max( 0, failures ) );
}

/**
 * @param {HTMLElement|undefined} box The scrolling box
 * @returns {boolean} True when it shows its end, so new lines should keep it there
 */
export function atBottom( box ) {
	return !box || box.scrollTop + box.clientHeight >= box.scrollHeight - 24;
}

/**
 * @returns {object} Alpine component state and actions
 */
export function logsPage() {
	return {
		/** @type {string} The open area */
		area       : "agent",
		/** @type {string[]} The areas that have a log */
		present    : [],
		/** @type {Object<string, number>} Errors per area */
		errors     : {},
		/** @type {string} "" | warn | error */
		level      : "",
		/** @type {string} A search in the lines */
		query      : "",
		/** @type {string} How many lines from the end */
		tail       : "200",
		/** @type {boolean} True while the page shows new lines as they are written */
		live       : false,
		/** @type {string} "" | connecting | live | polling | retrying: what Live is doing, for the status line */
		liveState  : "",
		/** @type {Array<{ time: string, level: string, subject: string, message: string }>} The lines */
		lines      : [],
		/** @type {boolean} True until the first lines answered */
		loading    : true,
		/** @type {string} Why the lines could not be read */
		failed     : "",
		/** @type {number|null} The polling timer, on a server without the stream */
		timer      : null,
		/** @type {AbortController|null} The open stream */
		stream     : null,
		/** @type {number|null} The timer that reopens the stream */
		retry      : null,
		/** @type {number} How many times in a row the stream failed */
		failures   : 0,
		/** @type {number} Bumped whenever the stream is replaced, so a stale one's end is ignored */
		generation : 0,

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
			this.$watch( "level", () => this.reload() );
			this.$watch( "tail", () => this.reload() );
			this.$watch( "query", () => this.reload() );
			this.$watch( "live", on => {
				this.stop();
				if ( on ) {
					this.failures = 0;
					this.follow();
				}
			} );
		},

		/** Stops following when the page leaves. */
		destroy() {
			this.stop();
		},

		/** Stops the stream, its reopening and the polling. */
		stop() {
			this.generation++;
			if ( this.stream ) {
				this.stream.abort();
				this.stream = null;
			}
			clearTimeout( this.retry );
			this.retry = null;
			if ( this.timer ) {
				clearInterval( this.timer );
				this.timer = null;
			}
			this.liveState = "";
		},

		/** Reads the lines again for the new filters, and follows them with the same filters when Live is on. */
		async reload() {
			this.stop();
			await this.loadLines();
			if ( this.live ) {
				this.follow();
			}
		},

		/** Opens the stream of the open area with the filters, and reopens it when it ends. */
		async follow() {
			const generation = ++this.generation;
			const controller = new AbortController();
			this.stream = controller;
			this.liveState = this.failures ? "retrying" : "connecting";
			const q = this.query.trim();
			const path = "/logs/stream?area=" + encodeURIComponent( this.area )
				+ ( this.level ? "&level=" + encodeURIComponent( this.level ) : "" )
				+ ( q ? "&q=" + encodeURIComponent( q ) : "" );
			const result = await this.$sse( path, {
				signal  : controller.signal,
				onEvent : ( name, data ) => this.onStreamEvent( generation, name, data )
			} );
			if ( generation !== this.generation || !this.live ) {
				return;
			}
			this.stream = null;
			if ( result.status === 404 ) {
				// a server from before the stream: read the log every 5 seconds instead
				this.liveState = "polling";
				this.timer = setInterval( () => this.refresh(), 5000 );
				return;
			}
			this.failures = result.ok ? 0 : this.failures + 1;
			this.liveState = result.ok ? "connecting" : "retrying";
			this.retry = setTimeout( () => {
				// what was written while the stream was closed
				this.loadLines().then( () => this.live && generation === this.generation && this.follow() );
			}, result.ok ? 0 : reconnectDelay( this.failures - 1 ) );
		},

		/**
		 * One event of the stream: new lines go after the shown ones, a reset reads the log again.
		 *
		 * @param {number} generation The stream it came from
		 * @param {string} name The event
		 * @param {any} data Its data
		 */
		onStreamEvent( generation, name, data ) {
			if ( generation !== this.generation ) {
				return;
			}
			this.liveState = "live";
			this.failures = 0;
			if ( name === "reset" ) {
				this.loadLines();
				return;
			}
			if ( name !== "lines" || !data || !Array.isArray( data.lines ) || !data.lines.length ) {
				return;
			}
			const box = this.$refs.box;
			const stick = atBottom( box );
			this.lines = appendLines( this.lines, data.lines, Number( this.tail ) || 200 );
			if ( data.lines.some( line => line.level === "error" ) ) {
				this.loadTabs();
			}
			if ( stick ) {
				this.$nextTick( () => box && ( box.scrollTop = box.scrollHeight ) );
			}
		},

		/** @returns {string} What Live is doing, for the status line */
		get liveText() {
			return {
				connecting : "Connecting to the live log...",
				live       : "Live: new lines appear as they are written.",
				retrying   : "The live log dropped. Trying again...",
				polling    : "This server has no live log; reading it every 5 seconds."
			}[ this.liveState ] || "";
		},

		/**
		 * Opens another area and keeps it in the address, so a reload or a shared link opens it again.
		 *
		 * @param {string} id The area
		 */
		open( id ) {
			this.area = id;
			keepInAddress( this.$store.session.config.basePath + "/logs/" + id );
			this.reload();
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
