	// ---- Page: Registry (Tools grouped by prefix, Skills with a reader, Volumes) ----
	registerPage( {
		id: "registry",
		title: "Registry",
		icon: "stack",
		group: "main",
		order: 40,
		render: function ( host, route ) {
			var tabs = [ { id: "tools", title: "Tools", icon: "wrench" }, { id: "skills", title: "Skills", icon: "lightbulb" }, { id: "volumes", title: "Volumes", icon: "folder" } ];
			var tab = [ "tools", "skills", "volumes" ].indexOf( route.sub ) >= 0 ? route.sub : "tools";
			var root = pageFrame( host, "Registry", "What the agent can use: its tools, the skills it can load, and the folders it may read and write." );
			root.appendChild( pageTabs( "registry", tabs, tab ) );
			var body = h( "div" );
			root.appendChild( body );

			function failed( text ) { body.appendChild( pageNote( text, "error" ) ); }

			// ---- Tools, grouped by the word before the first underscore (note_remember is in "note") ----
			function drawTools() {
				var search = h( "input", { type: "search", placeholder: "Search the tools", "aria-label": "Search the tools" } );
				var groups = h( "div" );
				body.appendChild( h( "div", { class: "pg-actions", style: "margin-bottom:1rem" }, [ search ] ) );
				body.appendChild( groups );
				apiGet( "/tools" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !payload ) { failed( "Could not load the tools." ); return; }
					var tools = payload.tools || [];
					function draw() {
						groups.textContent = "";
						var term = search.value.trim().toLowerCase();
						var byGroup = {};
						tools.filter( function ( t ) {
							return !term || ( t.name + " " + ( t.description || "" ) ).toLowerCase().indexOf( term ) >= 0;
						} ).forEach( function ( t ) {
							var cut = t.name.indexOf( "_" );
							var key = cut > 0 ? t.name.slice( 0, cut ) : "other";
							( byGroup[ key ] = byGroup[ key ] || [] ).push( t );
						} );
						var keys = Object.keys( byGroup ).sort( function ( a, b ) { return a === "other" ? 1 : b === "other" ? -1 : a < b ? -1 : 1; } );
						if ( !keys.length ) {
							groups.appendChild( pageNote( term ? "No tool matches that." : "The agent has no tools." ) );
							return;
						}
						keys.forEach( function ( key ) {
							var list = h( "ul", { style: "list-style:none;margin:0;padding:0" } );
							byGroup[ key ].forEach( function ( t ) {
								list.appendChild( h( "li", { style: "padding:0.5rem 0;border-top:1px solid var(--border)" }, [
									h( "div", { class: "pg-actions" }, [
										h( "code", { text: t.name } ),
										t.approval || t.asksFirst ? h( "span", { class: "chip warn" }, [ h( "span", { html: icon( "hand-palm" ) } ), "Asks first" ] ) : null
									] ),
									h( "p", { class: "pg-note", style: "margin:0.2rem 0 0", text: t.description || "" } )
								] ) );
							} );
							groups.appendChild( h( "section", { class: "card", style: "margin-bottom:0.75rem", "aria-labelledby": "tg-" + key }, [
								h( "h2", { id: "tg-" + key, style: "margin-top:0" }, [ h( "span", { html: icon( "wrench" ) } ), " " + key + " ", h( "span", { class: "chip", text: String( byGroup[ key ].length ) } ) ] ),
								list
							] ) );
						} );
					}
					search.addEventListener( "input", draw );
					draw();
				} );
			}

			// ---- Skills, with a reader ----
			function drawSkills() {
				var grid = h( "div", { class: "grid" } );
				var reader = h( "section", { class: "card", hidden: true, "aria-label": "Skill reader", style: "margin-top:1rem" } );
				body.appendChild( grid );
				body.appendChild( reader );

				function read( skill, trigger ) {
					reader.hidden = false;
					reader.textContent = "";
					reader.appendChild( h( "div", { class: "pg-actions" }, [
						h( "h2", { style: "margin:0;flex:1", text: skill.name } ),
						btn( "x", "Close", function () { reader.hidden = true; if ( trigger ) { trigger.focus(); } } )
					] ) );
					var text = h( "pre", { text: "Loading..." } );
					reader.appendChild( text );
					routinesCall( "GET", "/skills/read?name=" + encodeURIComponent( skill.name ) ).then( function ( result ) {
						if ( route.stale() ) { return; }
						if ( !result.ok ) {
							text.textContent = failureText( result, "Could not read this skill." );
							return;
						}
						var s = result.body;
						if ( typeof s.body !== "string" ) {
							text.textContent = "This server cannot show the text of a skill yet.";
							return;
						}
						text.textContent = s.body;
						reader.insertBefore( h( "p", { class: "pg-note", text: ( s.origin ? "Written by the " + s.origin + ". " : "" ) + ( s.size ? s.size + " bytes. " : "" ) + ( s.savedAt ? "Saved " + stampText( s.savedAt ) + "." : "" ) } ), text );
					} );
					reader.scrollIntoView( { block: "nearest" } );
					reader.setAttribute( "tabindex", "-1" );
					reader.focus( { preventScroll: true } );
				}

				apiGet( "/skills" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !payload ) { failed( "Could not load the skills." ); return; }
					var skills = payload.skills || [];
					if ( !skills.length ) {
						grid.parentNode.insertBefore( pageNote( "No skills yet. Ask the agent to save one after a task worth repeating, or add a SKILL.md under skills/ in the project." ), grid );
						return;
					}
					skills.forEach( function ( skill ) {
						var open = btn( "book-open", "Read", function () { read( skill, open ); }, "", { "aria-label": "Read the skill " + skill.name } );
						grid.appendChild( h( "article", { class: "card" }, [
							h( "div", { class: "pg-actions" }, [
								h( "strong", { text: skill.name } ),
								skill.origin ? h( "span", { class: "chip" }, [ h( "span", { html: icon( skill.origin === "agent" ? "robot" : "folder" ) } ), skill.origin === "agent" ? "Written by the agent" : "In the project" ] ) : null
							] ),
							h( "p", { class: "pg-note", text: skill.description || "" } ),
							open
						] ) );
					} );
				} );
			}

			// ---- Volumes ----
			function drawVolumes() {
				var list = h( "ul", { "aria-label": "Volumes", style: "list-style:none;margin:0;padding:0" } );
				body.appendChild( list );
				apiGet( "/volumes" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !payload ) { failed( "Could not load the volumes." ); return; }
					var volumes = payload.volumes || [];
					if ( !volumes.length ) {
						list.appendChild( h( "li", {}, [ pageNote( "No volumes. The agent has no folder it may read or write." ) ] ) );
					}
					volumes.forEach( function ( v ) {
						var rw = v.mode === "rw";
						list.appendChild( h( "li", { class: "card", style: "margin-bottom:0.5rem" }, [
							h( "div", { class: "pg-actions" }, [
								h( "strong", { text: v.name } ),
								h( "span", { class: "chip " + ( rw ? "" : "warn" ) }, [ h( "span", { html: icon( rw ? "pencil-simple" : "eye" ) } ), rw ? "Read and write" : "Read only" ] )
							] ),
							h( "p", { class: "pg-note", text: v.description || "" } )
						] ) );
					} );
				} );
			}

			if ( tab === "skills" ) { drawSkills(); } else if ( tab === "volumes" ) { drawVolumes(); } else { drawTools(); }
		}
	} );
