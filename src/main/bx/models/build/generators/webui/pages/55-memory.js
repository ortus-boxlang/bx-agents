	// ---- Page: Memory. What the agent keeps about you, the notes every agent shares, and the memory of conversations ----
	// Notes about you are yours alone: nobody sees another person's, an admin included. The agent's notes are
	// global: one set that the agent and every sub-agent read and write.
	registerPage( {
		id: "memory",
		title: "Memory",
		icon: "brain",
		group: "main",
		order: 50,
		cap: function ( caps ) { return !!caps.notes; },
		render: function ( host, route ) {
			var root = pageFrame( host, "Memory", "What the agent remembers. Notes are short lines it keeps across conversations and reads at the start of every one." );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var userCard = h( "section", { class: "card", "aria-labelledby": "memUserTitle" } );
			var agentCard = h( "section", { class: "card", "aria-labelledby": "memAgentTitle" } );
			var convCard = h( "section", { class: "card", "aria-labelledby": "memConvTitle" } );
			root.appendChild( status );
			root.appendChild( userCard );
			root.appendChild( agentCard );
			root.appendChild( convCard );
			var data = null;
			function say( text ) { status.textContent = text || ""; }
			function failedText( res, fallback ) {
				return res.json().then( function ( parsed ) { return ( parsed && ( parsed.reason || parsed.error ) ) || fallback; } ).catch( function () { return fallback; } );
			}

			function drawNotes( card, scope, titleId, title, blurb, canRemove ) {
				card.textContent = "";
				var part = data[ scope ] || { notes: [], stats: { used: 0, limit: 0 } };
				var used = part.stats.used, limit = part.stats.limit;
				card.appendChild( h( "div", { class: "pg-actions" }, [
					h( "h2", { id: titleId, style: "margin:0;flex:1", text: title } ),
					part.notes.length ? btn( "broom", "Clear all", function () {
						if ( !window.confirm( "Clear all " + part.notes.length + " of these notes? This cannot be undone." ) ) { return; }
						apiPost( "/notes/clear", { scope: scope } ).then( function ( res ) {
							if ( res.ok ) { say( "Cleared." ); return load(); }
							return failedText( res, "Could not clear the notes." ).then( say );
						} );
					}, "danger", { "aria-label": "Clear all notes: " + title } ) : null
				] ) );
				card.appendChild( h( "p", { class: "pg-note", text: blurb } ) );
				card.appendChild( h( "p", { class: "pg-note", text: part.notes.length + ( part.notes.length === 1 ? " note, " : " notes, " ) + used + " of " + limit + " characters (about " + Math.ceil( used / 4 ) + " tokens in every conversation)" } ) );
				card.appendChild( h( "meter", { min: "0", max: String( limit || 1 ), value: String( used ), "aria-label": title + ": characters used", style: "width:100%;height:0.6rem" } ) );
				var list = h( "ul", { "aria-label": title, style: "list-style:none;margin:0.5rem 0 0;padding:0" } );
				if ( !part.notes.length ) {
					list.appendChild( h( "li", {}, [ pageNote( "No notes yet." ) ] ) );
				}
				part.notes.forEach( function ( note ) {
					var item = h( "li", { style: "display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;padding:0.4rem 0;border-top:1px solid var(--border)" } );
					function show() {
						item.textContent = "";
						item.appendChild( h( "span", { style: "flex:1;min-width:10rem", text: note.text } ) );
						item.appendChild( h( "span", { class: "pg-note", text: note.id } ) );
						item.appendChild( btn( "pencil-simple", "Edit", edit, "", { "aria-label": "Edit the note " + note.id } ) );
						if ( canRemove ) {
							item.appendChild( btn( "trash", "Remove", function () {
								if ( !window.confirm( "Remove this note?\n\n" + note.text ) ) { return; }
								apiPost( "/notes/remove", { scope: scope, id: note.id } ).then( function ( res ) {
									if ( res.ok ) { say( "Removed." ); return load(); }
									return failedText( res, "Could not remove the note." ).then( say );
								} );
							}, "danger", { "aria-label": "Remove the note " + note.id } ) );
						}
					}
					function edit() {
						item.textContent = "";
						var input = h( "input", { type: "text", value: note.text, maxlength: "500", "aria-label": "Note text", style: "flex:1;min-width:10rem" } );
						var save = btn( "check", "Save", function () {
							var text = input.value.trim();
							if ( !text || text === note.text ) { show(); return; }
							apiPost( "/notes/update", { scope: scope, id: note.id, text: text } ).then( function ( res ) {
								if ( res.ok ) { say( "Updated." ); return load(); }
								return failedText( res, "Could not update the note." ).then( say );
							} );
						}, "primary" );
						input.addEventListener( "keydown", function ( evt ) {
							if ( evt.key === "Enter" ) { evt.preventDefault(); save.click(); }
							if ( evt.key === "Escape" ) { evt.stopPropagation(); show(); }
						} );
						item.appendChild( input );
						item.appendChild( save );
						item.appendChild( btn( "x", "Cancel", show ) );
						input.focus();
					}
					show();
					list.appendChild( item );
				} );
				card.appendChild( list );
				var field = h( "input", { type: "text", maxlength: "500", placeholder: "Add a note", "aria-label": "Add a note: " + title, style: "flex:1;min-width:10rem" } );
				var form = h( "form", { class: "pg-actions", style: "margin-top:0.75rem" }, [ field, btn( "plus", "Add", null, "primary", { type: "submit" } ) ] );
				form.addEventListener( "submit", function ( evt ) {
					evt.preventDefault();
					var text = field.value.trim();
					if ( !text ) { return; }
					apiPost( "/notes", { scope: scope, text: text } ).then( function ( res ) {
						if ( res.ok ) { say( "Noted." ); return load(); }
						return failedText( res, "Could not add the note." ).then( say );
					} );
				} );
				card.appendChild( form );
			}

			function draw() {
				drawNotes( userCard, "user", "memUserTitle", "About you",
					"Facts about you that the agent keeps: your name, how you like answers. They are yours alone: nobody sees them, an admin included, and every agent and sub-agent you talk to uses them.", true );
				drawNotes( agentCard, "agent", "memAgentTitle", "Notes of the agent",
					"Lessons about the work itself. They are global: the agent and every sub-agent read and write the same set, and everyone who talks to the agent shares them.", !!capabilities.admin );
			}

			function load() {
				refreshContext();
				return apiGet( "/notes" ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !( payload && payload.success ) ) {
						userCard.textContent = "";
						userCard.appendChild( pageNote( "Could not load the notes.", "error" ) );
						return;
					}
					data = payload;
					draw();
				} );
			}

			// conversation memory: what each agent keeps of each conversation (filled in by drawConversationMemory below when the server offers it)
			convCard.appendChild( h( "h2", { id: "memConvTitle", text: "Conversation memory" } ) );
			convCard.appendChild( h( "p", { class: "pg-note", text: "The messages each agent keeps of each conversation. Every agent has its own, so a sub-agent you talk to directly keeps its own thread." } ) );
			var convBody = h( "div" );
			convCard.appendChild( convBody );
			memoryDrawConversations( convBody, route, say );
			load();
		}
	} );

	// Filled in below by the conversation memory part of the Memory page.
	function memoryDrawConversations( into ) {
		into.appendChild( h( "p", { class: "pg-note", text: "Recall search over past conversations is planned." } ) );
	}
