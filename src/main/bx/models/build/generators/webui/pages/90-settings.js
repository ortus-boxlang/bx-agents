	// ---- Page: Settings (Appearance, Model, Account, Extensions, Server) ----
	registerPage( {
		id: "settings",
		title: "Settings",
		icon: "gear",
		group: "main",
		order: 70,
		render: function ( host, route ) {
			var root = pageFrame( host, "Settings", "How the page looks, which model answers, and what this server runs." );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			root.appendChild( status );
			function say( text ) { status.textContent = text || ""; }

			// Appearance: the same choices as the Appearance popup, drawn in a card
			var appearanceCard = h( "section", { class: "card", "aria-labelledby": "setAppearanceTitle" } );
			var appearanceBody = h( "div", { class: "appearance-ui in-page" } );
			appearanceCard.appendChild( h( "h2", { id: "setAppearanceTitle", text: "Appearance" } ) );
			appearanceCard.appendChild( h( "p", { class: "pg-note", text: "Mode, accent colour, text size and density. They are kept in this browser; the project's own theme stays the default." } ) );
			appearanceCard.appendChild( appearanceBody );
			root.appendChild( appearanceCard );
			appearanceInPage = appearanceBody;
			drawAppearanceInto( appearanceBody, true );

			// Model: the profiles the server offers, shared with the picker in the chat header
			if ( !profileSelectEl.hidden && profileSelectEl.options.length ) {
				var pick = h( "select", { "aria-label": "Model for your next messages" } );
				Array.prototype.forEach.call( profileSelectEl.options, function ( option ) {
					pick.appendChild( h( "option", { value: option.value, text: option.textContent } ) );
				} );
				pick.value = profileSelectEl.value;
				pick.addEventListener( "change", function () {
					profileSelectEl.value = pick.value;
					profileSelectEl.dispatchEvent( new Event( "change" ) );
					say( "The next messages use " + ( pick.options[ pick.selectedIndex ] || {} ).text + "." );
				} );
				root.appendChild( h( "section", { class: "card", style: "margin-top:0.75rem", "aria-labelledby": "setModelTitle" }, [
					h( "h2", { id: "setModelTitle", text: "Model" } ),
					h( "p", { class: "pg-note", text: "Which model answers your next messages. The choice is remembered in this browser." } ),
					h( "label", {}, [ "Model ", pick ] )
				] ) );
			}

			// Account: the things that were in the Settings menu
			var account = [];
			account.push( btn( "key", "Password", function () { keyBtn.click(); } ) );
			if ( capabilities.connections ) {
				account.push( btn( "puzzle-piece", "Connections", function () { connectBtn.click(); } ) );
			}
			root.appendChild( h( "section", { class: "card", style: "margin-top:0.75rem", "aria-labelledby": "setAccountTitle" }, [
				h( "h2", { id: "setAccountTitle", text: "Account" } ),
				h( "p", { class: "pg-note", text: "The password for this server, and the services the agent signs in to for you, such as mail or a calendar." } ),
				h( "div", { class: "pg-actions" }, account )
			] ) );

			// Extensions: what is loaded and what each adds (the route is the server's; older servers have none)
			var extBody = h( "div" );
			var extCard = h( "section", { class: "card", style: "margin-top:0.75rem", hidden: true, "aria-labelledby": "setExtTitle" }, [
				h( "div", { class: "pg-actions" }, [
					h( "h2", { id: "setExtTitle", style: "margin:0;flex:1", text: "Extensions" } ),
					capabilities.admin ? btn( "arrows-clockwise", "Reload", function () {
						routinesCall( "POST", "/extensions/reload", {} ).then( function ( result ) {
							say( result.ok ? "Reloaded: " + result.body.loaded + " loaded, " + result.body.failed + " failed." : failureText( result, "Could not reload the extensions." ) );
							loadExtensions();
						} );
					} ) : null
				] ),
				extBody
			] );
			root.appendChild( extCard );
			function loadExtensions() {
				routinesCall( "GET", "/extensions" ).then( function ( result ) {
					if ( route.stale() || !result.ok || !Array.isArray( result.body.extensions ) ) { return; }
					extCard.hidden = false;
					extBody.textContent = "";
					var rows = result.body.extensions;
					( result.body.problems || [] ).forEach( function ( p ) { extBody.appendChild( pageNote( p, "error" ) ); } );
					if ( !rows.length ) {
						extBody.appendChild( pageNote( "No extensions are loaded." ) );
						return;
					}
					rows.forEach( function ( ext ) {
						var adds = [];
						[ "commands", "schedulers", "slots", "keys", "verbs", "sources", "prefixes" ].forEach( function ( k ) {
							if ( ( ext[ k ] || [] ).length ) { adds.push( k + ": " + ext[ k ].join( ", " ) ); }
						} );
						var good = !/fail|error|disabled|skipped/i.test( ext.state || "" );
						extBody.appendChild( h( "div", { style: "padding:0.5rem 0;border-top:1px solid var(--border)" }, [
							h( "div", { class: "pg-actions" }, [
								h( "strong", { text: ext.title || ext.name } ),
								ext.version ? h( "span", { class: "pg-note", text: ext.version } ) : null,
								h( "span", { class: "chip " + ( good ? "ok" : "warn" ) }, [ h( "span", { html: icon( good ? "check-circle" : "warning" ) } ), String( ext.state || "" ) ] ),
								h( "span", { class: "chip", text: ext.layer || "" } )
							] ),
							ext.description ? h( "p", { class: "pg-note", style: "margin:0.2rem 0 0", text: ext.description } ) : null,
							adds.length ? h( "p", { class: "pg-note", style: "margin:0.2rem 0 0", text: "Adds " + adds.join( "; " ) } ) : null,
							( ext.problems || [] ).length ? h( "p", { class: "pg-error", role: "status", text: ext.problems.join( " " ) } ) : null
						] ) );
					} );
				} );
			}
			if ( capabilities.admin ) { loadExtensions(); }

			// Server: the agent as the server describes it
			var serverBody = h( "dl", { style: "display:grid;grid-template-columns:max-content 1fr;gap:0.3rem 1rem;margin:0" } );
			root.appendChild( h( "section", { class: "card", style: "margin-top:0.75rem", "aria-labelledby": "setServerTitle" }, [ h( "h2", { id: "setServerTitle", text: "Server" } ), serverBody ] ) );
			apiGet( "/agent" ).then( function ( info ) {
				if ( route.stale() || !info ) { return; }
				var facts = [
					[ "Agent", info.name || "" ], [ "Model", info.model || "" ], [ "Tools", info.toolCount !== undefined ? String( info.toolCount ) : "" ],
					[ "Context window", info.contextWindow ? info.contextWindow + " tokens" : "" ], [ "Pictures", info.vision === "yes" ? "The model can see them" : info.vision === "no" ? "Not offered" : "" ],
					[ "Sub-agents", ( info.subAgents || [] ).length ? info.subAgents.join( ", " ) : "None" ]
				];
				facts.forEach( function ( fact ) {
					if ( !fact[ 1 ] ) { return; }
					serverBody.appendChild( h( "dt", { class: "pg-note", text: fact[ 0 ] } ) );
					serverBody.appendChild( h( "dd", { style: "margin:0", text: fact[ 1 ] } ) );
				} );
			} );
			return function () { appearanceInPage = null; };
		}
	} );
