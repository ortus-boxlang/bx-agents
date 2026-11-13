	// ---- Page: Vault. Secrets the agent can use; a value is typed once and never comes back ----
	// Shares vaultRequest and vaultScope with the chat: when the agent asks for a secret (the vault_request
	// tool), offerVaultRequest sends the person here, and this page shows the ask above the form.
	registerPage( {
		id: "vault",
		title: "Vault",
		icon: "lock-key",
		group: "main",
		order: 60,
		cap: function ( caps ) { return !!caps.vault; },
		render: function ( host, route ) {
			var root = pageFrame( host, "Vault", "Secrets the agent can use, such as API keys. Values are sealed and never shown again. Each secret says what it is for and which hosts it may go to." );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var ask = h( "div", { class: "card", hidden: true, role: "status", style: "border-color:var(--accent)" } );
			var scopeTabs = h( "nav", { class: "pg-tabs", "aria-label": "Whose secrets" } );
			var summary = h( "p", { class: "pg-note" } );
			var list = h( "ul", { "aria-label": "Secrets", style: "list-style:none;margin:0;padding:0" } );
			var formHost = h( "div" );
			var activityHost = h( "div" );
			[ ask, scopeTabs, status, summary, list, formHost, activityHost ].forEach( function ( node ) { root.appendChild( node ); } );
			var data = null;
			function say( text ) { status.textContent = text || ""; }
			function canWrite() { return vaultScope === "user" || !!( data && data.admin ); }
			function failedText( res, fallback ) {
				return res.json().then( function ( parsed ) { return ( parsed && ( parsed.reason || parsed.error ) ) || fallback; } ).catch( function () { return fallback; } );
			}

			function drawTabs() {
				scopeTabs.textContent = "";
				[ [ "user", "Yours", "user" ], [ "agent", "The agent's", "robot" ] ].forEach( function ( t ) {
					var tab = h( "a", { href: "#/vault", "aria-current": vaultScope === t[ 0 ] ? "page" : null, onclick: function ( evt ) {
						evt.preventDefault();
						vaultScope = t[ 0 ];
						say( "" );
						draw();
					} }, [ h( "span", { html: icon( t[ 2 ] ) } ), t[ 1 ] ] );
					scopeTabs.appendChild( tab );
				} );
			}

			function drawAsk() {
				if ( !vaultRequest ) { ask.hidden = true; return; }
				ask.hidden = false;
				ask.textContent = "";
				ask.appendChild( h( "p", { style: "margin:0" }, [
					h( "span", { html: icon( "key" ) } ),
					h( "strong", { text: " The agent asked for " + vaultRequest.name + ". " } ),
					( vaultRequest.why ? vaultRequest.why.replace( /[.\s]+$/, "" ) + ". " : "" ) + "Type it below; it is not sent through the chat."
				] ) );
			}

			function drawList() {
				list.textContent = "";
				var rows = ( data.secrets || [] ).filter( function ( s ) { return s.scope === vaultScope; } );
				summary.textContent = rows.length + ( rows.length === 1 ? " secret. " : " secrets. " )
					+ ( data.status && data.status.keySource === "file" ? "The key is a file beside the database: set BXAGENTS_VAULT_KEY for more protection." : "" );
				if ( !rows.length ) {
					list.appendChild( h( "li", {}, [ pageNote( "No secrets yet." ) ] ) );
				}
				rows.forEach( function ( secret ) {
					var card = h( "li", { class: "card", style: "margin-bottom:0.5rem" } );
					function show() {
						card.textContent = "";
						card.appendChild( h( "div", { class: "pg-actions" }, [
							h( "strong", { style: "flex:1;min-width:8rem", text: secret.name } ),
							canWrite() ? btn( "pencil-simple", "Edit", edit, "", { "aria-label": "Edit " + secret.name } ) : null,
							canWrite() ? btn( "trash", "Remove", function () {
								if ( !window.confirm( "Remove " + secret.name + "?\n\nAnything that uses it will stop working." ) ) { return; }
								apiPost( "/vault/remove", { scope: vaultScope, name: secret.name } ).then( function ( res ) {
									if ( res.ok ) { say( "Removed." ); return load(); }
									return failedText( res, "Could not remove the secret." ).then( say );
								} );
							}, "danger", { "aria-label": "Remove " + secret.name } ) : null
						] ) );
						card.appendChild( h( "p", { class: "pg-note", style: "margin:0.2rem 0 0", text:
							( secret.description ? secret.description + " · " : "" ) + ( secret.hosts && secret.hosts.length ? secret.hosts.join( ", " ) : "any host" ) + " · "
							+ ( secret.lastUsedAt ? "used " + String( secret.lastUsedAt ).slice( 0, 10 ) : "never used" ) } ) );
					}
					function edit() {
						card.textContent = "";
						var value = h( "input", { type: "password", autocomplete: "new-password", placeholder: "New value (leave empty to keep the current one)", "aria-label": "New value" } );
						var about = h( "input", { type: "text", value: secret.description || "", placeholder: "What it is for", "aria-label": "What it is for" } );
						var hosts = h( "input", { type: "text", value: ( secret.hosts || [] ).join( ", " ), placeholder: "Hosts it may go to", "aria-label": "Hosts" } );
						var form = h( "form", { autocomplete: "off", style: "display:grid;gap:0.5rem" }, [
							h( "strong", { text: secret.name } ), value, about, hosts,
							h( "div", { class: "pg-actions" }, [ btn( "check", "Save", null, "primary", { type: "submit" } ), btn( "x", "Cancel", show ) ] )
						] );
						form.addEventListener( "submit", function ( evt ) {
							evt.preventDefault();
							var changes = { scope: vaultScope, name: secret.name, description: about.value.trim(), hosts: hosts.value.split( "," ).map( function ( x ) { return x.trim(); } ).filter( Boolean ) };
							if ( value.value ) { changes.value = value.value; }
							value.value = "";
							apiPost( "/vault/update", changes ).then( function ( res ) {
								if ( res.ok ) { say( "Saved." ); return load(); }
								return failedText( res, "Could not save the secret." ).then( say );
							} );
						} );
						card.appendChild( form );
						value.focus();
					}
					show();
					list.appendChild( card );
				} );
			}

			function drawForm() {
				formHost.textContent = "";
				if ( !canWrite() ) {
					say( "The agent's secrets are shared by everyone. Changing them takes an admin." );
					return;
				}
				var name = h( "input", { type: "text", maxlength: "64", placeholder: "NAME_OF_THE_SECRET", "aria-label": "Name", required: true, value: vaultRequest ? vaultRequest.name : "" } );
				var value = h( "input", { type: "password", autocomplete: "new-password", placeholder: "Value", "aria-label": "Value", required: true } );
				var about = h( "input", { type: "text", placeholder: "What it is for", "aria-label": "What it is for" } );
				var hosts = h( "input", { type: "text", placeholder: "Hosts it may go to (comma separated, empty for any)", "aria-label": "Hosts" } );
				var form = h( "form", { autocomplete: "off", style: "display:grid;gap:0.5rem;max-width:36rem" }, [
					name, value, about, hosts,
					h( "div", { class: "pg-actions" }, [ btn( "plus", "Add the secret", null, "primary", { type: "submit" } ) ] )
				] );
				form.addEventListener( "submit", function ( evt ) {
					evt.preventDefault();
					var body = { scope: vaultScope, name: name.value.trim(), value: value.value, description: about.value.trim(),
						hosts: hosts.value.split( "," ).map( function ( x ) { return x.trim(); } ).filter( Boolean ) };
					// the value leaves the box at once: nothing keeps it after this request
					value.value = "";
					apiPost( "/vault", body ).then( function ( res ) {
						if ( !res.ok ) { return failedText( res, "Could not save the secret." ).then( say ); }
						var answered = vaultRequest;
						vaultRequest = null;
						name.value = ""; about.value = ""; hosts.value = "";
						say( "Saved " + body.name + ". It cannot be shown again." );
						if ( answered && answered.name === body.name ) { showHint( body.name + " saved. Tell the agent to carry on." ); }
						return load();
					} );
				} );
				formHost.appendChild( h( "h2", { text: "Add a secret" } ) );
				formHost.appendChild( form );
				if ( vaultRequest ) { value.focus(); }
			}

			function draw() {
				drawTabs();
				drawAsk();
				drawList();
				drawForm();
			}

			function load() {
				return apiGet( "/vault" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !( payload && payload.success ) ) {
						list.textContent = "";
						list.appendChild( h( "li", {}, [ pageNote( "Could not load the vault.", "error" ) ] ) );
						return;
					}
					data = payload;
					vaultData = payload;
					if ( vaultRequest && vaultRequest.scope === "agent" && !payload.admin ) {
						vaultScope = "user";
						say( "The agent asked for a shared secret. Only an admin can add it." );
					}
					draw();
				} );
			}

			// who used what, and when: the key's status and the recent audit lines, never a value
			function loadActivity() {
				routinesCall( "GET", "/vault/activity" ).then( function ( result ) {
					if ( route.stale() ) { return; }
					activityHost.textContent = "";
					if ( !result.ok || !Array.isArray( result.body.activity ) ) { return; }
					var lines = result.body.activity;
					activityHost.appendChild( h( "h2", { text: "Activity" } ) );
					if ( result.body.status ) {
						activityHost.appendChild( h( "p", { class: "pg-note", text: "The key is " + ( result.body.status.keySource === "file" ? "a file beside the database" : result.body.status.keySource === "env" ? "set in the environment" : String( result.body.status.keySource || "set" ) ) + "." } ) );
					}
					if ( !lines.length ) {
						activityHost.appendChild( pageNote( "Nothing has used a secret yet." ) );
						return;
					}
					var body = h( "tbody" );
					lines.forEach( function ( line ) {
						body.appendChild( h( "tr", {}, [
							h( "td", { text: stampText( line.at || line.time ) } ),
							h( "td", { text: line.secret || line.name || "" } ),
							h( "td", { text: line.action || line.what || "" } ),
							h( "td", { text: line.by || line.user || "" } )
						] ) );
					} );
					activityHost.appendChild( h( "div", { class: "tbl-wrap" }, [ h( "table", {}, [
						h( "caption", { class: "visually-hidden", text: "Recent use of secrets" } ),
						h( "thead", {}, [ h( "tr", {}, [ h( "th", { scope: "col", text: "When" } ), h( "th", { scope: "col", text: "Secret" } ), h( "th", { scope: "col", text: "What" } ), h( "th", { scope: "col", text: "By" } ) ] ) ] ),
						body
					] ) ] ) );
				} );
			}

			if ( vaultRequest ) { vaultScope = vaultRequest.scope; }
			vaultPageHook = function () {
				if ( vaultRequest ) { vaultScope = vaultRequest.scope; }
				load();
			};
			load().then( loadActivity );
			return function () { vaultRequest = null; vaultPageHook = null; };
		}
	} );
