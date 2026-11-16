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
			var timer = null;
			var openDialog = null;

			function say( text ) { status.textContent = text || ""; status.hidden = !text; }
			function stopWatching() { if ( timer ) { clearInterval( timer ); timer = null; } }
			function failedText( res, fallback ) {
				return res.json().then( function ( parsed ) { return ( parsed && ( parsed.reason || parsed.error ) ) || fallback; } ).catch( function () { return fallback; } );
			}

			// Asks every two seconds until what the person is signing in to shows as connected, for three minutes at most
			function watchUntil( check, done, gaveUp ) {
				stopWatching();
				var tries = 0;
				timer = setInterval( function () {
					tries += 1;
					reloadQuietly().then( function () {
						if ( check() ) { stopWatching(); done(); } else if ( tries > 90 ) { stopWatching(); gaveUp(); }
					} );
				}, 2000 );
			}

			function reloadQuietly() {
				var asked = [ apiGet( "/connectors" ) ];
				if ( capabilities.connections ) { asked.push( apiGet( "/connect" ) ); }
				return Promise.all( asked ).then( function ( got ) {
					if ( route.stale() ) { return; }
					if ( got[ 0 ] && got[ 0 ].success ) { data = got[ 0 ]; }
					if ( got[ 1 ] && got[ 1 ].success ) { servers = got[ 1 ].servers || []; }
					draw();
				} );
			}

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
					h( "div", { class: "pg-actions conn-actions" }, actionsFor( row ) )
				] );
			}

			function actionsFor( row ) {
				var on = row.state === "connected" || row.state === "needs_attention";
				var program = row.transport === "stdio";
				var list = [];
				if ( row.state === "needs_program" ) {
					if ( row.docs ) { list.push( h( "a", { class: "btn", href: row.docs, target: "_blank", rel: "noopener" }, [ h( "span", { html: icon( "arrow-square-out" ) } ), h( "span", { text: "How to install " + row.program } ) ] ) ); }
					return list;
				}
				if ( !on || row.state === "needs_attention" ) {
					var word = row.state === "needs_attention" ? "Reconnect" : ( program ? "Switch on" : "Connect" );
					list.push( btn( row.state === "needs_attention" ? "arrows-clockwise" : "plug", word, function () { openConnect( row ); }, "primary", { "aria-label": word + " " + row.name } ) );
				}
				if ( row.state === "connected" ) {
					list.push( btn( "wrench", "Tools", function () { openTools( row ); }, null, { "aria-label": "Tools of " + row.name } ) );
				}
				if ( on ) {
					list.push( btn( "x", program ? "Switch off" : "Disconnect", function () { disconnect( row ); }, null, { "aria-label": ( program ? "Switch off " : "Disconnect " ) + row.name } ) );
				}
				return list;
			}

			function disconnect( row ) {
				say( "" );
				apiPost( "/connectors/disconnect", { id: row.id } ).then( function ( res ) {
					if ( res.ok ) { say( ( row.transport === "stdio" ? "Switched off " : "Disconnected from " ) + row.name + "." ); return reloadQuietly(); }
					return failedText( res, "Could not disconnect." ).then( say );
				} ).catch( function () { say( "Could not disconnect." ); } );
			}

			// ---- The connect dialog: risk, how, the connector's own options, then the token or the sign in ----
			function openConnect( row ) {
				var program = row.transport === "stdio";
				var ways = program ? [ "program" ] : ( row.ways || [] ).map( function ( w ) { return w === "bearer" ? "token" : w; } );
				var method = ways[ 0 ];
				var dlg = h( "dialog", { class: "conn-dialog", "aria-labelledby": "cd-title" } );
				var errorLine = h( "p", { class: "pg-error", role: "alert", hidden: true } );
				var waiting = h( "p", { class: "pg-note", role: "status", "aria-live": "polite", hidden: true } );
				var body = h( "div", { class: "conn-dialog-body" } );
				var submit = btn( "plug", "Connect", null, "primary", { type: "submit" } );
				var confirmBox = null;
				var tokenInput = null;
				var fields = {};

				function close() { stopWatching(); dlg.close(); }
				function fail( text ) { errorLine.hidden = !text; errorLine.textContent = text || ""; }

				var risk = null;
				if ( row.risk === "medium" || row.risk === "high" ) {
					confirmBox = h( "input", { type: "checkbox", id: "cd-confirm" } );
					risk = h( "div", { class: "conn-risk " + row.risk }, [
						h( "p", { style: "margin:0" }, [ h( "span", { html: icon( "shield-check" ) } ), h( "strong", { text: " " + CONNECTOR_RISK[ row.risk ] + ". " } ), row.riskNote || "" ] ),
						h( "label", { for: "cd-confirm", class: "conn-confirm" }, [ confirmBox, " I have read this and want to connect " + row.name + "." ] )
					] );
				}

				function optionFields() {
					var wanted = method === "token" ? "bearer" : method;
					var shown = method === "oauth" ? [] : ( row.options || [] ).filter( function ( o ) { return !o.onlyWith || o.onlyWith === wanted; } );
					fields = {};
					var nodes = [];
					shown.forEach( function ( o ) {
						var id = "cd-opt-" + o.key;
						var input = o.type === "boolean"
							? h( "input", { type: "checkbox", id: id, checked: o.value === true || o.value === "true" ? true : null } )
							: h( "input", { type: "text", id: id, value: o.value === undefined || o.value === null ? "" : String( o.value ), autocomplete: "off" } );
						fields[ o.key ] = { input: input, boolean: o.type === "boolean" };
						nodes.push( o.type === "boolean"
							? h( "label", { for: id, class: "conn-check" }, [ input, h( "span", {}, [ o.label, o.help ? h( "span", { class: "pg-note", style: "display:block", text: o.help } ) : null ] ) ] )
							: h( "div", { class: "conn-field" }, [ h( "label", { for: id, text: o.label } ), input, o.help ? h( "span", { class: "pg-note", text: o.help } ) : null ] ) );
					} );
					return nodes;
				}

				function drawBody() {
					body.textContent = "";
					fail( "" );
					submit.querySelector( "span:last-child" ).textContent = method === "oauth" ? "Continue to " + row.host : ( program ? "Switch on" : "Connect" );
					if ( method === "token" ) {
						tokenInput = h( "input", { type: "password", id: "cd-token", autocomplete: "new-password", required: true, placeholder: "Paste the token" } );
						body.appendChild( h( "div", { class: "conn-field" }, [
							h( "label", { for: "cd-token", text: "Your token" } ), tokenInput,
							h( "span", { class: "pg-note", text: "It is checked with " + row.host + ", then sealed in the vault as yours, " + ( row.tokenName ? "named " + row.tokenName + ", " : "" ) + "and only ever sent to " + row.host + ". It is not shown again." } ),
							row.docs ? h( "a", { href: row.docs, target: "_blank", rel: "noopener", text: "Where to get one" } ) : null
						] ) );
					} else if ( method === "oauth" ) {
						tokenInput = null;
						body.appendChild( h( "p", { class: "pg-note", text: "You sign in on " + row.host + ". BX Agents never sees your password. The agent then acts as you." } ) );
					} else {
						tokenInput = null;
						body.appendChild( h( "p", { class: "pg-note", text: "Runs " + row.program + " on the machine the agent runs on. Everyone who uses this agent shares it, so only an admin switches it on." } ) );
					}
					optionFields().forEach( function ( node ) { body.appendChild( node ); } );
				}

				var picker = null;
				if ( ways.length > 1 ) {
					picker = h( "fieldset", { class: "conn-ways" }, [ h( "legend", { text: "How do you want to connect?" } ) ] );
					ways.forEach( function ( w ) {
						var radio = h( "input", { type: "radio", name: "cd-way", value: w, checked: w === method ? true : null } );
						radio.addEventListener( "change", function () { method = w; drawBody(); } );
						picker.appendChild( h( "label", {}, [ radio, w === "oauth" ? " Sign in with " + row.name : " Paste a token" ] ) );
					} );
				}

				var form = h( "form", { autocomplete: "off", class: "conn-dialog-form pg" }, [
					h( "div", { class: "conn-dialog-head" }, [
						h( "span", { class: "conn-icon", html: icon( row.icon || "puzzle-piece" ) } ),
						h( "h2", { id: "cd-title", text: ( row.state === "needs_attention" ? "Reconnect " : ( program ? "Switch on " : "Connect " ) ) + row.name } ),
						btn( "x", "", close, null, { "aria-label": "Close" } )
					] ),
					risk, picker, body, errorLine, waiting,
					h( "div", { class: "pg-actions" }, [ submit, btn( "x", "Cancel", close ) ] )
				] );
				form.addEventListener( "submit", function ( evt ) {
					evt.preventDefault();
					if ( confirmBox && !confirmBox.checked ) { fail( "Tick the box to say you have read this." ); return; }
					var asked = { id: row.id, method: method, confirm: !!( confirmBox && confirmBox.checked ) };
					var options = {};
					Object.keys( fields ).forEach( function ( key ) { options[ key ] = fields[ key ].boolean ? fields[ key ].input.checked : fields[ key ].input.value.trim(); } );
					if ( Object.keys( options ).length ) { asked.options = options; }
					if ( method === "token" ) {
						asked.token = tokenInput.value;
						// the token leaves the box at once: nothing on this page keeps it after this request
						tokenInput.value = "";
					}
					fail( "" );
					submit.disabled = true;
					apiPost( "/connectors/connect", asked ).then( function ( res ) {
						if ( !res.ok ) { submit.disabled = false; return failedText( res, "Could not connect." ).then( fail ); }
						return res.json().then( function ( answer ) {
							if ( answer.authorizationUrl ) {
								// a link as well as a new tab: a browser may refuse a tab that a script opens after a request
								waiting.hidden = false;
								waiting.textContent = "";
								waiting.appendChild( h( "a", { href: answer.authorizationUrl, target: "_blank", rel: "noopener", text: "Open the sign in for " + row.name } ) );
								waiting.appendChild( document.createTextNode( ". Come back here when you are done." ) );
								window.open( answer.authorizationUrl, "_blank", "noopener" );
								watchUntil( function () {
									return ( data.connectors || [] ).some( function ( r ) { return r.id === row.id && r.state === "connected"; } );
								}, function () { dlg.close(); say( "Connected to " + row.name + "." ); }, function () { submit.disabled = false; fail( "Nobody came back in time. Try again." ); } );
								return;
							}
							dlg.close();
							say( ( program ? "Switched on " : "Connected to " ) + row.name + "." );
							return reloadQuietly();
						} );
					} ).catch( function () { submit.disabled = false; fail( "Could not connect." ); } );
				} );

				dlg.appendChild( form );
				dlg.addEventListener( "close", function () { stopWatching(); dlg.remove(); openDialog = null; } );
				document.body.appendChild( dlg );
				openDialog = dlg;
				drawBody();
				dlg.showModal();
			}

			// ---- The tools drawer: a switch per tool, kept for this person only. The admin's ceiling shows as a lock ----
			function openTools( row ) {
				var drawer = h( "dialog", { class: "conn-drawer pg", "aria-labelledby": "td-title" } );
				var intro = h( "p", { class: "pg-note", role: "status", "aria-live": "polite" } );
				var warning = h( "div", { class: "conn-risk high", role: "status", hidden: true } );
				var search = h( "input", { type: "search", placeholder: "Search the tools", "aria-label": "Search the tools" } );
				var list = h( "ul", { class: "conn-tools", "aria-label": "Tools of " + row.name } );
				var foot = h( "p", { class: "pg-note" } );
				var errorLine = h( "p", { class: "pg-error", role: "alert", hidden: true } );
				var tools = [];
				var summary = ( data && data.summary ) || {};

				function fail( text ) { errorLine.hidden = !text; errorLine.textContent = text || ""; }
				function close() { drawer.close(); }

				function take( answer ) {
					// by name, so a tool is where the person looks for it whatever order the server listed them in
					tools = ( answer.tools || [] ).slice().sort( function ( a, b ) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; } );
					summary = answer.summary || summary;
					draw();
				}

				function change( body ) {
					fail( "" );
					body.id = row.id;
					return apiPost( "/connectors/tools", body ).then( function ( res ) {
						if ( !res.ok ) { return failedText( res, "Could not change the tools." ).then( fail ); }
						return res.json().then( take );
					} ).catch( function () { fail( "Could not change the tools." ); } );
				}

				var anyHint = function () { return tools.some( function ( t ) { return t.readOnly === true || t.readOnly === false; } ); };

				function draw() {
					var on = tools.filter( function ( t ) { return t.on; } ).length;
					intro.textContent = "Choose what the agent may use. " + on + " of " + tools.length + " on. Your choice is kept for you.";
					warning.hidden = !summary.over;
					warning.textContent = "";
					if ( summary.over ) {
						warning.appendChild( h( "span", { html: icon( "warning" ) } ) );
						warning.appendChild( document.createTextNode( " The agent has " + summary.toolsOn + " tools on across all connectors. Models answer better with fewer than " + summary.toolWarning + "." ) );
					}
					var term = search.value.trim().toLowerCase();
					var shown = tools.filter( function ( t ) { return !term || ( t.name + " " + ( t.description || "" ) ).toLowerCase().indexOf( term ) >= 0; } );
					list.textContent = "";
					shown.forEach( function ( t ) {
						var id = "tool-" + t.name;
						var box = h( "input", { type: "checkbox", id: id, checked: t.on ? true : null, disabled: t.locked ? true : null } );
						box.addEventListener( "change", function () { change( { tool: t.name, on: box.checked } ); } );
						list.appendChild( h( "li", { class: "conn-tool" }, [
							h( "div", { class: "conn-tool-text" }, [
								h( "label", { for: id }, [ h( "code", { text: t.name } ) ] ),
								t.description ? h( "span", { class: "pg-note", text: t.description } ) : null,
								t.locked ? h( "span", { class: "pg-note" }, [ h( "span", { html: icon( "lock-key" ) } ), " Turned off by your admin" ] ) : null
							] ),
							t.destructive === true ? h( "span", { class: "chip warn" }, [ h( "span", { html: icon( "warning" ) } ), "Can delete" ] ) : null,
							t.readOnly === true ? h( "span", { class: "chip ok" }, [ "Reads only" ] ) : null,
							h( "span", { class: "conn-switch" }, [ box, h( "span", { class: "conn-switch-track", "aria-hidden": "true" } ) ] )
						] ) );
					} );
					foot.textContent = term ? "Showing " + shown.length + " of " + tools.length + "." : "";
				}

				search.addEventListener( "input", draw );
				var actions = [
					btn( "check", "All on", function () { change( { all: true } ); } ),
					btn( "prohibit", "All off", function () { change( { all: false } ); } )
				];
				var readOnlyBtn = btn( "hand-palm", "Read only", function () { change( { readonly: true } ); } );
				drawer.appendChild( h( "div", { class: "conn-drawer-body" }, [
					h( "div", { class: "conn-dialog-head" }, [
						h( "span", { class: "conn-icon", html: icon( row.icon || "puzzle-piece" ) } ),
						h( "h2", { id: "td-title", text: row.name + " tools" } ),
						btn( "x", "", close, null, { "aria-label": "Close" } )
					] ),
					intro,
					h( "div", { class: "pg-actions", id: "td-actions" }, actions.concat( [ readOnlyBtn ] ) ),
					search, warning, errorLine, list, foot
				] ) );
				drawer.addEventListener( "close", function () { drawer.remove(); reloadQuietly(); } );
				document.body.appendChild( drawer );
				openDialog = drawer;
				list.appendChild( h( "li", {}, [ pageNote( "Loading the tools." ) ] ) );
				drawer.showModal();
				apiGet( "/connectors/tools?id=" + encodeURIComponent( row.id ) ).then( function ( answer ) {
					if ( !answer || !answer.success ) { list.textContent = ""; fail( "Could not list the tools of " + row.name + "." ); return; }
					take( answer );
					// the server may not say which tools only read: then there is nothing to filter on
					readOnlyBtn.hidden = !anyHint();
				} );
			}

			// ---- The services written in Agent.yaml: the same sign in the old Connections dialog had ----
			function connectServer( name ) {
				say( "" );
				apiPost( "/connect", { name: name } ).then( function ( res ) {
					return res.json().then( function ( answer ) {
						if ( !res.ok || !answer.authorizationUrl ) { say( ( answer && ( answer.reason || answer.error ) ) || "Could not start the sign in." ); return; }
						status.hidden = false;
						status.textContent = "";
						status.appendChild( h( "a", { href: answer.authorizationUrl, target: "_blank", rel: "noopener", text: "Open the sign in for " + name } ) );
						status.appendChild( document.createTextNode( ". Come back here when you are done." ) );
						window.open( answer.authorizationUrl, "_blank", "noopener" );
						watchUntil( function () {
							return ( servers || [] ).some( function ( s ) { return s.name === name && s.connected; } );
						}, function () { say( "Connected to " + name + "." ); }, function () { say( "Nobody came back in time. Try again." ); } );
					} );
				} ).catch( function () { say( "Could not start the sign in." ); } );
			}

			function disconnectServer( name ) {
				stopWatching();
				apiPost( "/connect/remove", { name: name } ).then( function ( res ) {
					if ( res.ok ) { say( "Disconnected from " + name + "." ); return reloadQuietly(); }
					return failedText( res, "Could not disconnect." ).then( say );
				} ).catch( function () { say( "Could not disconnect." ); } );
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
						h( "div", { class: "pg-actions conn-actions" }, [
							s.connected
								? btn( "x", "Disconnect", function () { disconnectServer( s.name ); }, null, { "aria-label": "Disconnect " + s.name } )
								: btn( "plug", "Connect", function () { connectServer( s.name ); }, "primary", { "aria-label": "Connect " + s.name } )
						] )
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
			return function () { stopWatching(); if ( openDialog ) { openDialog.close(); } };
		}
	} );
