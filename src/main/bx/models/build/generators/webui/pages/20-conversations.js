	// ---- Page: Conversations. The whole list, paged and filtered by the server ----
	// GET /sessions takes limit, offset, q, source, agent, since, before and all (an admin: everyone's), and with
	// facets=1 answers the counts per source and agent, so the chips below say how many each would show.
	registerPage( {
		id: "conversations",
		title: "Conversations",
		icon: "chats-circle",
		group: "main",
		order: 20,
		cap: function ( caps ) { return caps.conversations !== false; },
		render: function ( host, route ) {
			var admin = !!capabilities.admin;
			var state = { q: route.params.q || "", source: route.params.source || null, agent: route.params.agent || "", since: "", before: "", all: false, limit: 25, offset: 0 };
			var selected = {};
			var rows = [];
			var total = 0;
			var facets = {};

			var search = h( "input", { type: "search", placeholder: "Search titles", "aria-label": "Search conversation titles", value: state.q } );
			var since = h( "input", { type: "date", "aria-label": "From this day" } );
			var before = h( "input", { type: "date", "aria-label": "Until this day" } );
			var whose = admin ? h( "select", { "aria-label": "Owner" }, [ h( "option", { value: "", text: "Mine" } ), h( "option", { value: "all", text: "Everyone's" } ) ] ) : null;
			var size = h( "select", { "aria-label": "Conversations per page" }, [ "25", "50", "100" ].map( function ( n ) { return h( "option", { value: n, text: n + " per page" } ); } ) );
			var root = pageFrame( host, "Conversations", admin ? "Every conversation you may see, newest first. Filter by title, agent, source, owner and date." : "Your conversations, newest first. Filter by title, agent, source and date.", [
				btn( "plus", "New chat", function () { shellGo( "chat" ); startConversation(); }, "primary" )
			] );
			var filters = h( "div", { class: "pg-actions", style: "margin-bottom:0.75rem" }, [
				search, h( "label", {}, [ "From ", since ] ), h( "label", {}, [ "Until ", before ] ), whose, size
			] );
			var chips = h( "div", { class: "pg-actions", style: "margin-bottom:0.75rem", "aria-label": "Filter by agent and source" } );
			var bulk = h( "div", { class: "card", hidden: true, role: "status", style: "margin-bottom:0.75rem" } );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var table = h( "div", { class: "tbl-wrap" } );
			var pager = h( "div", { class: "pg-actions", style: "margin-top:0.75rem;justify-content:space-between" } );
			[ filters, chips, bulk, status, table, pager ].forEach( function ( node ) { root.appendChild( node ); } );

			function say( text ) { status.textContent = text || ""; }
			function failedText( res, fallback ) {
				return res.json().then( function ( parsed ) { return ( parsed && ( parsed.reason || parsed.error ) ) || fallback; } ).catch( function () { return fallback; } );
			}

			function path() {
				return "/sessions?limit=" + state.limit + "&offset=" + state.offset + "&facets=1"
					+ ( state.q ? "&q=" + encodeURIComponent( state.q ) : "" )
					+ ( state.source !== null ? "&source=" + encodeURIComponent( state.source ) : "" )
					+ ( state.agent ? "&agent=" + encodeURIComponent( state.agent ) : "" )
					+ ( state.since ? "&since=" + encodeURIComponent( state.since ) : "" )
					+ ( state.before ? "&before=" + encodeURIComponent( state.before ) : "" )
					+ ( state.all ? "&all=1" : "" );
			}

			function sourceName( value ) { return value === "" ? "Web page" : value === "web" ? "Web page" : value; }

			function drawChips() {
				chips.textContent = "";
				function chip( label, count, on, pick, group ) {
					chips.appendChild( h( "button", { type: "button", class: "chip" + ( on ? " ok" : "" ), "aria-pressed": on ? "true" : "false", style: "min-height:2.75rem;border:1px solid var(--border);cursor:pointer", onclick: pick, title: group }, [
						on ? h( "span", { html: icon( "check" ) } ) : null, label + ( count !== undefined ? " (" + count + ")" : "" )
					] ) );
				}
				var agents = facets.agent || {};
				var sources = facets.source || {};
				var agentNames = Object.keys( agents );
				if ( agentNames.length > 1 || state.agent ) {
					chip( "Any agent", undefined, !state.agent, function () { state.agent = ""; state.offset = 0; load(); }, "Agent" );
					agentNames.forEach( function ( name ) {
						chip( name, agents[ name ], state.agent === name, function () { state.agent = state.agent === name ? "" : name; state.offset = 0; load(); }, "Agent" );
					} );
				}
				var sourceNames = Object.keys( sources );
				if ( sourceNames.length > 1 || state.source !== null ) {
					chip( "Any source", undefined, state.source === null, function () { state.source = null; state.offset = 0; load(); }, "Source" );
					sourceNames.forEach( function ( name ) {
						chip( sourceName( name ), sources[ name ], state.source === name, function () { state.source = state.source === name ? null : name; state.offset = 0; load(); }, "Source" );
					} );
				}
			}

			function selectedIds() { return Object.keys( selected ).filter( function ( id ) { return selected[ id ]; } ); }

			function drawBulk() {
				var ids = selectedIds();
				bulk.hidden = !ids.length;
				bulk.textContent = "";
				if ( !ids.length ) { return; }
				bulk.appendChild( h( "div", { class: "pg-actions" }, [
					h( "strong", { text: ids.length + " selected" } ),
					btn( "trash", "Delete selected", function () {
						if ( !window.confirm( "Delete " + ids.length + " conversation" + ( ids.length === 1 ? "" : "s" ) + " and their messages? This cannot be undone." ) ) { return; }
						Promise.all( ids.map( function ( id ) { return apiPost( "/sessions/delete", { conversationId: id } ); } ) ).then( function () {
							selected = {};
							say( "Deleted " + ids.length + "." );
							loadConversations();
							return load();
						} );
					}, "danger" ),
					btn( "x", "Clear selection", function () { selected = {}; draw(); } )
				] ) );
			}

			function download( conv ) {
				fetch( API_BASE + "/export?conversationId=" + encodeURIComponent( conv.id ) + "&format=md", { headers: authHeaders( {} ) } ).then( function ( res ) {
					if ( !res.ok ) { throw new Error( "export" ); }
					return res.blob();
				} ).then( function ( blob ) {
					var url = URL.createObjectURL( blob );
					var link = h( "a", { href: url, download: ( conv.title || "conversation" ).replace( /[^A-Za-z0-9._-]+/g, "-" ).slice( 0, 60 ) + ".md" } );
					document.body.appendChild( link );
					link.click();
					link.remove();
					setTimeout( function () { URL.revokeObjectURL( url ); }, 1000 );
					say( "Exported " + ( conv.title || "the conversation" ) + "." );
				} ).catch( function () { say( "Could not export that conversation." ); } );
			}

			function draw() {
				drawChips();
				drawBulk();
				table.textContent = "";
				if ( !rows.length ) {
					table.appendChild( pageNote( state.q || state.source !== null || state.agent || state.since || state.before ? "No conversation matches those filters." : "No conversations yet. Start one from Chat." ) );
					pager.textContent = "";
					return;
				}
				var everyone = state.all;
				var allOn = rows.every( function ( r ) { return selected[ r.id ]; } );
				var master = h( "input", { type: "checkbox", "aria-label": "Select every conversation on this page", checked: allOn } );
				master.addEventListener( "change", function () { rows.forEach( function ( r ) { selected[ r.id ] = master.checked; } ); draw(); } );
				var body = h( "tbody" );
				rows.forEach( function ( conv ) {
					var pick = h( "input", { type: "checkbox", "aria-label": "Select " + ( conv.title || "Untitled" ), checked: !!selected[ conv.id ] } );
					pick.addEventListener( "change", function () { selected[ conv.id ] = pick.checked; drawBulk(); } );
					var open = h( "a", { href: "#/chat", class: "row-link", text: conv.title || "Untitled" } );
					open.addEventListener( "click", function ( evt ) {
						evt.preventDefault();
						shellGo( "chat" );
						selectConversation( conv.id );
					} );
					body.appendChild( h( "tr", {}, [
						h( "td", {}, [ pick ] ),
						h( "td", {}, [ open ] ),
						h( "td", {}, [ h( "span", { class: "chip" }, [ h( "span", { html: icon( "robot" ) } ), conv.agent || "main" ] ) ] ),
						h( "td", {}, [ h( "span", { class: "chip" }, [ sourceName( conv.source || "" ) ] ) ] ),
						everyone ? h( "td", { text: conv.userId || "" } ) : null,
						h( "td", { text: String( conv.messageCount || 0 ) } ),
						h( "td", { text: stampText( conv.updatedAt ) } ),
						h( "td", {}, [ h( "div", { class: "pg-actions", style: "flex-wrap:nowrap" }, [
							btn( "chat-circle-text", "", function () { shellGo( "chat" ); selectConversation( conv.id ); }, "icon", { title: "Open", "aria-label": "Open " + ( conv.title || "Untitled" ) } ),
							btn( "pencil-simple", "", function () {
								var next = window.prompt( "Rename this conversation", conv.title || "" );
								if ( next === null || !next.trim() ) { return; }
								apiPost( "/sessions/rename", { conversationId: conv.id, title: next.trim() } ).then( function ( res ) {
									if ( !res.ok ) { return failedText( res, "Could not rename that conversation." ).then( say ); }
									loadConversations();
									return load();
								} );
							}, "icon", { title: "Rename", "aria-label": "Rename " + ( conv.title || "Untitled" ) } ),
							btn( "git-fork", "", function () {
								var name = window.prompt( "Name for the copy (blank: Fork of this one)", "" );
								if ( name === null ) { return; }
								apiPost( "/sessions/fork", { conversationId: conv.id, title: name.trim() } ).then( function ( res ) {
									if ( res.ok ) { say( "Forked." ); loadConversations(); return load(); }
									return failedText( res, "Could not fork that conversation." ).then( say );
								} );
							}, "icon", { title: "Fork", "aria-label": "Fork " + ( conv.title || "Untitled" ) } ),
							btn( "download-simple", "", function () { download( conv ); }, "icon", { title: "Export as Markdown", "aria-label": "Export " + ( conv.title || "Untitled" ) } ),
							btn( "trash", "", function () {
								if ( !window.confirm( "Delete this conversation and its messages?" ) ) { return; }
								apiPost( "/sessions/delete", { conversationId: conv.id } ).then( function ( res ) {
									if ( !res.ok ) { return failedText( res, "Could not delete that conversation." ).then( say ); }
									delete selected[ conv.id ];
									say( "Deleted." );
									loadConversations();
									return load();
								} );
							}, "icon danger", { title: "Delete", "aria-label": "Delete " + ( conv.title || "Untitled" ) } )
						] ) ] )
					] ) );
				} );
				table.appendChild( h( "table", {}, [
					h( "caption", { class: "visually-hidden", text: "Conversations" } ),
					h( "thead", {}, [ h( "tr", {}, [
						h( "th", { scope: "col" }, [ master ] ), h( "th", { scope: "col", text: "Title" } ), h( "th", { scope: "col", text: "Agent" } ), h( "th", { scope: "col", text: "Source" } ),
						everyone ? h( "th", { scope: "col", text: "Owner" } ) : null, h( "th", { scope: "col", text: "Messages" } ), h( "th", { scope: "col", text: "Updated" } ), h( "th", { scope: "col", text: "Actions" } )
					] ) ] ),
					body
				] ) );
				var from = state.offset + 1;
				var to = state.offset + rows.length;
				pager.textContent = "";
				pager.appendChild( h( "span", { class: "pg-note", role: "status", text: "Showing " + from + " to " + to + " of " + total } ) );
				pager.appendChild( h( "div", { class: "pg-actions" }, [
					btn( "caret-left", "Previous", function () { state.offset = Math.max( 0, state.offset - state.limit ); load(); }, "", state.offset > 0 ? {} : { disabled: true } ),
					btn( "caret-right", "Next", function () { state.offset += state.limit; load(); }, "", to < total ? {} : { disabled: true } )
				] ) );
			}

			function load() {
				return apiGet( path() ).then( function ( payload ) {
					if ( route.stale() ) { return; }
					if ( !payload ) {
						table.textContent = "";
						table.appendChild( pageNote( "Could not load the conversations.", "error" ) );
						return;
					}
					rows = payload.sessions || [];
					total = typeof payload.total === "number" ? payload.total : rows.length;
					facets = payload.facets || {};
					// a page past the end (the last row of a page was deleted): step back
					if ( !rows.length && state.offset > 0 ) { state.offset = Math.max( 0, state.offset - state.limit ); return load(); }
					draw();
				} );
			}

			search.addEventListener( "input", function () {
				clearTimeout( search._t );
				search._t = setTimeout( function () { state.q = search.value.trim(); state.offset = 0; load(); }, 300 );
			} );
			since.addEventListener( "change", function () { state.since = since.value; state.offset = 0; load(); } );
			before.addEventListener( "change", function () { state.before = before.value; state.offset = 0; load(); } );
			size.addEventListener( "change", function () { state.limit = parseInt( size.value, 10 ); state.offset = 0; load(); } );
			if ( whose ) { whose.addEventListener( "change", function () { state.all = whose.value === "all"; state.offset = 0; selected = {}; load(); } ); }
			load();
		}
	} );
