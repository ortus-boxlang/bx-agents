	// ---- Page: Gateways (admin). The chat services the agent is connected to ----
	var GATEWAY_STATE = {
		connected: [ "ok", "check-circle", "Connected" ],
		stopped: [ "", "pause", "Stopped" ],
		failing: [ "bad", "warning-circle", "Failing" ],
		missing: [ "warn", "question", "Not registered" ]
	};

	registerPage( {
		id: "gateways",
		title: "Gateways",
		icon: "plugs-connected",
		group: "admin",
		order: 120,
		cap: function ( caps ) { return !!caps.gateways; },
		render: function ( host, route ) {
			var root = pageFrame( host, "Gateways", "The chat services the agent talks through, and whether each is connected.", [
				btn( "arrow-clockwise", "Refresh", function () { load(); } )
			] );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var list = h( "ul", { "aria-label": "Gateways", style: "list-style:none;margin:0;padding:0" } );
			root.appendChild( status );
			root.appendChild( list );
			root.appendChild( h( "p", { class: "pg-note", text: "Reconnect starts the gateway again, for example after you set a missing credential in the environment." } ) );

			function say( text ) { status.textContent = text || ""; }

			function chatsTable( gateway ) {
				var chats = gateway.chats || [];
				if ( !chats.length ) {
					return h( "p", { class: "pg-note", text: "No chats yet. A chat shows here after someone writes to the agent through this gateway." } );
				}
				var body = h( "tbody" );
				chats.forEach( function ( c ) {
					body.appendChild( h( "tr", {}, [
						h( "td", { text: String( c.chatId ) } ),
						h( "td", { text: c.threadId ? String( c.threadId ) : "" } ),
						h( "td", { text: seenText( c.lastSeen ) } )
					] ) );
				} );
				return h( "div", { class: "tbl-wrap" }, [ h( "table", {}, [
					h( "caption", { class: "visually-hidden", text: "Chats of " + gateway.name } ),
					h( "thead", {}, [ h( "tr", {}, [ h( "th", { scope: "col", text: "Chat" } ), h( "th", { scope: "col", text: "Thread" } ), h( "th", { scope: "col", text: "Last seen" } ) ] ) ] ),
					body
				] ) ] );
			}

			function draw( gateways ) {
				list.textContent = "";
				if ( !gateways.length ) {
					list.appendChild( h( "li", {}, [ pageNote( "No gateways are set up. Add one with bxAgents add gateway." ) ] ) );
					return;
				}
				gateways.forEach( function ( g ) {
					var kind = GATEWAY_STATE[ g.state ] || [ "", "question", g.state ];
					var creds = ( g.credentials || [] ).length
						? g.credentials.map( function ( c ) { return c.env + ": " + ( c.set ? "set" : "NOT SET" ); } ).join( ", " )
						: "No credentials to set.";
					var reconnect = btn( "arrows-clockwise", "Reconnect", function () {
						reconnect.disabled = true;
						say( "Reconnecting " + g.name + "..." );
						routinesCall( "POST", "/gateways/reconnect", { name: g.name } ).then( function ( result ) {
							var message = result.ok ? "Reconnected " + g.name + "." : failureText( result, "Could not reconnect " + g.name + "." );
							return load().then( function () { say( message ); } );
						} );
					}, "", { "aria-label": "Reconnect " + g.name } );
					if ( g.state === "missing" ) {
						reconnect.disabled = true;
						reconnect.title = "This gateway is not registered in the running app, so there is nothing to reconnect";
					}
					list.appendChild( h( "li", { class: "card", style: "margin-bottom:0.75rem" }, [
						h( "div", { class: "pg-actions" }, [
							h( "strong", { text: g.name } ),
							h( "span", { class: "chip " + kind[ 0 ] }, [ h( "span", { html: icon( kind[ 1 ] ) } ), kind[ 2 ] ] ),
							h( "span", { class: "pg-note", text: g.type } )
						] ),
						h( "p", { class: "pg-note", text: creds } ),
						h( "p", { class: "pg-note", text: g.lastActiveAt ? "Last conversation " + stampText( g.lastActiveAt ) : "No conversations yet." } ),
						g.lastError && g.lastError.message ? h( "p", { class: "pg-error", role: "status" }, [
							h( "span", { html: icon( "warning-circle" ) } ),
							"Last error" + ( g.lastError.at ? " " + stampText( g.lastError.at ) : "" ) + ": " + g.lastError.message + " ",
							capabilities.logs ? h( "a", { href: "#/logs/gateways?q=" + encodeURIComponent( g.type ) }, [ "Open log" ] ) : null
						] ) : null,
						h( "div", { class: "pg-actions" }, [ reconnect ] ),
						h( "h2", { text: "Chats" } ),
						chatsTable( g )
					] ) );
				} );
			}

			function load() {
				return apiGet( "/gateways" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !payload ) {
						list.textContent = "";
						list.appendChild( h( "li", {}, [ pageNote( "Could not load the gateways.", "error" ) ] ) );
						return;
					}
					draw( payload.gateways || [] );
				} );
			}
			load();
		}
	} );
