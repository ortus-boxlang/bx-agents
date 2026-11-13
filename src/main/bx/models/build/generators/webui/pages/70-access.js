	// ---- Page: Access (admin). Tokens for the API, and the people who can sign in ----
	registerPage( {
		id: "access",
		title: "Access",
		icon: "key",
		group: "admin",
		order: 140,
		cap: function ( caps ) { return !!( caps.tokens || caps.admin ); },
		replaces: [ "tokensBtn" ],
		render: function ( host, route ) {
			var tabs = [ { id: "tokens", title: "Tokens", icon: "key" }, { id: "people", title: "People", icon: "users" } ];
			var tab = route.sub === "people" || ( !capabilities.tokens && route.sub !== "tokens" ) ? "people" : "tokens";
			var root = pageFrame( host, "Access", "Who and what can use this agent: access tokens for the API, and the accounts that can sign in." );
			root.appendChild( pageTabs( "access", tabs, tab ) );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var body = h( "div" );
			root.appendChild( status );
			root.appendChild( body );
			function say( text ) { status.textContent = text || ""; }

			function failedText( res, fallback ) {
				return res.json().then( function ( parsed ) { return ( parsed && ( parsed.reason || parsed.error ) ) || fallback; } ).catch( function () { return fallback; } );
			}

			// ---- tokens ----
			function drawTokens() {
				body.textContent = "";
				if ( !capabilities.tokens ) {
					body.appendChild( pageNote( "This server does not manage tokens from here. Turn on agentApi.manageTokens in Agent.yaml, or use bxAgents tokens." ) );
					return;
				}
				var secret = h( "div", { class: "card", hidden: true, role: "status" } );
				var secretText = h( "code", { style: "word-break:break-all" } );
				secret.appendChild( h( "p", {}, [ h( "strong", { text: "Copy this token now. It is shown once and cannot be read again." } ) ] ) );
				secret.appendChild( h( "p", {}, [ secretText ] ) );
				secret.appendChild( btn( "copy", "Copy", function () {
					if ( navigator.clipboard ) {
						navigator.clipboard.writeText( secretText.textContent ).then( function () { say( "Copied." ); } );
					}
				} ) );
				var name = h( "input", { type: "text", maxlength: "64", placeholder: "Name", "aria-label": "Token name", required: true } );
				var scope = h( "select", { "aria-label": "Scope" }, [ h( "option", { value: "chat", text: "chat" } ), h( "option", { value: "admin", text: "admin" } ) ] );
				var expires = h( "input", { type: "text", maxlength: "20", placeholder: "Lasts (90d)", "aria-label": "Expires" } );
				var form = h( "form", { class: "pg-actions", style: "margin-bottom:1rem" }, [ name, scope, expires, btn( "plus", "Make a token", null, "primary", { type: "submit" } ) ] );
				var list = h( "ul", { "aria-label": "Tokens", style: "list-style:none;margin:0;padding:0" } );
				body.appendChild( secret );
				body.appendChild( h( "div", { class: "card" }, [ h( "h2", { text: "Make a token" } ), form ] ) );
				body.appendChild( h( "h2", { text: "Tokens" } ) );
				body.appendChild( list );

				function load() {
					return apiGet( "/tokens" ).then( function ( payload ) {
						if ( route.stale() ) { return; }
						list.textContent = "";
						if ( !( payload && payload.success ) ) {
							list.appendChild( h( "li", {}, [ pageNote( "Could not load the tokens.", "error" ) ] ) );
							return;
						}
						var tokens = payload.tokens || [];
						if ( !tokens.length ) {
							list.appendChild( h( "li", {}, [ pageNote( "No tokens yet." ) ] ) );
						}
						tokens.forEach( function ( token ) {
							var active = token.status === "active";
							list.appendChild( h( "li", { class: "card", style: "margin-bottom:0.5rem" }, [
								h( "div", { class: "pg-actions" }, [
									h( "strong", { text: token.name } ),
									h( "span", { class: "chip " + ( active ? "ok" : "" ) }, [ h( "span", { html: icon( active ? "check-circle" : "prohibit" ) } ), token.status ] ),
									h( "span", { class: "chip" }, [ h( "span", { html: icon( token.scope === "admin" ? "shield-check" : "chat-circle-text" ) } ), token.scope ] ),
									h( "span", { class: "pg-note", text: ( token.expiresAt ? "until " + dayOf( token.expiresAt ) + ", " : "" ) + ( token.lastUsedAt ? "used " + dayOf( token.lastUsedAt ) : "never used" ) } ),
									active ? btn( "prohibit", "Revoke", function () {
										apiPost( "/tokens/revoke", { name: token.name } ).then( function ( res ) {
											if ( res.ok ) {
												say( "Revoked " + token.name + "." );
												return load();
											}
											return failedText( res, "Could not revoke the token." ).then( say );
										} );
									}, "danger", { "aria-label": "Revoke " + token.name } ) : null
								] )
							] ) );
						} );
					} );
				}
				form.addEventListener( "submit", function ( evt ) {
					evt.preventDefault();
					apiPost( "/tokens", { name: name.value.trim(), scope: scope.value, expires: expires.value.trim() } ).then( function ( res ) {
						if ( !res.ok ) {
							return failedText( res, "Could not create the token." ).then( say );
						}
						return res.json().then( function ( made ) {
							secretText.textContent = made.token;
							secret.hidden = false;
							name.value = "";
							expires.value = "";
							say( "Created " + made.name + "." );
							return load();
						} );
					} );
				} );
				load();
			}

			// ---- people ----
			function drawPeople() {
				body.textContent = "";
				var list = h( "ul", { "aria-label": "People", style: "list-style:none;margin:0;padding:0" } );
				body.appendChild( list );
				function load() {
					return routinesCall( "GET", "/users" ).then( function ( result ) {
						if ( route.stale() ) { return; }
						list.textContent = "";
						if ( !result.ok ) {
							list.appendChild( h( "li", {}, [ pageNote( failureText( result, "Could not load the accounts." ), "error" ) ] ) );
							return;
						}
						var users = result.body.users || [];
						if ( !users.length ) {
							list.appendChild( h( "li", {}, [ pageNote( "No accounts. Add them under users in the gateway's config, or with bxAgents users." ) ] ) );
						}
						users.forEach( function ( user ) {
							var isAdmin = !!user.admin;
							list.appendChild( h( "li", { class: "card", style: "margin-bottom:0.5rem" }, [
								h( "div", { class: "pg-actions" }, [
									h( "strong", { text: user.displayName || user.username } ),
									user.displayName && user.displayName !== user.username ? h( "span", { class: "pg-note", text: user.username } ) : null,
									h( "span", { class: "chip " + ( isAdmin ? "ok" : "" ) }, [ h( "span", { html: icon( isAdmin ? "shield-check" : "user" ) } ), isAdmin ? "Admin" : "Member" ] ),
									user.active === false ? h( "span", { class: "chip warn" }, [ h( "span", { html: icon( "pause" ) } ), "Inactive" ] ) : null,
									btn( isAdmin ? "user" : "shield-check", isAdmin ? "Make a member" : "Make an admin", function () {
										routinesCall( "POST", "/users/admin", { username: user.username, admin: !isAdmin } ).then( function ( result2 ) {
											say( result2.ok ? user.username + " is " + ( isAdmin ? "a member now." : "an admin now." ) : failureText( result2, "Could not change that account." ) );
											return load();
										} );
									}, "", { "aria-label": ( isAdmin ? "Make " + user.username + " a member" : "Make " + user.username + " an admin" ) } )
								] )
							] ) );
						} );
					} );
				}
				body.appendChild( h( "p", { class: "pg-note", text: "An admin sees the admin pages and everyone's routines. The last admin cannot be made a member." } ) );
				load();
			}

			if ( tab === "people" ) { drawPeople(); } else { drawTokens(); }
		}
	} );
