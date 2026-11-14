	// ---- Page: Logs (admin). One tab per area, a level filter, a search and a tail ----
	registerPage( {
		id: "logs",
		title: "Logs",
		icon: "file-text",
		group: "admin",
		order: 130,
		badgeWord: "errors",
		cap: function ( caps ) { return !!caps.logs; },
		render: function ( host, route ) {
			var areas = [ [ "agent", "Agent" ], [ "gateways", "Gateways" ], [ "routines", "Routines" ], [ "heartbeat", "Heartbeat" ], [ "api", "API" ] ];
			var area = areas.some( function ( a ) { return a[ 0 ] === route.sub; } ) ? route.sub : "agent";
			var timer = null;
			var level = h( "select", { "aria-label": "Level" }, [
				h( "option", { value: "", text: "All levels" } ), h( "option", { value: "warn", text: "Warnings and errors" } ), h( "option", { value: "error", text: "Errors only" } )
			] );
			var query = h( "input", { type: "search", placeholder: "Search", "aria-label": "Search the log", value: route.params.q || "" } );
			var count = h( "select", { "aria-label": "Lines" }, [ "100", "200", "500", "1000" ].map( function ( n ) { return h( "option", { value: n, text: n + " lines", selected: n === "200" } ); } ) );
			var auto = h( "input", { type: "checkbox" } );
			var root = pageFrame( host, "Logs", "What the agent wrote down: gateways, the API, routines and the heartbeat. Secrets are never written.", [
				btn( "arrow-clockwise", "Refresh", function () { loadTabs().then( loadLines ); } )
			] );
			var tabs = h( "nav", { class: "pg-tabs", "aria-label": "Log areas" } );
			var controls = h( "div", { class: "pg-actions", style: "margin-bottom:0.75rem" }, [ level, query, count, h( "label", {}, [ auto, " Refresh every 5 s" ] ) ] );
			var lines = h( "ul", { "aria-label": "Log lines", style: "list-style:none;margin:0;padding:0;font-family:var(--font-mono);font-size:0.82rem" } );
			var foot = h( "p", { class: "pg-status", role: "status" } );
			root.appendChild( tabs );
			root.appendChild( controls );
			root.appendChild( h( "div", { class: "card", style: "padding:0.5rem 0.75rem;max-height:60vh;overflow:auto" }, [ lines ] ) );
			root.appendChild( foot );

			function drawTabs( present, errors ) {
				tabs.textContent = "";
				areas.filter( function ( a ) { return present.indexOf( a[ 0 ] ) >= 0 || a[ 0 ] === area; } ).forEach( function ( a ) {
					var tab = h( "a", {
						href: "#/logs/" + a[ 0 ],
						"aria-current": a[ 0 ] === area ? "page" : null
					}, [ a[ 1 ], errors[ a[ 0 ] ] ? h( "span", { class: "chip bad" }, [ h( "span", { html: icon( "warning-circle" ) } ), errors[ a[ 0 ] ] + " error" + ( errors[ a[ 0 ] ] === 1 ? "" : "s" ) ] ) : null ] );
					tabs.appendChild( tab );
				} );
			}

			function loadTabs() {
				return apiGet( "/logs" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					drawTabs( ( ( payload && payload.logs ) || [] ).map( function ( log ) { return log.area; } ), ( payload && payload.errors ) || {} );
				} );
			}

			function loadLines() {
				var path = "/logs?area=" + encodeURIComponent( area ) + "&tail=" + encodeURIComponent( count.value )
					+ ( level.value ? "&level=" + encodeURIComponent( level.value ) : "" )
					+ ( query.value.trim() ? "&q=" + encodeURIComponent( query.value.trim() ) : "" );
				return apiGet( path ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					lines.textContent = "";
					if ( !payload ) {
						foot.textContent = "Could not load the log.";
						return;
					}
					foot.textContent = "";
					var rows = payload.lines || [];
					if ( !rows.length ) {
						lines.appendChild( h( "li", { class: "pg-note", style: "padding:0.75rem", text: "Nothing logged here yet" + ( level.value || query.value ? " that matches." : "." ) } ) );
						return;
					}
					rows.forEach( function ( line ) {
						var kind = line.level === "error" ? [ "bad", "warning-circle" ] : line.level === "warn" ? [ "warn", "warning" ] : [ "", "info" ];
						lines.appendChild( h( "li", { style: "display:flex;gap:0.6rem;align-items:baseline;padding:0.2rem 0;border-bottom:1px solid var(--border);flex-wrap:wrap" }, [
							h( "span", { class: "pg-note", text: line.time ? String( line.time ).slice( 11, 19 ) : "" } ),
							h( "span", { class: "chip " + kind[ 0 ] }, [ h( "span", { html: icon( kind[ 1 ] ) } ), String( line.level ).toUpperCase() ] ),
							h( "span", { class: "pg-note", text: line.subject || "" } ),
							h( "span", { text: line.message, style: "word-break:break-word;flex:1;min-width:12rem" } )
						] ) );
					} );
					lines.parentNode.scrollTop = lines.parentNode.scrollHeight;
				} );
			}

			function stop() {
				if ( timer ) { clearInterval( timer ); timer = null; }
			}
			level.addEventListener( "change", loadLines );
			count.addEventListener( "change", loadLines );
			query.addEventListener( "input", function () { clearTimeout( query._t ); query._t = setTimeout( loadLines, 300 ); } );
			auto.addEventListener( "change", function () {
				stop();
				if ( auto.checked ) { timer = setInterval( function () { loadTabs().then( loadLines ); }, 5000 ); }
			} );
			loadTabs().then( loadLines );
			// leaving the page stops the refresh and brings the count in the menu up to date
			return function () { stop(); refreshErrorBadge(); };
		}
	} );
