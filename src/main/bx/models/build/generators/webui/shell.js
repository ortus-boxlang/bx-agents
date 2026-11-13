	// ---- Shell: the left menu, the hash router and the page registry ----
	// Injected into the page's one script by WebUiGenerator (the shell script token), so it shares
	// apiGet, apiPost, capabilities, icon and showHint with the chat. A page is registered once
	// with registerPage() and drawn into #pageView when its hash (#/<id>) is open. The chat is the
	// one page that stays in the document (#page-chat), so a conversation in flight is never lost
	// by looking at another page.
	var pageDefs = {};
	var pageOrder = [];
	var pageBadges = {};
	var currentPageId = "";
	var shownPageId = "";
	var renderSeq = 0;
	var currentLeave = null;
	var shellReady = false;
	var NAV_STORAGE = "bxagents.nav";
	var appTitleText = document.title;
	var navEl = document.getElementById( "mainNav" );
	var navListEl = document.getElementById( "navList" );
	var navBtn = document.getElementById( "navBtn" );
	var navFoldBtn = document.getElementById( "navFold" );
	var navFoldLabel = document.getElementById( "navFoldLabel" );
	var pageChatEl = document.getElementById( "page-chat" );
	var pageViewEl = document.getElementById( "pageView" );
	var navMedia = window.matchMedia ? window.matchMedia( "(max-width: 40rem)" ) : null;

	/**
	 * def: { id, title, icon, group ("main" | "admin"), cap(capabilities) -> bool,
	 *        order (menu position), render(host, route), leave(),
	 *        badgeWord (spoken after a badge count) }
	 */
	function registerPage( def ) {
		if ( !pageDefs[ def.id ] ) {
			pageOrder.push( def.id );
		}
		pageDefs[ def.id ] = def;
	}

	function pageAvailable( def ) {
		try {
			return !def.cap || !!def.cap( capabilities );
		} catch ( err ) {
			return false;
		}
	}

	/** Builds an element: h( "div", { class: "x", text: "...", onclick: fn }, [ children ] ) */
	function h( tag, attrs, kids ) {
		var node = document.createElement( tag );
		Object.keys( attrs || {} ).forEach( function ( key ) {
			var value = attrs[ key ];
			if ( value === null || value === undefined || value === false ) {
				return;
			}
			if ( key === "class" ) {
				node.className = value;
			} else if ( key === "text" ) {
				node.textContent = value;
			} else if ( key === "html" ) {
				node.innerHTML = value;
			} else if ( key.indexOf( "on" ) === 0 && typeof value === "function" ) {
				node.addEventListener( key.slice( 2 ), value );
			} else if ( value === true ) {
				node.setAttribute( key, "" );
			} else {
				node.setAttribute( key, value );
			}
		} );
		( kids || [] ).forEach( function ( kid ) {
			if ( kid === null || kid === undefined || kid === false ) {
				return;
			}
			node.appendChild( typeof kid === "string" ? document.createTextNode( kid ) : kid );
		} );
		return node;
	}

	/** A button with an icon and a word: btn( "plus", "New", fn, "primary" ) */
	function btn( iconName, label, onClick, kind, extra ) {
		var attrs = { type: "button", class: "btn" + ( kind ? " " + kind : "" ), onclick: onClick };
		Object.keys( extra || {} ).forEach( function ( key ) { attrs[ key ] = extra[ key ]; } );
		return h( "button", attrs, [ h( "span", { html: icon( iconName ) } ), label ? h( "span", { text: label } ) : null ] );
	}

	/** The title bar every page opens with. Returns the element the page fills. */
	function pageFrame( host, title, subtitle, actions ) {
		var root = h( "div", { class: "pg" } );
		var titles = h( "div", { class: "pg-title" }, [
			h( "h1", { text: title, tabindex: "-1" } ),
			subtitle ? h( "p", { text: subtitle } ) : null
		] );
		root.appendChild( h( "div", { class: "pg-head" }, [ titles, actions && actions.length ? h( "div", { class: "pg-actions" }, actions ) : null ] ) );
		host.appendChild( root );
		return root;
	}

	/** Tabs inside a page, kept in the hash: #/registry/skills */
	function pageTabs( id, tabs, active ) {
		var wrap = h( "nav", { class: "pg-tabs", "aria-label": "Sections" } );
		tabs.forEach( function ( tab ) {
			wrap.appendChild( h( "a", {
				href: "#/" + id + "/" + tab.id,
				"aria-current": tab.id === active ? "page" : null
			}, [ h( "span", { html: icon( tab.icon ) } ), tab.title ] ) );
		} );
		return wrap;
	}

	function pageNote( text, kind ) {
		return h( "p", { class: kind === "error" ? "pg-error" : "pg-empty", role: kind === "error" ? "alert" : null }, [
			kind === "error" ? h( "span", { html: icon( "warning-circle" ) } ) : null,
			text
		] );
	}

	// ---- the menu ----
	function buildNav() {
		navListEl.textContent = "";
		[ [ "main", "Main" ], [ "admin", "Admin" ] ].forEach( function ( group ) {
			var defs = pageOrder.map( function ( id ) { return pageDefs[ id ]; } ).filter( function ( def ) {
				return ( def.group || "main" ) === group[ 0 ] && pageAvailable( def );
			} ).sort( function ( a, b ) { return ( a.order || 50 ) - ( b.order || 50 ); } );
			if ( !defs.length ) {
				return;
			}
			var headingId = "navGroup-" + group[ 0 ];
			navListEl.appendChild( h( "h2", { class: "nav-group", id: headingId, text: group[ 1 ] } ) );
			var list = h( "ul", { "aria-labelledby": headingId } );
			defs.forEach( function ( def ) {
				var link = h( "a", { class: "nav-item", href: "#/" + def.id, "data-page": def.id, title: def.title }, [
					h( "span", { html: icon( def.icon ) } ),
					h( "span", { class: "nav-label", text: def.title } ),
					h( "span", { class: "nav-badge", hidden: true }, [] ),
					h( "span", { class: "visually-hidden nav-word", text: def.badgeWord ? " " + def.badgeWord : "" } )
				] );
				link.addEventListener( "click", closeDrawer );
				list.appendChild( h( "li", {}, [ link ] ) );
			} );
			navListEl.appendChild( list );
		} );
		Object.keys( pageBadges ).forEach( function ( id ) { shellBadge( id, pageBadges[ id ] ); } );
		markCurrent();
	}

	function markCurrent() {
		navListEl.querySelectorAll( "a.nav-item" ).forEach( function ( link ) {
			if ( link.getAttribute( "data-page" ) === currentPageId ) {
				link.setAttribute( "aria-current", "page" );
			} else {
				link.removeAttribute( "aria-current" );
			}
		} );
	}

	/** The count beside a menu item (the error count on Logs). Zero hides it. */
	function shellBadge( id, count ) {
		pageBadges[ id ] = count;
		var link = navListEl.querySelector( 'a[data-page="' + id + '"]' );
		if ( !link ) {
			return;
		}
		var badge = link.querySelector( ".nav-badge" );
		badge.textContent = count > 99 ? "99+" : String( count );
		badge.hidden = !( count > 0 );
		link.querySelector( ".nav-word" ).hidden = !( count > 0 );
	}

	function readNavFold() {
		try {
			var saved = localStorage.getItem( NAV_STORAGE );
			if ( saved ) {
				return saved === "folded";
			}
		} catch ( err ) { /* a private window: no saved choice */ }
		// no choice made yet: a tablet-sized window starts with the menu folded so the chat has room
		return window.innerWidth <= 1024;
	}

	function setNavFolded( folded, remember ) {
		if ( folded ) {
			document.body.setAttribute( "data-nav", "folded" );
		} else {
			document.body.removeAttribute( "data-nav" );
		}
		navFoldBtn.setAttribute( "aria-expanded", folded ? "false" : "true" );
		navFoldLabel.textContent = folded ? "Unfold menu" : "Fold menu";
		navFoldBtn.title = folded ? "Show the menu with words" : "Fold the menu to icons";
		if ( remember ) {
			try {
				localStorage.setItem( NAV_STORAGE, folded ? "folded" : "open" );
			} catch ( err ) { /* a private window: the choice just is not remembered */ }
		}
	}

	function drawerOpen() {
		return document.body.getAttribute( "data-drawer" ) === "open";
	}

	function openDrawer() {
		document.body.setAttribute( "data-drawer", "open" );
		navBtn.setAttribute( "aria-expanded", "true" );
		var first = navListEl.querySelector( 'a[aria-current="page"]' ) || navListEl.querySelector( "a" );
		if ( first ) {
			first.focus();
		}
	}

	function closeDrawer() {
		if ( !drawerOpen() ) {
			return;
		}
		document.body.removeAttribute( "data-drawer" );
		navBtn.setAttribute( "aria-expanded", "false" );
	}

	navBtn.addEventListener( "click", function () {
		if ( drawerOpen() ) {
			closeDrawer();
			navBtn.focus();
		} else {
			openDrawer();
		}
	} );
	document.getElementById( "navScrim" ).addEventListener( "click", function () {
		closeDrawer();
		navBtn.focus();
	} );
	document.addEventListener( "keydown", function ( evt ) {
		if ( !drawerOpen() ) {
			return;
		}
		if ( evt.key === "Escape" ) {
			closeDrawer();
			navBtn.focus();
			return;
		}
		if ( evt.key === "Tab" ) {
			// a drawer is modal: Tab stays among the menu's own controls
			// only what can take focus now: the fold button is not drawn on a phone
			var stops = Array.prototype.slice.call( navEl.querySelectorAll( "a[href], button:not([hidden])" ) ).filter( function ( el ) { return el.getClientRects().length > 0; } );
			if ( !stops.length ) {
				return;
			}
			var first = stops[ 0 ];
			var last = stops[ stops.length - 1 ];
			if ( evt.shiftKey && document.activeElement === first ) {
				evt.preventDefault();
				last.focus();
			} else if ( !evt.shiftKey && document.activeElement === last ) {
				evt.preventDefault();
				first.focus();
			}
		}
	} );
	if ( navMedia && navMedia.addEventListener ) {
		navMedia.addEventListener( "change", function ( evt ) {
			if ( !evt.matches ) {
				closeDrawer();
			}
		} );
	}
	navFoldBtn.addEventListener( "click", function () {
		setNavFolded( document.body.getAttribute( "data-nav" ) !== "folded", true );
	} );

	// ---- the router ----
	function parseRoute() {
		// #/logs/gateways?q=telegram : the page, a section of it, and a few words for it to open with
		var hash = String( window.location.hash || "" ).replace( /^#\/?/, "" );
		var cut = hash.indexOf( "?" );
		var parts = ( cut < 0 ? hash : hash.slice( 0, cut ) ).split( "/" );
		var params = {};
		if ( cut >= 0 ) {
			hash.slice( cut + 1 ).split( "&" ).forEach( function ( pair ) {
				var kv = pair.split( "=" );
				if ( kv[ 0 ] ) {
					try { params[ decodeURIComponent( kv[ 0 ] ) ] = decodeURIComponent( kv[ 1 ] || "" ); } catch ( err ) { /* a broken escape is ignored */ }
				}
			} );
		}
		return { id: parts[ 0 ] || "chat", sub: parts[ 1 ] || "", rest: parts.slice( 2 ), params: params };
	}

	/** Moves to a page (and a section of it) the way a link would: shellGo( "routines", "reports" ) */
	function shellGo( id, sub, params ) {
		var query = Object.keys( params || {} ).map( function ( key ) { return encodeURIComponent( key ) + "=" + encodeURIComponent( params[ key ] ); } ).join( "&" );
		window.location.hash = "#/" + id + ( sub ? "/" + sub : "" ) + ( query ? "?" + query : "" );
	}

	function showRoute( moveFocus ) {
		var route = parseRoute();
		var def = pageDefs[ route.id ];
		if ( !def || !pageAvailable( def ) ) {
			// a member opening an admin address, or a page this server does not offer: the chat
			route = { id: "chat", sub: "", rest: [], params: {} };
			def = pageDefs.chat;
			if ( window.history && window.history.replaceState ) {
				window.history.replaceState( null, "", "#/chat" );
			}
		}
		if ( currentLeave ) {
			try { currentLeave(); } catch ( err ) { /* a page that cannot clean up must not block the next one */ }
			currentLeave = null;
		}
		var seq = ++renderSeq;
		route.stale = function () { return seq !== renderSeq; };
		var samePage = shownPageId === def.id;
		shownPageId = def.id;
		currentPageId = def.id;
		document.body.setAttribute( "data-page", def.id );
		document.title = ( def.id === "chat" ? "" : def.title + " · " ) + appTitleText;
		markCurrent();
		closeDrawer();
		if ( def.id === "chat" ) {
			pageViewEl.hidden = true;
			pageViewEl.textContent = "";
			pageChatEl.hidden = false;
			if ( moveFocus ) {
				inputEl.focus();
			}
			return;
		}
		pageChatEl.hidden = true;
		pageViewEl.hidden = false;
		pageViewEl.textContent = "";
		pageViewEl.scrollTop = 0;
		try {
			var cleanup = def.render( pageViewEl, route );
			currentLeave = typeof cleanup === "function" ? cleanup : ( def.leave || null );
		} catch ( err ) {
			pageViewEl.appendChild( pageNote( "This page could not be drawn: " + err.message, "error" ) );
		}
		// moving between the sections of one page keeps the focus where it is
		if ( moveFocus && !samePage ) {
			var heading = pageViewEl.querySelector( "h1" );
			if ( heading ) {
				heading.focus( { preventScroll: true } );
			}
		}
	}

	registerPage( { id: "chat", title: "Chat", icon: "chat-circle-text", group: "main", order: 10 } );

	/**
	 * Called once the capabilities are known (after GET /agent): builds the menu from them,
	 * and opens the page in the address. The Settings menu keeps every item: the pages are a second way in.
	 */
	function shellStart() {
		buildNav();
		setNavFolded( readNavFold(), false );
		if ( !shellReady ) {
			shellReady = true;
			// only #/page addresses are the router's: a plain fragment (the skip link's) is left alone
			window.addEventListener( "hashchange", function () {
				if ( /^#\//.test( window.location.hash ) || !window.location.hash ) { showRoute( true ); }
			} );
			// the skip link moves focus to the main region without touching the address
			document.querySelector( ".skip-link" ).addEventListener( "click", function ( evt ) {
				evt.preventDefault();
				document.getElementById( "content" ).focus();
			} );
		}
		showRoute( false );
	}
