	// ---- Page: Data and backups (admin). Where everything is kept, and backups of it ----
	registerPage( {
		id: "data",
		title: "Data and backups",
		icon: "database",
		group: "admin",
		order: 150,
		cap: function ( caps ) { return !!caps.admin; },
		render: function ( host, route ) {
			var make = btn( "cloud-arrow-up", "Make a backup", function () {
				make.disabled = true;
				say( "Making a backup..." );
				routinesCall( "POST", "/data/backup", {} ).then( function ( result ) {
					make.disabled = false;
					say( result.ok ? "Made " + result.body.name + " (" + BYTES_TEXT( result.body.bytes ) + ", " + result.body.entries + " files)." : failureText( result, "Could not make a backup." ) );
					return loadBackups();
				} );
			}, "primary" );
			var root = pageFrame( host, "Data and backups", "Where the agent keeps its conversations, notes, routines, logs and files, and backups of all of it.", [ make ] );
			var status = h( "p", { class: "pg-status", role: "status", "aria-live": "polite" } );
			var where = h( "section", { class: "card", "aria-labelledby": "dataWhere" }, [ h( "h2", { id: "dataWhere", style: "margin-top:0", text: "Where it is kept" } ) ] );
			var backupsCard = h( "section", { class: "card", style: "margin-top:0.75rem", "aria-labelledby": "dataBackups" }, [ h( "h2", { id: "dataBackups", style: "margin-top:0", text: "Backups" } ) ] );
			[ status, where, backupsCard ].forEach( function ( n ) { root.appendChild( n ); } );
			function say( text ) { status.textContent = text || ""; }

			apiGet( "/data" ).then( function ( d ) {
				if ( route.stale() ) { return; }
				if ( !d ) { where.appendChild( pageNote( "Could not load the data folders.", "error" ) ); return; }
				where.appendChild( h( "p", { class: "pg-note" }, [ "Data home: ", h( "code", { text: d.home || "" } ), d.database ? " Database: " : null, d.database ? h( "code", { text: d.database } ) : null ] ) );
				var rows = h( "tbody" );
				( d.items || [] ).forEach( function ( i ) { rows.appendChild( h( "tr", {}, [ h( "td", { text: i.name } ), h( "td", { text: BYTES_TEXT( i.bytes ) } ), h( "td", { text: String( i.files ) } ) ] ) ); } );
				where.appendChild( h( "div", { class: "tbl-wrap" }, [ h( "table", {}, [ h( "caption", { class: "visually-hidden", text: "Folders of the data home" } ),
					h( "thead", {}, [ h( "tr", {}, [ h( "th", { scope: "col", text: "Folder" } ), h( "th", { scope: "col", text: "Size" } ), h( "th", { scope: "col", text: "Files" } ) ] ) ] ), rows ] ) ] ) );
				if ( ( d.volumes || [] ).length ) {
					where.appendChild( h( "h2", { text: "Volumes" } ) );
					d.volumes.forEach( function ( v ) { where.appendChild( h( "p", { class: "pg-note" }, [ h( "strong", { text: v.name } ), " (" + ( v.mode === "rw" ? "read and write" : "read only" ) + "): ", h( "code", { text: v.path } ) ] ) ); } );
				}
			} );

			var listHost = h( "div" );
			backupsCard.appendChild( listHost );
			function download( b ) {
				fetch( API_BASE + "/data/backup?name=" + encodeURIComponent( b.name ), { headers: authHeaders( {} ) } ).then( function ( res ) {
					if ( !res.ok ) { throw new Error( "download" ); }
					return res.blob();
				} ).then( function ( blob ) {
					var url = URL.createObjectURL( blob );
					var link = h( "a", { href: url, download: b.name } );
					document.body.appendChild( link );
					link.click();
					link.remove();
					setTimeout( function () { URL.revokeObjectURL( url ); }, 1000 );
				} ).catch( function () { say( "Could not download " + b.name + "." ); } );
			}
			function loadBackups() {
				return routinesCall( "GET", "/data/backups" ).then( function ( result ) {
					if ( route.stale() ) { return; }
					listHost.textContent = "";
					if ( !result.ok ) { listHost.appendChild( pageNote( failureText( result, "Could not load the backups." ), "error" ) ); return; }
					var pending = result.body.pending || {};
					if ( pending.name ) {
						listHost.appendChild( h( "p", { class: "pg-note", role: "status" }, [ h( "span", { html: icon( "clock" ) } ), " Restoring " + pending.name + " is scheduled for the next start" + ( pending.scheduledAt ? " (asked " + stampText( pending.scheduledAt ) + ")" : "" ) + ". The data as it is now is kept as before-restore." ] ) );
					}
					var backups = result.body.backups || [];
					if ( !backups.length ) { listHost.appendChild( pageNote( "No backups yet. Make a backup above." ) ); return; }
					var rows = h( "tbody" );
					backups.forEach( function ( b ) {
						rows.appendChild( h( "tr", {}, [
							h( "td", { text: b.name } ), h( "td", { text: BYTES_TEXT( b.bytes ) } ), h( "td", { text: stampText( b.madeAt ) } ),
							h( "td", {}, [ h( "div", { class: "pg-actions", style: "flex-wrap:nowrap" }, [
								btn( "download-simple", "Download", function () { download( b ); }, "", { "aria-label": "Download " + b.name } ),
								btn( "cloud-arrow-down", "Restore", function () {
									if ( !window.confirm( "Restore " + b.name + " the next time the app starts? The data as it is now is kept as before-restore." ) ) { return; }
									routinesCall( "POST", "/data/restore", { name: b.name } ).then( function ( r ) {
										say( r.ok ? ( r.body.note || "Restore scheduled for the next start." ) : failureText( r, "Could not schedule the restore." ) );
										return loadBackups();
									} );
								}, "", { "aria-label": "Restore " + b.name } )
							] ) ] )
						] ) );
					} );
					listHost.appendChild( h( "div", { class: "tbl-wrap" }, [ h( "table", {}, [ h( "caption", { class: "visually-hidden", text: "Backups" } ),
						h( "thead", {}, [ h( "tr", {}, [ h( "th", { scope: "col", text: "Name" } ), h( "th", { scope: "col", text: "Size" } ), h( "th", { scope: "col", text: "Made" } ), h( "th", { scope: "col", text: "Actions" } ) ] ) ] ), rows ] ) ] ) );
				} );
			}
			loadBackups();
		}
	} );
