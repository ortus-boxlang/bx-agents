	// ---- Page: Connectors. The services the agent can use for you; each person connects with their own token or sign in ----
	// Two kinds are kept apart on purpose. The catalog connectors (GitHub, Stripe, ...) ship with BX Agents and come from
	// GET /connectors. The services a developer wrote into Agent.yaml (mcpServers with oauth) come from GET /connect and
	// have their own tab. The page never sees a token after sending it: a token field is emptied before the request goes.
	var CONNECTOR_STATES = {
		available: { word: "Available", chip: "", icon: "plug" },
		connected: { word: "Connected", chip: "ok", icon: "check-circle" },
		needs_attention: { word: "Needs attention", chip: "bad", icon: "warning-circle" },
		needs_program: { word: "Needs a program", chip: "warn", icon: "warning" }
	};
	var CONNECTOR_RISK = { low: "Low risk", medium: "Medium risk", high: "High risk" };
	var CONNECTOR_WAYS = { bearer: [ "Token", "key" ], oauth: [ "Sign in", "user" ] };

	registerPage( {
		id: "connectors",
		title: "Connectors",
		icon: "puzzle-piece",
		group: "main",
		order: 45,
		cap: function ( caps ) { return !!( caps.connectors || caps.connections ); },
		render: function ( host, route ) {
			var tab = [ "all", "connected", "attention", "agent" ].indexOf( route.sub ) >= 0 ? route.sub : "all";
			var search = h( "input", { type: "search", placeholder: "Search the connectors", "aria-label": "Search the connectors" } );
			var root = pageFrame( host, "Connectors", "Services the agent can use for you. Nothing is active until you connect it, and the agent acts as you.", [ search ] );
			var tabsHost = h( "div" );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite", hidden: true } );
			var banner = h( "div" );
			var body = h( "div" );
			[ tabsHost, status, banner, body ].forEach( function ( node ) { root.appendChild( node ); } );
			var data = null;
			var servers = null;

			function say( text ) { status.textContent = text || ""; status.hidden = !text; }

			function rowsFor( which ) {
				var all = ( data && data.connectors ) || [];
				if ( which === "connected" ) { return all.filter( function ( r ) { return r.state === "connected"; } ); }
				if ( which === "attention" ) { return all.filter( function ( r ) { return r.state === "needs_attention"; } ); }
				return all;
			}

			function drawTabs() {
				var counts = { all: rowsFor( "all" ).length, connected: rowsFor( "connected" ).length, attention: rowsFor( "attention" ).length };
				var tabs = [
					{ id: "all", title: "All " + counts.all, icon: "puzzle-piece" },
					{ id: "connected", title: "Connected " + counts.connected, icon: "check-circle" },
					{ id: "attention", title: "Needs attention " + counts.attention, icon: "warning-circle" }
				];
				if ( servers ) { tabs.push( { id: "agent", title: "In Agent.yaml " + servers.length, icon: "file-text" } ); }
				tabsHost.textContent = "";
				tabsHost.appendChild( pageTabs( "connectors", tabs, tab ) );
			}

			// What the catalog allows here, and how many tools the person has on across everything they connected
			function drawBanner() {
				banner.textContent = "";
				if ( tab === "agent" || !data ) { return; }
				var policy = data.policy || {};
				var summary = data.summary || {};
				var offered = policy.count || 0;
				var left = ( policy.excluded || [] ).length;
				var lines = [ h( "strong", { text: "Catalog: " + offered + " of " + ( offered + left ) + " connectors available." } ) ];
				var detail = "Set in Agent.yaml under connectors:." + ( left ? " Left out: " + policy.excluded.join( ", " ) + "." : "" );
				lines.push( h( "div", { class: "pg-note", style: "margin:0", text: detail } ) );
				var over = !!summary.over;
				banner.appendChild( h( "div", { class: "card conn-banner" }, [
					h( "span", { html: icon( "sliders-horizontal" ) } ),
					h( "div", { class: "conn-banner-text" }, lines ),
					summary.toolsOn !== undefined ? h( "span", { class: "chip " + ( over ? "warn" : "" ) }, [
						over ? h( "span", { html: icon( "warning" ) } ) : null, summary.toolsOn + " tools on" ] ) : null,
					over ? h( "span", { class: "pg-note", style: "margin:0", text: "Models answer better with fewer than " + summary.toolWarning + "." } ) : null
				] ) );
			}

			function wayChips( row ) {
				var chips = [];
				if ( CONNECTOR_RISK[ row.risk ] ) {
					chips.push( h( "span", { class: "chip " + ( row.risk === "high" ? "warn" : "" ) }, [ h( "span", { html: icon( "shield-check" ) } ), CONNECTOR_RISK[ row.risk ] ] ) );
				}
				if ( row.transport === "stdio" ) {
					chips.push( h( "span", { class: "chip" }, [ h( "span", { html: icon( "terminal-window" ) } ), "Local program" ] ) );
				} else {
					( row.ways || [] ).forEach( function ( way ) {
						if ( CONNECTOR_WAYS[ way ] ) { chips.push( h( "span", { class: "chip" }, [ h( "span", { html: icon( CONNECTOR_WAYS[ way ][ 1 ] ) } ), CONNECTOR_WAYS[ way ][ 0 ] ] ) ); }
					} );
				}
				return chips;
			}

			function whoLine( row ) {
				var on = data.summary && data.summary.byConnector ? data.summary.byConnector[ row.id ] : undefined;
				var tools = on === undefined ? "" : " · " + on + ( on === 1 ? " tool on" : " tools on" );
				if ( row.state === "needs_attention" ) { return row.reason || "This connection needs your attention."; }
				if ( row.state === "needs_program" ) { return row.program + " is not on the PATH of the machine the agent runs on."; }
				if ( row.connectedWith === "token" ) { return "You connected with your own token" + tools; }
				if ( row.connectedWith === "oauth" ) { return "You signed in" + tools; }
				if ( row.connectedWith === "program" ) { return "Switched on for everyone who uses this agent" + tools; }
				return row.transport === "stdio" ? "Runs on the machine the agent runs on, in its folder." : "Not connected.";
			}

			function card( row ) {
				var state = CONNECTOR_STATES[ row.state ] || CONNECTOR_STATES.available;
				return h( "article", { class: "card conn-card", "aria-labelledby": "conn-" + row.id }, [
					h( "div", { class: "conn-head" }, [
						h( "span", { class: "conn-icon", html: icon( row.icon || "puzzle-piece" ) } ),
						h( "h2", { id: "conn-" + row.id, text: row.name } ),
						h( "span", { class: "chip " + state.chip }, [ h( "span", { html: icon( state.icon ) } ), state.word ] )
					] ),
					h( "p", { class: "conn-summary", text: row.summary || "" } ),
					h( "div", { class: "conn-chips" }, wayChips( row ) ),
					h( "p", { class: "pg-note conn-line", text: whoLine( row ) } ),
					h( "div", { class: "pg-actions conn-actions", "data-for": row.id } )
				] );
			}

			function drawCards() {
				body.textContent = "";
				var term = search.value.trim().toLowerCase();
				var rows = rowsFor( tab ).filter( function ( r ) { return !term || ( r.name + " " + ( r.summary || "" ) ).toLowerCase().indexOf( term ) >= 0; } );
				if ( !rows.length ) {
					var empty = { all: "This agent offers no connectors.", connected: "You have not connected any connector yet.", attention: "Nothing needs your attention." };
					body.appendChild( pageNote( term ? "No connector matches that." : empty[ tab ] ) );
					return;
				}
				var grid = h( "div", { class: "grid conn-grid" } );
				rows.forEach( function ( row ) { grid.appendChild( card( row ) ); } );
				body.appendChild( grid );
			}

			// The services written into Agent.yaml: a different list, with the sign in the agent's developer chose
			function drawAgentServers() {
				body.textContent = "";
				var term = search.value.trim().toLowerCase();
				var rows = ( servers || [] ).filter( function ( s ) { return !term || s.name.toLowerCase().indexOf( term ) >= 0; } );
				body.appendChild( h( "p", { class: "pg-note", text: "Services the agent's developer wrote into Agent.yaml under mcpServers, each with a sign in. You sign in once for each. The agent then acts as you." } ) );
				if ( !rows.length ) {
					body.appendChild( pageNote( term ? "No service matches that." : "No service asks you to sign in." ) );
					return;
				}
				var list = h( "ul", { "aria-label": "Services in Agent.yaml", style: "list-style:none;margin:0;padding:0" } );
				rows.forEach( function ( s ) {
					var chip = s.connected ? h( "span", { class: "chip ok" }, [ h( "span", { html: icon( "check-circle" ) } ), "Connected" ] ) : h( "span", { class: "chip" }, [ h( "span", { html: icon( "plug" ) } ), "Not connected" ] );
					list.appendChild( h( "li", { class: "card conn-server", "data-name": s.name }, [
						h( "div", { class: "conn-head" }, [
							h( "span", { class: "conn-icon", html: icon( "file-text" ) } ),
							h( "div", { class: "conn-server-text" }, [
								h( "h2", { text: s.name } ),
								h( "p", { class: "pg-note", style: "margin:0", text: s.url + ( s.scope ? " (scope: " + s.scope + ")" : "" ) } )
							] ),
							chip
						] ),
						s.problem ? h( "p", { class: "pg-error", role: "alert", text: s.problem } ) : null,
						h( "div", { class: "pg-actions conn-actions", "data-for": s.name } )
					] ) );
				} );
				body.appendChild( list );
			}

			function draw() {
				drawTabs();
				drawBanner();
				if ( tab === "agent" ) { drawAgentServers(); } else { drawCards(); }
			}

			function load() {
				var asked = [ apiGet( "/connectors" ) ];
				if ( capabilities.connections ) { asked.push( apiGet( "/connect" ) ); }
				return Promise.all( asked ).then( function ( got ) {
					if ( route.stale() ) { return; }
					if ( !got[ 0 ] || !got[ 0 ].success ) {
						body.textContent = "";
						body.appendChild( pageNote( "Could not load the connectors.", "error" ) );
						return;
					}
					data = got[ 0 ];
					servers = got[ 1 ] && got[ 1 ].success ? ( got[ 1 ].servers || [] ) : null;
					draw();
				} );
			}

			search.addEventListener( "input", function () { if ( data ) { draw(); } } );
			load();
		}
	} );
