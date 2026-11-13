	// ---- Page: Routines (a member sees their own; an admin sees everyone's) ----
	// The list, the filters and the actions are drawn here. The two dialogs (the editor with its live
	// schedule reading, and the reports) are the page's own routineEditor and routineReports, opened
	// with openRoutineEditor and openRoutineReports; they call routinesHook after saving.
	var ROUTINE_KIND = {
		"ok": [ "ok", "check-circle" ],
		"failed last time": [ "bad", "warning-circle" ],
		"paused after failures": [ "bad", "pause" ],
		"paused": [ "", "pause" ],
		"not run yet": [ "", "clock" ],
		"running": [ "warn", "circle-notch" ],
		"waiting for approval": [ "warn", "hand-palm" ]
	};

	function routineAttention( r ) {
		return r.statusText === "failed last time" || r.statusText === "paused after failures";
	}

	registerPage( {
		id: "routines",
		title: "Routines",
		icon: "clock-clockwise",
		group: "main",
		order: 30,
		cap: function ( caps ) { return !!caps.routines; },
		replaces: [ "routinesBtn" ],
		render: function ( host, route ) {
			var admin = !!capabilities.admin;
			var rows = [];
			var ownerSel = admin ? h( "select", { id: "rtOwner", "aria-label": "Owner" }, [ h( "option", { value: "", text: "All owners" } ) ] ) : null;
			var attention = admin ? h( "input", { type: "checkbox", id: "rtAttention" } ) : null;
			var refreshBtn = btn( "arrow-clockwise", "Refresh", function () { load(); } );
			var actions = [];
			if ( admin ) {
				actions.push( ownerSel );
				actions.push( h( "label", {}, [ attention, " Needs attention only" ] ) );
			}
			actions.push( refreshBtn );
			actions.push( btn( "plus", "New routine", function () { openRoutineEditor( null, "" ); }, "primary" ) );
			var root = pageFrame(
				host,
				admin ? "Routines" : "Your routines",
				admin
					? "Everyone's scheduled work. Admins see every owner's routines, can pause or run any of them, and can send an answer to a gateway chat. A person sees only their own."
					: "Things the agent does on a schedule, as you, with your notes, volumes and approvals. Each keeps its answers in a conversation of its own, or sends a summary to your own gateway chat.",
				actions
			);
			if ( !admin ) {
				root.appendChild( h( "p", { class: "pg-note" }, [ h( "span", { html: icon( "info" ) } ), " You see only your own routines. Only an admin can see everyone's or send an answer to another gateway chat. Ask the agent in chat to make one, or use New routine." ] ) );
			}
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var summary = h( "div", { class: "pg-actions", "aria-label": "Summary" } );
			var list = h( "ul", { "aria-label": "Routines", style: "list-style:none;margin:0;padding:0" } );
			root.appendChild( status );
			if ( admin ) { root.appendChild( summary ); }
			root.appendChild( list );
			root.appendChild( h( "p", { class: "pg-note", text: "Run now marks a routine due and the heartbeat starts it within a minute." } ) );

			function say( text ) { status.textContent = text || ""; }

			function act( path, ref, done ) {
				routinesCall( "POST", path, { name: ref } ).then( function ( result ) {
					say( result.ok ? done : failureText( result, "That did not work." ) );
					return load();
				} );
			}

			function drawSummary() {
				summary.textContent = "";
				var counts = { ok: 0, wait: 0, attention: 0, paused: 0 };
				rows.forEach( function ( r ) {
					if ( r.statusText === "ok" ) { counts.ok++; }
					if ( r.statusText === "waiting for approval" ) { counts.wait++; }
					if ( routineAttention( r ) ) { counts.attention++; }
					if ( !r.enabled ) { counts.paused++; }
				} );
				[ [ "", "stack", rows.length + " routine" + ( rows.length === 1 ? "" : "s" ) ], [ "ok", "check-circle", counts.ok + " ok" ],
				  [ "warn", "hand-palm", counts.wait + " waiting for approval" ], [ "bad", "warning-circle", counts.attention + " needs attention" ],
				  [ "", "pause", counts.paused + " paused" ] ].forEach( function ( c ) {
					summary.appendChild( h( "span", { class: "chip " + c[ 0 ] }, [ h( "span", { html: icon( c[ 1 ] ) } ), c[ 2 ] ] ) );
				} );
			}

			function draw() {
				list.textContent = "";
				var owner = ownerSel ? ownerSel.value : "";
				var shown = rows.filter( function ( r ) {
					return ( !owner || r.ownerId === owner ) && ( !attention || !attention.checked || routineAttention( r ) );
				} );
				if ( !shown.length ) {
					list.appendChild( h( "li", {}, [ pageNote( admin ? "Nobody has a routine yet." : "No routines yet. Use New routine, or ask the agent: check the build every weekday at 9." ) ] ) );
					return;
				}
				shown.forEach( function ( r ) {
					var kind = ROUTINE_KIND[ r.statusText ] || [ "", "clock" ];
					var all = admin && r.ownerId;
					var ref = all ? r.id : r.name;
					var who = "routine " + r.name;
					var destination = r.destination === "routine" ? "its own conversation" : r.destination + ( r.destinationChat ? " (chat " + r.destinationChat + ")" : "" );
					var card = h( "li", { class: "card", style: "margin-bottom:0.75rem" }, [
						h( "div", { class: "pg-actions" }, [
							h( "strong", { text: r.name } ),
							h( "span", { class: "chip " + kind[ 0 ] }, [ h( "span", { html: icon( kind[ 1 ] ) } ), r.statusText ] ),
							h( "span", { class: "pg-note", text: r.scheduleText + " (" + r.schedule + ")" } ),
							all ? h( "span", { class: "chip" }, [ h( "span", { html: icon( "user" ) } ), "Owner " + r.ownerId ] ) : null
						] ),
						h( "p", { class: "pg-note", text: "Next run: " + ( r.nextRunText || "none" ) + ". Last run: " + ( r.lastRunText ? r.lastRunText + ", " + r.lastStatus : "never" ) + ". Answers go to " + destination + "." } ),
						r.lastError ? h( "p", { class: "pg-error", role: "status" }, [ h( "span", { html: icon( "warning-circle" ) } ), "Last error: " + r.lastError ] ) : null,
						h( "div", { class: "pg-actions" }, [
							btn( "play", "Run now", function () { act( "/routines/run", ref, "Marked " + r.name + " due. It starts within a minute." ); }, "", { "aria-label": "Run " + who + " now" } ),
							r.enabled
								? btn( "pause", "Pause", function () { act( "/routines/pause", ref, "Paused " + r.name + "." ); }, "", { "aria-label": "Pause " + who } )
								: btn( "play-circle", "Resume", function () { act( "/routines/resume", ref, "Resumed " + r.name + "." ); }, r.lastError ? "primary" : "", { "aria-label": "Resume " + who } ),
							btn( "pencil-simple", "Edit", function () { openRoutineEditor( r, ref ); }, "", { "aria-label": "Edit " + who } ),
							btn( "file-text", "Reports", function () { openRoutineReports( r, ref ); }, "", { "aria-label": "Reports of " + who } ),
							all ? null : btn( "chat-circle-text", "Open conversation", function () {
								shellGo( "chat" );
								loadConversations().then( function () { return selectConversation( r.conversationId ); } );
							}, "", { "aria-label": "Open the conversation of " + who } ),
							btn( "trash", "Delete", function () {
								if ( window.confirm( "Delete the routine " + r.name + "? Its reports are kept." ) ) {
									act( "/routines/delete", ref, "Deleted " + r.name + "." );
								}
							}, "danger", { "aria-label": "Delete " + who } )
						] )
					] );
					list.appendChild( card );
				} );
			}

			function load() {
				return routinesCall( "GET", "/routines" + ( admin ? "?all=1" : "" ) ).then( function ( result ) {
					if ( route.stale() ) { return; }
					if ( !result.ok ) {
						rows = [];
						list.textContent = "";
						list.appendChild( h( "li", {}, [ pageNote( failureText( result, "Could not load the routines." ), "error" ) ] ) );
						return;
					}
					rows = result.body.routines || [];
					if ( ownerSel ) {
						var chosen = ownerSel.value;
						var owners = [];
						rows.forEach( function ( r ) { if ( r.ownerId && owners.indexOf( r.ownerId ) < 0 ) { owners.push( r.ownerId ); } } );
						ownerSel.textContent = "";
						ownerSel.appendChild( h( "option", { value: "", text: "All owners" } ) );
						owners.forEach( function ( o ) { ownerSel.appendChild( h( "option", { value: o, text: o } ) ); } );
						ownerSel.value = owners.indexOf( chosen ) >= 0 ? chosen : "";
					}
					drawSummary();
					draw();
				} );
			}

			if ( ownerSel ) { ownerSel.addEventListener( "change", draw ); }
			if ( attention ) { attention.addEventListener( "change", draw ); }
			// a dialog saved something: say so, and draw again
			routinesHook = function () {
				if ( route.stale() ) { return; }
				say( routinesFoot.textContent );
				load();
			};
			load();
			return function () { routinesHook = null; };
		}
	} );
