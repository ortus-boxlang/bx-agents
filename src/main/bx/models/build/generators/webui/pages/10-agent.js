	// ---- Page: Agent (admin). Composition, Files (read only) and Usage ----
	var BYTES_TEXT = function ( n ) { n = Number( n ) || 0; return n < 1024 ? n + " B" : n < 1048576 ? ( n / 1024 ).toFixed( 1 ) + " KB" : ( n / 1048576 ).toFixed( 1 ) + " MB"; };
	var MOTION_STORAGE = "bxagents.motion";

	registerPage( {
		id: "agent",
		title: "Agent",
		icon: "robot",
		group: "admin",
		order: 110,
		cap: function ( caps ) { return !!caps.admin; },
		render: function ( host, route ) {
			var tabs = [ { id: "composition", title: "Composition", icon: "tree-structure" }, { id: "files", title: "Files", icon: "folder" }, { id: "usage", title: "Usage", icon: "chart-line" } ];
			var tab = [ "composition", "files", "usage" ].indexOf( route.sub ) >= 0 ? route.sub : "composition";
			var root = pageFrame( host, "Agent", "How this agent is put together: what reaches it, what it is made of, and where it reaches out." );
			root.appendChild( pageTabs( "agent", tabs, tab ) );
			var body = h( "div" );
			root.appendChild( body );
			function getJson( path ) { return routinesCall( "GET", path ); }
			function fail( result, text ) { body.appendChild( pageNote( failureText( result, text ), "error" ) ); }

			function composition() {
				var motionOff = false;
				try { motionOff = localStorage.getItem( MOTION_STORAGE ) === "off"; } catch ( err ) { /* not remembered */ }
				var toggle = h( "input", { type: "checkbox", checked: motionOff } );
				var stage = h( "div", { class: "comp" + ( motionOff ? " still" : "" ) } );
				toggle.addEventListener( "change", function () {
					stage.classList.toggle( "still", toggle.checked );
					try { localStorage.setItem( MOTION_STORAGE, toggle.checked ? "off" : "on" ); } catch ( err ) { /* not remembered */ }
				} );
				body.appendChild( h( "div", { class: "pg-actions", style: "margin-bottom:0.75rem" }, [ h( "label", {}, [ toggle, " Stop the moving lines" ] ) ] ) );
				body.appendChild( stage );
				getJson( "/agent/composition" ).then( function ( result ) {
					if ( route.stale() ) { return; }
					if ( !result.ok ) { fail( result, "Could not load the composition." ); return; }
					var c = result.body;
					var stateChip = function ( state ) {
						var on = state === "on";
						return h( "span", { class: "chip " + ( on ? "ok" : "warn" ) }, [ h( "span", { html: icon( on ? "check-circle" : "pause" ) } ), state === "on" ? "On" : String( state ) ] );
					};
					var col = function ( title, items ) { return h( "section", { class: "comp-col", "aria-label": title }, [ h( "h2", { text: title } ) ].concat( items ) ); };
					var incoming = ( c.incoming || [] ).map( function ( i ) {
						return h( "div", { class: "card comp-item" }, [ h( "strong", { text: i.name } ), stateChip( i.state ), h( "p", { class: "pg-note", text: i.detail || "" } ) ] );
					} );
					var parts = ( c.parts || [] ).map( function ( p ) {
						return h( "div", { class: "card comp-item" }, [ h( "strong", { text: p.title } ), h( "span", { class: "chip", text: String( p.count ) } ), h( "p", { class: "pg-note", text: p.detail || "" } ) ] );
					} );
					var asks = c.asksFirst || [];
					if ( asks.length ) {
						parts.push( h( "div", { class: "card comp-item" }, [ h( "strong", { text: "Asks first" } ), h( "span", { class: "chip warn" }, [ h( "span", { html: icon( "hand-palm" ) } ), String( asks.length ) ] ), h( "p", { class: "pg-note", text: asks.join( ", " ) } ) ] ) );
					}
					var tree = ( c.agents || [] ).map( function ( a ) {
						var talk = a.parent ? btn( "chat-circle-text", "Talk to", function () {
							startConversation( a.name ).then( function () { shellGo( "chat" ); } );
						}, "", { "aria-label": "Talk to " + a.name } ) : null;
						return h( "div", { class: "card comp-item", style: a.parent ? "margin-left:1rem" : "" }, [
							h( "div", { class: "pg-actions" }, [ h( "span", { html: icon( "robot" ) } ), h( "strong", { text: a.name } ), a.parent ? h( "span", { class: "chip", text: "sub-agent" } ) : h( "span", { class: "chip ok", text: "main" } ) ] ),
							h( "p", { class: "pg-note", text: ( a.model ? a.model + ". " : "" ) + ( a.description || "" ) } ),
							talk
						] );
					} );
					var outgoing = ( c.outgoing || [] ).map( function ( o ) {
						return h( "div", { class: "card comp-item" }, [ h( "strong", { text: o.name } ), h( "span", { class: "chip", text: o.kind } ), h( "p", { class: "pg-note", text: o.detail || "" } ) ] );
					} );
					stage.appendChild( col( "Reaches it", incoming ) );
					stage.appendChild( h( "div", { class: "comp-flow", "aria-hidden": "true" } ) );
					stage.appendChild( col( "The agent", tree.concat( parts ) ) );
					stage.appendChild( h( "div", { class: "comp-flow", "aria-hidden": "true" } ) );
					stage.appendChild( col( "Reaches out", outgoing ) );
				} );
			}

			function files() {
				var list = h( "ul", { "aria-label": "Files", style: "list-style:none;margin:0;padding:0" } );
				var viewer = h( "section", { class: "card", hidden: true, "aria-label": "File", style: "margin-top:1rem" } );
				body.appendChild( h( "p", { class: "pg-note", text: "The project's own files, read only. Secrets in Agent.yaml are shown as names, never values." } ) );
				body.appendChild( list );
				body.appendChild( viewer );
				getJson( "/agent/files" ).then( function ( result ) {
					if ( route.stale() ) { return; }
					if ( !result.ok ) { fail( result, "Could not load the files." ); return; }
					var files = result.body.files || [];
					if ( !files.length ) { list.appendChild( h( "li", {}, [ pageNote( "No files to show." ) ] ) ); }
					files.forEach( function ( f ) {
						var open = btn( "eye", "Read", function () {
							viewer.hidden = false;
							viewer.textContent = "";
							var pre = h( "pre", { text: "Loading..." } );
							viewer.appendChild( h( "div", { class: "pg-actions" }, [ h( "h2", { style: "margin:0;flex:1", text: f.path } ), btn( "x", "Close", function () { viewer.hidden = true; open.focus(); } ) ] ) );
							viewer.appendChild( pre );
							getJson( "/agent/file?path=" + encodeURIComponent( f.path ) ).then( function ( read ) {
								pre.textContent = read.ok ? ( read.body.text || "" ) + ( read.body.truncated ? "\n(cut: the file is longer)" : "" ) : failureText( read, "Could not read that file." );
							} );
							viewer.setAttribute( "tabindex", "-1" );
							viewer.focus( { preventScroll: true } );
						}, "", { "aria-label": "Read " + f.path } );
						list.appendChild( h( "li", { class: "card", style: "margin-bottom:0.4rem" }, [ h( "div", { class: "pg-actions" }, [ h( "code", { style: "flex:1;min-width:8rem", text: f.path } ), h( "span", { class: "pg-note", text: BYTES_TEXT( f.size ) } ), open ] ) ] ) );
					} );
				} );
			}

			function usage() {
				var days = h( "select", { "aria-label": "Period" }, [ "7", "30", "90" ].map( function ( n ) { return h( "option", { value: n, text: "Last " + n + " days", selected: n === "30" } ); } ) );
				var out = h( "div" );
				body.appendChild( h( "div", { class: "pg-actions", style: "margin-bottom:0.75rem" }, [ days ] ) );
				body.appendChild( out );
				function table( title, rows ) {
					var tb = h( "tbody" );
					rows.forEach( function ( r ) { tb.appendChild( h( "tr", {}, [ h( "td", { text: r.name }, [] ), h( "td", { text: String( r.calls ) } ), h( "td", { text: String( r.promptTokens ) } ), h( "td", { text: String( r.completionTokens ) } ), h( "td", { text: String( r.totalTokens ) } ) ] ) ); } );
					return h( "div", { class: "tbl-wrap" }, [ h( "table", {}, [ h( "caption", { class: "visually-hidden", text: title } ),
						h( "thead", {}, [ h( "tr", {}, [ h( "th", { scope: "col", text: title.indexOf( "day" ) >= 0 ? "Day" : "Model" } ), h( "th", { scope: "col", text: "Calls" } ), h( "th", { scope: "col", text: "Prompt" } ), h( "th", { scope: "col", text: "Reply" } ), h( "th", { scope: "col", text: "Total" } ) ] ) ] ), tb ] ) ] );
				}
				function load() {
					getJson( "/usage?days=" + days.value ).then( function ( result ) {
						if ( route.stale() ) { return; }
						out.textContent = "";
						if ( !result.ok ) { out.appendChild( pageNote( failureText( result, "Could not load the usage." ), "error" ) ); return; }
						var u = result.body;
						if ( !u.enabled ) {
							days.disabled = true;
							out.appendChild( h( "div", { class: "card" }, [ h( "h2", { style: "margin-top:0", text: "Usage is off" } ), h( "p", { text: u.howTo || "" } ),
								h( "p", { class: "pg-note", text: "Only small counts are kept here. A longer history, with charts, comes with the cloud version." } ) ] ) );
							return;
						}
						out.appendChild( h( "div", { class: "pg-actions", style: "margin-bottom:0.75rem" }, [
							h( "span", { class: "chip" }, [ u.calls + " calls" ] ), h( "span", { class: "chip" }, [ u.totalTokens + " tokens" ] ),
							h( "span", { class: "chip" }, [ u.promptTokens + " in, " + u.completionTokens + " out" ] ) ] ) );
						out.appendChild( h( "h2", { text: "By model" } ) );
						out.appendChild( ( u.byModel || [] ).length ? table( "By model", u.byModel ) : pageNote( "Nothing recorded in this period." ) );
						out.appendChild( h( "h2", { text: "By day" } ) );
						out.appendChild( ( u.byDay || [] ).length ? table( "By day", u.byDay ) : pageNote( "Nothing recorded in this period." ) );
					} );
				}
				days.addEventListener( "change", load );
				load();
			}

			if ( tab === "files" ) { files(); } else if ( tab === "usage" ) { usage(); } else { composition(); }
		}
	} );
