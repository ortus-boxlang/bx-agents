import { keepInAddress } from "../../utils/address.js";

/**
 * The Connectors page: the services the agent can use for a person. The catalog connectors (GET /connectors) and the
 * services a developer wrote into Agent.yml (GET /connect, their own tab) are kept apart on purpose. A token is sent
 * once and cleared from the page at once; nothing here keeps it. Connect, the sign in and the tools drawer: POST
 * /connectors/connect, /connectors/disconnect, /connectors/tools, GET /connectors/tools, POST /connect, /connect/remove.
 */

export const CONNECTOR_STATES = {
	available         : { word: "Available", kind: "", icon: "plug" },
	connected         : { word: "Connected", kind: "ok", icon: "check-circle" },
	"needs_attention" : { word: "Needs attention", kind: "bad", icon: "warning-circle" },
	"needs_program"   : { word: "Needs a program", kind: "warn", icon: "warning" }
};
export const CONNECTOR_RISK = { low: "Low risk", medium: "Medium risk", high: "High risk" };
const WAYS = { bearer: { label: "Token", icon: "key" }, oauth: { label: "Sign in", icon: "user" } };

/**
 * @param {string} address An address a server answered
 * @returns {string} It, when it is a web address (http or https), else "": a sign in link is never run as script
 */
export function webAddress( address ) {
	return /^https?:\/\//i.test( String( address || "" ) ) ? address : "";
}

/**
 * @param {object} row A connector
 * @returns {Array<{ kind: string, icon: string, text: string }>} Its risk and how one connects
 */
export function connectorChips( row ) {
	const chips = [];
	if ( CONNECTOR_RISK[ row.risk ] ) {
		chips.push( { kind: row.risk === "high" ? "warn" : "", icon: "shield-check", text: CONNECTOR_RISK[ row.risk ] } );
	}
	if ( row.transport === "stdio" ) {
		chips.push( { kind: "", icon: "terminal-window", text: "Local program" } );
	} else {
		( row.ways || [] ).filter( w => WAYS[ w ] ).forEach( w => chips.push( { kind: "", icon: WAYS[ w ].icon, text: WAYS[ w ].label } ) );
	}
	return chips;
}

/**
 * @param {object} row A connector
 * @param {object} summary The summary of GET /connectors (byConnector: tools on per connector)
 * @param {boolean} admin True for an admin
 * @returns {string} Who connected it and how, or what is wrong
 */
export function connectorWho( row, summary, admin ) {
	const on = summary && summary.byConnector ? summary.byConnector[ row.id ] : undefined;
	const tools = on === undefined ? "" : " · " + on + ( on === 1 ? " tool on" : " tools on" );
	if ( row.state === "needs_attention" ) {
		return row.reason || "This connection needs your attention.";
	}
	if ( row.state === "needs_program" ) {
		return row.program + " is not on the PATH of the machine the agent runs on.";
	}
	if ( row.connectedWith === "token" ) {
		return "You connected with your own token" + tools;
	}
	if ( row.connectedWith === "oauth" ) {
		return "You signed in" + tools;
	}
	if ( row.connectedWith === "program" ) {
		return "Switched on for everyone who uses this agent" + tools;
	}
	if ( row.transport === "stdio" ) {
		return admin ? "Runs on the machine the agent runs on, in its folder." : "Not switched on. An admin switches it on for everyone who uses this agent.";
	}
	return "Not connected.";
}

/**
 * @param {object} row A connector
 * @param {boolean} admin True for an admin
 * @returns {{ install: boolean, connect: string, tools: boolean, disconnect: string }} What this person may do with it:
 *          connect and disconnect are the button's word, or "" for none. A local program is one process for everyone,
 *          so only an admin switches it on or off.
 */
export function connectorActions( row, admin ) {
	const program = row.transport === "stdio";
	const on = row.state === "connected" || row.state === "needs_attention";
	const memberOfProgram = program && !admin;
	if ( row.state === "needs_program" ) {
		return { install: !!row.docs, connect: "", tools: false, disconnect: "" };
	}
	return {
		install    : false,
		connect    : ( !on || row.state === "needs_attention" ) && !memberOfProgram ? ( row.state === "needs_attention" ? "Reconnect" : program ? "Switch on" : "Connect" ) : "",
		tools      : row.state === "connected",
		disconnect : on && !memberOfProgram ? ( program ? "Switch off" : "Disconnect" ) : ""
	};
}

/**
 * @param {Array<object>} rows The connectors
 * @param {string} tab all | connected | attention
 * @param {string} query A search
 * @returns {Array<object>} The connectors of that tab that match
 */
export function connectorRows( rows, tab, query ) {
	const term = String( query || "" ).trim().toLowerCase();
	return rows
		.filter( r => tab === "connected" ? r.state === "connected" : tab === "attention" ? r.state === "needs_attention" : true )
		.filter( r => !term || ( r.name + " " + ( r.summary || "" ) ).toLowerCase().includes( term ) );
}

/**
 * @returns {object} Alpine component state and actions
 */
export function connectorsPage() {
	return {
		/** @type {string} all | connected | attention | agent */
		tab     : "all",
		/** @type {string} A search */
		query   : "",
		/** @type {boolean} True when the person is an admin */
		admin   : false,
		/** @type {boolean} True until the connectors answered */
		loading : true,
		/** @type {string} Why they could not be read */
		failed  : "",
		/** @type {object|null} What GET /connectors answered */
		data    : null,
		/** @type {Array<object>|null} What GET /connect answered (services in Agent.yml), or null when not offered */
		servers : null,
		/** @type {{ url: string, name: string }} A sign in link to open, and what it is for */
		signIn  : { url: "", name: "" },
		/** @type {number|null} The timer that waits for a sign in */
		timer   : null,
		/** @type {object} The connect dialog */
		connect : { open: false, row: null, method: "", ways: [], token: "", options: [], values: {}, confirmed: false, error: "", busy: false, waiting: "" },
		/** @type {object} The tools drawer */
		toolsOf : { open: false, row: null, tools: [], query: "", error: "", loading: false, summary: {} },

		/** @returns {Array<object>} Every catalog connector */
		get rows() {
			return ( this.data && this.data.connectors ) || [];
		},

		/** @returns {Array<object>} The connectors of the open tab that match the search */
		get shown() {
			return connectorRows( this.rows, this.tab, this.query );
		},

		/** @returns {Array<object>} The tabs, with their counts */
		get tabs() {
			const tabs = [
				{ id: "all", label: "All", icon: "puzzle-piece", count: this.rows.length },
				{ id: "connected", label: "Connected", icon: "check-circle", count: connectorRows( this.rows, "connected", "" ).length },
				{ id: "attention", label: "Needs attention", icon: "warning-circle", count: connectorRows( this.rows, "attention", "" ).length }
			];
			if ( this.servers ) {
				tabs.push( { id: "agent", label: "In Agent.yml", icon: "file-text", count: this.servers.length } );
			}
			return tabs;
		},

		/** @returns {string} What an empty list says */
		get emptyText() {
			if ( this.query.trim() ) {
				return "No connector matches that.";
			}
			return { all: "This agent offers no connectors.", connected: "You have not connected any connector yet.", attention: "Nothing needs your attention." }[ this.tab ] || "";
		},

		/** @returns {Array<object>} The services in Agent.yml that match the search */
		get shownServers() {
			const term = this.query.trim().toLowerCase();
			return ( this.servers || [] ).filter( s => !term || s.name.toLowerCase().includes( term ) );
		},

		/** @returns {string} The catalog line of the banner */
		get policyText() {
			const policy = ( this.data && this.data.policy ) || {};
			const offered = policy.count || 0;
			return "Catalog: " + offered + " of " + ( offered + ( policy.excluded || [] ).length ) + " connectors available.";
		},

		/** @returns {string} Where the catalog is set, and what it leaves out */
		get policyDetail() {
			const left = ( ( this.data && this.data.policy ) || {} ).excluded || [];
			return "Set in Agent.yml under connectors:." + ( left.length ? " Left out: " + left.join( ", " ) + "." : "" );
		},

		/** @returns {object} How many tools are on, and the warning line */
		get summary() {
			return ( this.data && this.data.summary ) || {};
		},

		/** @returns {Array<object>} The tools of the drawer that match its search, by name */
		get shownTools() {
			const term = this.toolsOf.query.trim().toLowerCase();
			return this.toolsOf.tools.filter( t => !term || ( t.name + " " + ( t.description || "" ) ).toLowerCase().includes( term ) );
		},

		/** @returns {boolean} True when the server says which tools only read */
		get readOnlyKnown() {
			return this.toolsOf.tools.some( t => t.readOnly === true || t.readOnly === false );
		},

		/** Opens the tab from the address and loads. */
		async init() {
			const wanted = this.$el.dataset.tab;
			this.tab = [
				"all",
				"connected",
				"attention",
				"agent"
			].includes( wanted ) ? wanted : "all";
			this.$watch( "tab", tab => keepInAddress( this.$store.session.config.basePath + "/connectors/" + tab ) );
			// a dialog closed by Escape, its X or Cancel: stop waiting for a sign in; the drawer may have changed the counts
			this.$watch( "connect.open", open => open || this.stopWatching() );
			this.$watch( "toolsOf.open", open => open || this.load() );
			await this.$store.session.loaded();
			this.admin = this.$store.session.can( "admin" );
			await this.load();
			if ( this.tab === "agent" && !this.servers ) {
				this.tab = "all";
			}
		},

		/** Stops waiting for a sign in when the page leaves. */
		destroy() {
			this.stopWatching();
		},

		/** Reads the connectors and the services in Agent.yml. */
		async load() {
			const [
				connectors,
				servers
			] = await Promise.all( [
				this.$api.get( "/connectors" ),
				this.$store.session.can( "connections" ) ? this.$api.get( "/connect" ) : Promise.resolve( null )
			] );
			this.loading = false;
			if ( !connectors.ok ) {
				this.failed = "Could not load the connectors.";
				return;
			}
			this.failed = "";
			this.data = connectors.data;
			this.servers = servers && servers.ok ? servers.data.servers || [] : null;
		},

		/** The state chip of a connector */
		state( row ) {
			return CONNECTOR_STATES[ row.state ] || CONNECTOR_STATES.available;
		},

		/** The risk and way chips of a connector */
		connectorChips,

		/**
		 * @param {{ risk?: string }} row A connector
		 * @returns {string} "High risk." or ""
		 */
		riskText( row ) {
			return CONNECTOR_RISK[ row.risk ] ? CONNECTOR_RISK[ row.risk ] + "." : "";
		},

		/** @param {object} row A connector */
		who( row ) {
			return connectorWho( row, this.summary, this.admin );
		},

		/** @param {object} row A connector */
		actions( row ) {
			return connectorActions( row, this.admin );
		},

		/**
		 * Waits for a sign in: asks every two seconds, for three minutes at most.
		 *
		 * @param {Function} check True once it is done
		 * @param {Function} done Called when it is
		 * @param {Function} gaveUp Called when nobody came back in time
		 */
		watchUntil( check, done, gaveUp ) {
			this.stopWatching();
			let tries = 0;
			this.timer = setInterval( async() => {
				tries += 1;
				await this.load();
				if ( check() ) {
					this.stopWatching();
					done();
				} else if ( tries > 90 ) {
					this.stopWatching();
					gaveUp();
				}
			}, 2000 );
		},

		/** Stops waiting for a sign in. */
		stopWatching() {
			if ( this.timer ) {
				clearInterval( this.timer );
				this.timer = null;
			}
		},

		/**
		 * Opens the connect dialog: the risk, how to connect, the connector's options, then the token or the sign in.
		 *
		 * @param {object} row The connector
		 */
		openConnect( row ) {
			const program = row.transport === "stdio";
			const ways = program ? [ "program" ] : ( row.ways || [] ).map( w => w === "bearer" ? "token" : w );
			this.connect = { open: true, row, method: ways[ 0 ], ways, token: "", options: [], values: {}, confirmed: false, error: "", busy: false, waiting: "" };
			this.pickWay( ways[ 0 ] );
		},

		/**
		 * @param {string} method token | oauth | program
		 */
		pickWay( method ) {
			const row = this.connect.row;
			const wanted = method === "token" ? "bearer" : method;
			this.connect.method = method;
			this.connect.error = "";
			this.connect.options = method === "oauth" ? [] : ( row.options || [] ).filter( o => !o.onlyWith || o.onlyWith === wanted );
			const values = {};
			this.connect.options.forEach( o => {
				values[ o.key ] = o.type === "boolean" ? o.value === true || o.value === "true" : o.value === undefined || o.value === null ? "" : String( o.value );
			} );
			this.connect.values = values;
		},

		/** @returns {string} The title of the connect dialog */
		get connectTitle() {
			const row = this.connect.row;
			if ( !row ) {
				return "";
			}
			return ( row.state === "needs_attention" ? "Reconnect " : row.transport === "stdio" ? "Switch on " : "Connect " ) + row.name;
		},

		/** @returns {string} The word on the connect button */
		get connectWord() {
			const row = this.connect.row;
			if ( !row ) {
				return "";
			}
			return this.connect.method === "oauth" ? "Continue to " + row.host : row.transport === "stdio" ? "Switch on" : "Connect";
		},

		/** @returns {boolean} True when the person must say they read the risk first */
		get needsConfirm() {
			const row = this.connect.row;
			return !!row && ( row.risk === "medium" || row.risk === "high" );
		},

		/** Sends the connect: the token leaves the page with the request. A sign in opens on the service. */
		async submitConnect() {
			const c = this.connect;
			const row = c.row;
			if ( this.needsConfirm && !c.confirmed ) {
				c.error = "Tick the box to say you have read this.";
				return;
			}
			const asked = { id: row.id, method: c.method, confirm: c.confirmed };
			const options = {};
			c.options.forEach( o => {
				options[ o.key ] = o.type === "boolean" ? !!c.values[ o.key ] : String( c.values[ o.key ] || "" ).trim();
			} );
			if ( Object.keys( options ).length ) {
				asked.options = options;
			}
			if ( c.method === "token" ) {
				asked.token = c.token;
				// the token leaves the box at once: nothing on this page keeps it after this request
				c.token = "";
			}
			c.error = "";
			c.busy = true;
			const result = await this.$api.post( "/connectors/connect", asked );
			if ( !result.ok ) {
				c.busy = false;
				c.error = result.error || "Could not connect.";
				return;
			}
			const url = webAddress( result.data.authorizationUrl );
			if ( url ) {
				c.waiting = url;
				// a link as well as a new tab: a browser may refuse a tab that a script opens after a request
				window.open( url, "_blank", "noopener" );
				this.watchUntil(
					() => this.rows.some( r => r.id === row.id && r.state === "connected" ),
					() => {
						c.open = false;
						this.$toast.success( "Connected to " + row.name + "." );
					},
					() => {
						c.busy = false;
						c.error = "Nobody came back in time. Try again.";
					}
				);
				return;
			}
			c.open = false;
			c.busy = false;
			this.$toast.success( ( row.transport === "stdio" ? "Switched on " : "Connected to " ) + row.name + "." );
			await this.load();
		},

		/** @param {object} row The connector */
		async disconnect( row ) {
			const program = row.transport === "stdio";
			const result = await this.$api.post( "/connectors/disconnect", { id: row.id } );
			if ( result.ok ) {
				this.$toast.success( ( program ? "Switched off " : "Disconnected from " ) + row.name + "." );
			} else {
				this.$toast.error( result.error || "Could not disconnect." );
			}
			await this.load();
		},

		/**
		 * Opens the tools drawer: a switch per tool, kept for this person only. The admin's ceiling shows as a lock.
		 *
		 * @param {object} row The connector
		 */
		async openTools( row ) {
			this.toolsOf = { open: true, row, tools: [], query: "", error: "", loading: true, summary: this.summary };
			const result = await this.$api.get( "/connectors/tools?id=" + encodeURIComponent( row.id ) );
			this.toolsOf.loading = false;
			if ( !result.ok ) {
				this.toolsOf.error = "Could not list the tools of " + row.name + ".";
				return;
			}
			this.takeTools( result.data );
		},

		/**
		 * @param {{ tools?: Array<object>, summary?: object }} answer What the server answered
		 */
		takeTools( answer ) {
			// by name, so a tool is where the person looks for it whatever order the server listed them in
			this.toolsOf.tools = ( answer.tools || [] ).slice().sort( ( a, b ) => a.name.toLowerCase().localeCompare( b.name.toLowerCase() ) );
			this.toolsOf.summary = answer.summary || this.toolsOf.summary;
		},

		/** @returns {string} "Choose what the agent may use. 3 of 12 on." */
		get toolsIntro() {
			const on = this.toolsOf.tools.filter( t => t.on ).length;
			return "Choose what the agent may use. " + on + " of " + this.toolsOf.tools.length + " on. Your choice is kept for you.";
		},

		/**
		 * Changes the tools that are on.
		 *
		 * @param {object} change { tool, on } | { all } | { readonly }
		 */
		async changeTools( change ) {
			this.toolsOf.error = "";
			const result = await this.$api.post( "/connectors/tools", { ...change, id: this.toolsOf.row.id } );
			if ( !result.ok ) {
				this.toolsOf.error = result.error || "Could not change the tools.";
				return;
			}
			this.takeTools( result.data );
		},

		/**
		 * Starts the sign in to a service written in Agent.yml.
		 *
		 * @param {{ name: string }} server The service
		 */
		async connectServer( server ) {
			const result = await this.$api.post( "/connect", { name: server.name } );
			const url = result.ok ? webAddress( result.data.authorizationUrl ) : "";
			if ( !url ) {
				this.$toast.error( result.error || "Could not start the sign in." );
				return;
			}
			this.signIn = { url, name: server.name };
			window.open( url, "_blank", "noopener" );
			this.watchUntil(
				() => ( this.servers || [] ).some( s => s.name === server.name && s.connected ),
				() => {
					this.signIn = { url: "", name: "" };
					this.$toast.success( "Connected to " + server.name + "." );
				},
				() => {
					this.signIn = { url: "", name: "" };
					this.$toast.error( "Nobody came back in time. Try again." );
				}
			);
		},

		/** @param {{ name: string }} server The service */
		async disconnectServer( server ) {
			this.stopWatching();
			const result = await this.$api.post( "/connect/remove", { name: server.name } );
			if ( result.ok ) {
				this.$toast.success( "Disconnected from " + server.name + "." );
			} else {
				this.$toast.error( result.error || "Could not disconnect." );
			}
			await this.load();
		}
	};
}
