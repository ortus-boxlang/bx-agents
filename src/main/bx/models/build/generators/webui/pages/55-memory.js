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

	/**
	 * Conversation memory: the messages each agent keeps of each conversation, one set per agent and conversation.
	 * Clearing keeps the conversation and forgets what was said. A person clears their own; an admin may clear every
	 * conversation of one agent, or of all of them.
	 */
	function memoryDrawConversations( into, route, say ) {
		var admin = !!capabilities.admin;
		var agentKey = agentTree.length > 1 ? ( mainAgentName || "" ) : "";
		var pick = h( "select", { "aria-label": "Agent whose conversation memory to show" } );
		var agents = agentTree.length ? agentTree : [ { name: mainAgentName || "the agent", parent: "" } ];
		agents.forEach( function ( a ) { pick.appendChild( h( "option", { value: a.parent ? a.name : ( mainAgentName || "" ), text: a.name + ( a.parent ? "" : " (main)" ) } ) ); } );
		var bar = h( "div", { class: "pg-actions", style: "margin-bottom:0.5rem" }, [ agents.length > 1 ? h( "label", {}, [ "Agent ", pick ] ) : null ] );
		var list = h( "ul", { "aria-label": "Conversation memory", style: "list-style:none;margin:0;padding:0" } );
		into.appendChild( bar );
		into.appendChild( list );
		function failedText( res, fallback ) {
			return res.json().then( function ( parsed ) { return ( parsed && ( parsed.reason || parsed.error ) ) || fallback; } ).catch( function () { return fallback; } );
		}
		function draw( rows, total ) {
			list.textContent = "";
			bar.querySelectorAll( ".mem-clear-all" ).forEach( function ( n ) { n.remove(); } );
			if ( admin && total ) {
				var all = btn( "broom", "Clear all conversation memory" + ( agents.length > 1 ? " of this agent" : "" ), function () {
					if ( !window.confirm( "Forget the messages of all " + total + " conversations" + ( agentKey ? " of " + agentKey : "" ) + "? The conversations stay, empty. This cannot be undone." ) ) { return; }
					apiPost( "/memory/clear", agentKey ? { all: true, agent: agentKey } : { all: true } ).then( function ( res ) {
						if ( !res.ok ) { return failedText( res, "Could not clear the memory." ).then( say ); }
						return res.json().then( function ( made ) { say( "Cleared " + made.messages + " messages in " + made.conversations + " conversations." ); return load(); } );
					} );
				}, "danger" );
				all.classList.add( "mem-clear-all" );
				bar.appendChild( all );
			}
			if ( !rows.length ) {
				list.appendChild( h( "li", {}, [ pageNote( "No conversations with this agent yet." ) ] ) );
				return;
			}
			rows.forEach( function ( conv ) {
				list.appendChild( h( "li", { style: "display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;padding:0.4rem 0;border-top:1px solid var(--border)" }, [
					h( "span", { style: "flex:1;min-width:10rem", text: conv.title || "Untitled" } ),
					h( "span", { class: "chip" }, [ ( conv.messageCount || 0 ) + " messages" ] ),
					h( "span", { class: "pg-note", text: stampText( conv.updatedAt ) } ),
					btn( "broom", "Clear", function () {
						if ( !window.confirm( "Forget the " + ( conv.messageCount || 0 ) + " messages of this conversation? The conversation stays." ) ) { return; }
						apiPost( "/memory/clear", { conversationId: conv.id } ).then( function ( res ) {
							if ( !res.ok ) { return failedText( res, "Could not clear that conversation." ).then( say ); }
							say( "Cleared." );
							loadConversations();
							return load();
						} );
					}, "danger", { "aria-label": "Clear the memory of " + ( conv.title || "Untitled" ), disabled: conv.messageCount ? undefined : true } )
				] ) );
			} );
			if ( total > rows.length ) {
				list.appendChild( h( "li", { class: "pg-note", style: "padding:0.5rem 0" }, [ "Showing the newest " + rows.length + " of " + total + ". ", h( "a", { href: "#/conversations" + ( agentKey ? "?agent=" + encodeURIComponent( agentKey ) : "" ), text: "All of them in Conversations" } ) ] ) );
			}
		}
		function load() {
			return apiGet( "/sessions?limit=25" + ( agentKey ? "&agent=" + encodeURIComponent( agentKey ) : "" ) ).then( function ( payload ) {
				if ( route.stale() ) { return; }
				if ( !payload ) { list.textContent = ""; list.appendChild( h( "li", {}, [ pageNote( "Could not load the conversations.", "error" ) ] ) ); return; }
				var rows = payload.sessions || [];
				draw( rows, typeof payload.total === "number" ? payload.total : rows.length );
			} );
		}
		pick.addEventListener( "change", function () { agentKey = pick.value; load(); } );
		into.appendChild( h( "p", { class: "pg-note", text: "Recall search over past conversations is planned." } ) );
		load();
	}
