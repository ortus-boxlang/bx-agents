/*! bx-agent: the chat widget of a BxAgents embed. Plain JavaScript, no dependencies, one file.
 *
 *   <script src="https://agent.example/__bxagents/embed/widget.js" data-embed="emb_..." defer></script>
 *   <bx-agent embed="emb_..." base="https://agent.example/__bxagents"></bx-agent>
 *
 * Attributes, all read ONCE, when the element connects (a page script that sets them later changes nothing, because the
 * saved transcript is restored at connect time):
 *   embed        the embed's id (required)
 *   base         the agent API's address; taken from this script's own URL when left out
 *   mode         "widget" (a launcher and a panel, the default), "page" (the chat fills the page, for the hosted frame) or
 *                "preview" (the Embeds admin page: always open, no network, drawn from the `look` property)
 *   storage      "local" (the default) keeps the transcript and the session in localStorage; "none" keeps nothing
 *   storage-key  the localStorage key; default "bx-agent:<embed id>"
 *   credentials  the fetch credentials mode, "omit" by default (the embed routes use no cookies)
 *
 * Properties, read when they are used, so they may be set at any time:
 *   look            the look and text ({ title, welcome, placeholder, suggestions, color, position, theme, icon }); set it in "preview" mode
 *   headers         async () => ({ name: value }), merged into every request
 *   onUnauthorized  () => void, called when the agent refuses a new session
 *
 * Events (bubbling, composed): bx-done { detail: { text } } and bx-error { detail: { message } }.
 */
(function () {
	"use strict";

	if ( !window.customElements || customElements.get( "bx-agent" ) ) {
		return;
	}

	var SCRIPT = document.currentScript || ( function () {
		var all = document.querySelectorAll( "script[src]" );
		for ( var i = all.length - 1; i >= 0; i-- ) {
			if ( /\/embed\/widget\.js(\?|$)/.test( all[ i ].getAttribute( "src" ) ) ) {
				return all[ i ];
			}
		}
		return null;
	} )();

	var MAX_MESSAGES = 60;
	var MAX_TEXT = 20000;

	var CSS = [
		":host{all:initial;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.45;",
		"--accent:#2563eb;--accent-fg:#fff;--bg:#fff;--fg:#0f172a;--muted:#475569;--border:#cbd5e1;--bot:#f1f5f9;--shadow:0 12px 40px rgba(15,23,42,.25)}",
		":host([data-theme=dark]){--bg:#0f172a;--fg:#f1f5f9;--muted:#cbd5e1;--border:#334155;--bot:#1e293b;--shadow:0 12px 40px rgba(0,0,0,.6)}",
		"@media (prefers-color-scheme:dark){:host([data-theme=auto]){--bg:#0f172a;--fg:#f1f5f9;--muted:#cbd5e1;--border:#334155;--bot:#1e293b;--shadow:0 12px 40px rgba(0,0,0,.6)}}",
		"*{box-sizing:border-box}",
		"button{font:inherit;color:inherit;cursor:pointer}",
		"button:focus-visible,textarea:focus-visible{outline:3px solid var(--accent);outline-offset:2px}",
		".sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}",
		".launcher{position:fixed;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;background:var(--accent);color:var(--accent-fg);",
		"box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;z-index:2147483000}",
		".launcher svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
		":host([data-position=bottom-right]) .launcher,:host([data-position=bottom-right]) .panel{right:20px}",
		":host([data-position=bottom-left]) .launcher,:host([data-position=bottom-left]) .panel{left:20px}",
		".panel{position:fixed;bottom:88px;width:380px;max-width:calc(100vw - 32px);height:min(620px,calc(100vh - 110px));display:flex;flex-direction:column;",
		"background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);overflow:hidden;z-index:2147483000}",
		".panel[hidden],.launcher[hidden]{display:none}",
		":host([data-mode=preview]){display:block;position:relative;height:100%;min-height:420px}",
		":host([data-mode=preview]) .panel{position:absolute;inset:0;width:auto;max-width:none;height:auto}",
		":host([data-mode=page]) .panel{position:fixed;inset:0;width:auto;max-width:none;height:auto;border:0;border-radius:0;box-shadow:none}",
		"header{display:flex;align-items:center;gap:8px;padding:12px 14px;background:var(--accent);color:var(--accent-fg)}",
		"header h2{margin:0;font-size:16px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
		"header button{background:transparent;border:1px solid transparent;border-radius:8px;padding:6px 8px;color:inherit}",
		"header button:hover{border-color:currentColor}",
		".log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
		".msg{max-width:88%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}",
		".msg.bot{align-self:flex-start;background:var(--bot);color:var(--fg);border-bottom-left-radius:4px}",
		".msg.user{align-self:flex-end;background:var(--accent);color:var(--accent-fg);border-bottom-right-radius:4px}",
		".msg.error{align-self:flex-start;border:1px solid #b91c1c;color:#b91c1c;background:transparent}",
		":host([data-theme=dark]) .msg.error{color:#fca5a5;border-color:#fca5a5}",
		"@media (prefers-color-scheme:dark){:host([data-theme=auto]) .msg.error{color:#fca5a5;border-color:#fca5a5}}",
		".tool{align-self:flex-start;color:var(--muted);font-size:13px}",
		".typing::after{content:'\\2026';animation:blink 1s steps(2,start) infinite}",
		"@keyframes blink{to{visibility:hidden}}",
		".suggestions{display:flex;flex-direction:column;gap:6px;align-items:flex-start}",
		".suggestions button{background:transparent;border:1px solid var(--accent);color:var(--fg);border-radius:999px;padding:6px 12px;text-align:left}",
		".suggestions button:hover{background:var(--bot)}",
		"form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--border);align-items:flex-end}",
		"textarea{flex:1;resize:none;max-height:120px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;font:inherit;background:var(--bg);color:var(--fg)}",
		".send{border:0;border-radius:10px;padding:0 14px;height:40px;background:var(--accent);color:var(--accent-fg);font-weight:600}",
		".send[disabled]{opacity:.55;cursor:default}",
		"@media (max-width:480px){:host(:not([data-mode=page])) .panel{right:8px!important;left:8px!important;width:auto;max-width:none;bottom:80px}}",
		"@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}"
	].join( "" );

	// the launcher glyphs a look may pick (look.icon); the names are the server's list. Any other value draws the chat bubble
	var ICONS = {
		chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/>',
		question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/>',
		sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
		headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1-1.5 2-4 2h-2"/>',
		book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8"/>'
	};
	function iconSvg( name ) {
		var body = Object.prototype.hasOwnProperty.call( ICONS, name ) ? ICONS[ name ] : ICONS.chat;
		return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
	}

	/** Black or white, whichever reads better on the colour (WCAG relative luminance) */
	function textOn( hex ) {
		var m = /^#([0-9a-f]{6})$/i.exec( hex || "" );
		if ( !m ) {
			return "#fff";
		}
		var c = [ 0, 2, 4 ].map( function ( i ) {
			var v = parseInt( m[ 1 ].substr( i, 2 ), 16 ) / 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 );
		} );
		var lum = 0.2126 * c[ 0 ] + 0.7152 * c[ 1 ] + 0.0722 * c[ 2 ];
		return lum > 0.179 ? "#000" : "#fff";
	}

	function el( tag, props, children ) {
		var node = document.createElement( tag );
		Object.keys( props || {} ).forEach( function ( k ) {
			if ( k === "text" ) { node.textContent = props[ k ]; }
			else if ( k === "class" ) { node.className = props[ k ]; }
			else { node.setAttribute( k, props[ k ] ); }
		} );
		( children || [] ).forEach( function ( c ) { node.appendChild( c ); } );
		return node;
	}

	function storageOf( kind ) {
		if ( kind === "none" ) {
			return null;
		}
		try {
			var probe = "__bx_agent_probe__";
			window.localStorage.setItem( probe, "1" );
			window.localStorage.removeItem( probe );
			return window.localStorage;
		} catch ( e ) {
			return null;
		}
	}

	function BxAgent() {
		return Reflect.construct( HTMLElement, [], BxAgent );
	}
	BxAgent.prototype = Object.create( HTMLElement.prototype );
	BxAgent.prototype.constructor = BxAgent;
	Object.setPrototypeOf( BxAgent, HTMLElement );

	BxAgent.prototype.connectedCallback = function () {
		if ( this._ready ) {
			return;
		}
		this._ready = true;
		// every attribute is read here, once: see the note at the top of the file
		this._embed = this.getAttribute( "embed" ) || ( SCRIPT && SCRIPT.getAttribute( "data-embed" ) ) || "";
		var base = this.getAttribute( "base" );
		if ( !base && SCRIPT && SCRIPT.src ) {
			base = SCRIPT.src.replace( /\/embed\/widget\.js.*$/, "" );
		}
		this._base = ( base || "" ).replace( /\/+$/, "" );
		var mode = this.getAttribute( "mode" );
		this._mode = mode === "page" || mode === "preview" ? mode : "widget";
		this._credentials = this.getAttribute( "credentials" ) || "omit";
		this._store = this._mode === "preview" ? null : storageOf( this.getAttribute( "storage" ) || "local" );
		this._key = this.getAttribute( "storage-key" ) || ( "bx-agent:" + this._embed );
		this._messages = [];
		this._busy = false;
		this._token = null;
		this._label = "main";
		this._look = this._look || null;
		this.setAttribute( "data-mode", this._mode );
		if ( this._mode === "preview" ) {
			// the admin page draws the chat from the form it is editing: no network, nothing kept
			this._build();
			this._look = this._look || {};
			this._applyLook();
			this._render();
			return;
		}
		if ( !this._embed || !this._base ) {
			this._fail( "The chat is not set up: it needs an embed id and the agent's address." );
			return;
		}
		this._restore();
		this._build();
		this._loadConfig();
	};

	// ---- saved state -----------------------------------------------------------------------------------------------

	BxAgent.prototype._restore = function () {
		if ( !this._store ) {
			return;
		}
		try {
			var saved = JSON.parse( this._store.getItem( this._key ) || "null" );
			if ( saved && Array.isArray( saved.messages ) ) {
				this._messages = saved.messages.filter( function ( m ) { return m && ( m.role === "user" || m.role === "bot" ) && typeof m.text === "string"; } ).slice( -MAX_MESSAGES );
				this._label = typeof saved.label === "string" && /^[a-z0-9-]{1,24}$/.test( saved.label ) ? saved.label : "main";
			}
			var session = JSON.parse( this._store.getItem( this._key + ":session" ) || "null" );
			if ( session && session.token && session.until > Date.now() + 30000 ) {
				this._token = session;
			}
		} catch ( e ) {
			this._messages = [];
		}
	};

	BxAgent.prototype._save = function () {
		if ( !this._store ) {
			return;
		}
		try {
			var keep = this._messages.slice( -MAX_MESSAGES ).map( function ( m ) { return { role: m.role, text: String( m.text ).slice( 0, MAX_TEXT ) }; } );
			this._store.setItem( this._key, JSON.stringify( { label: this._label, messages: keep } ) );
			if ( this._token ) {
				this._store.setItem( this._key + ":session", JSON.stringify( this._token ) );
			}
		} catch ( e ) {
			// storage full or blocked: the chat works, it just is not remembered
		}
	};

	// ---- the agent --------------------------------------------------------------------------------------------------

	BxAgent.prototype._url = function ( path ) {
		return this._base + "/embed/" + encodeURIComponent( this._embed ) + path;
	};

	BxAgent.prototype._request = function ( path, options ) {
		var self = this;
		options = options || {};
		return Promise.resolve( typeof self.headers === "function" ? self.headers() : {} ).then( function ( extra ) {
			var headers = Object.assign( {}, extra || {}, options.headers || {} );
			if ( options.auth && self._token ) {
				headers.Authorization = "Bearer " + self._token.token;
			}
			return fetch( self._url( path ), { method: options.method || "GET", headers: headers, body: options.body, signal: options.signal, credentials: self._credentials, mode: "cors" } );
		} );
	};

	BxAgent.prototype._loadConfig = function () {
		var self = this;
		this._request( "/config" ).then( function ( r ) {
			if ( !r.ok ) { throw new Error( "config " + r.status ); }
			return r.json();
		} ).then( function ( data ) {
			self._look = data.look || {};
			self._applyLook();
			self._launcher.hidden = false;
			self._render();
		} ).catch( function ( e ) {
			// a website that is not allowed, or an embed that is off, gets nothing drawn: a launcher that cannot work is worse
			if ( self.shadowRoot && self._mode !== "page" ) { self.shadowRoot.replaceChildren(); }
			self._fail( "The chat is not available." );
			self._emit( "bx-error", { message: String( e && e.message || e ) } );
		} );
	};

	BxAgent.prototype._session = function ( force ) {
		var self = this;
		if ( self._token && !force && self._token.until > Date.now() + 30000 ) {
			return Promise.resolve();
		}
		return self._request( "/session", { method: "POST" } ).then( function ( r ) {
			if ( !r.ok ) {
				if ( r.status === 401 || r.status === 403 ) {
					if ( typeof self.onUnauthorized === "function" ) { self.onUnauthorized(); }
				}
				throw new Error( "session " + r.status );
			}
			return r.json();
		} ).then( function ( data ) {
			self._token = { token: data.token, until: Date.now() + ( data.expiresIn || 3600 ) * 1000 };
			self._save();
		} );
	};

	BxAgent.prototype._stream = function ( text, onPiece, signal, retried ) {
		var self = this;
		return self._session( false ).then( function () {
			return self._request( "/events", {
				method: "POST", auth: true, signal: signal,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify( { input: text, conversationId: self._label } )
			} );
		} ).then( function ( r ) {
			if ( r.status === 401 && !retried ) {
				self._token = null;
				return self._session( true ).then( function () { return self._stream( text, onPiece, signal, true ); } );
			}
			if ( !r.ok ) {
				return r.json().catch( function () { return {}; } ).then( function ( body ) {
					var err = new Error( body.error || ( "The agent answered " + r.status ) );
					err.status = r.status;
					throw err;
				} );
			}
			self._thread = r.headers.get( "X-Thread-Id" ) || "";
			return self._read( r, onPiece );
		} );
	};

	/** Reads the event stream: frames end at a blank line, each is `event:` and `data:` lines; a line that starts with `:` is a comment */
	BxAgent.prototype._read = function ( response, onPiece ) {
		var reader = response.body.getReader();
		var decoder = new TextDecoder( "utf-8" );
		var buffer = "";
		function frame( raw ) {
			var event = "message";
			var data = [];
			raw.split( /\r?\n/ ).forEach( function ( line ) {
				if ( !line || line.charAt( 0 ) === ":" ) { return; }
				var at = line.indexOf( ":" );
				var field = at < 0 ? line : line.slice( 0, at );
				var value = at < 0 ? "" : line.slice( at + 1 ).replace( /^ /, "" );
				if ( field === "event" ) { event = value; }
				else if ( field === "data" ) { data.push( value ); }
			} );
			if ( data.length ) {
				onPiece( event, data.join( "\n" ) );
			}
		}
		function pump() {
			return reader.read().then( function ( step ) {
				if ( step.done ) {
					if ( buffer.trim() ) { frame( buffer ); }
					return;
				}
				buffer += decoder.decode( step.value, { stream: true } );
				var parts = buffer.split( /\r?\n\r?\n/ );
				buffer = parts.pop();
				parts.forEach( frame );
				return pump();
			} );
		}
		return pump();
	};

	// ---- sending ----------------------------------------------------------------------------------------------------

	BxAgent.prototype.send = function ( text ) {
		var self = this;
		text = String( text || "" ).trim();
		if ( !text || self._busy || !self._look ) {
			return;
		}
		if ( self._mode === "preview" ) {
			self._messages.push( { role: "user", text: text }, { role: "bot", text: "This is a preview. Nothing is sent." } );
			self._render();
			return;
		}
		self._busy = true;
		self._messages.push( { role: "user", text: text } );
		var answer = { role: "bot", text: "", pending: true };
		self._messages.push( answer );
		self._tool = "";
		self._abort = new AbortController();
		self._render();

		self._stream( text, function ( event, data ) {
			if ( event === "chunk" ) {
				try {
					var delta = ( JSON.parse( data ).choices || [ {} ] )[ 0 ].delta || {};
					if ( typeof delta.content === "string" && delta.content ) {
						answer.text += delta.content;
						self._tool = "";
						self._paint( answer );
					}
				} catch ( e ) { /* a frame that is not JSON carries nothing to show */ }
			} else if ( event === "tool" ) {
				try {
					var tool = JSON.parse( data );
					self._tool = tool.status === "running" ? "Using " + tool.name + "…" : "";
					self._paint( answer );
				} catch ( e ) { /* ignore */ }
			} else if ( event === "error" ) {
				var message = "";
				try { message = JSON.parse( data ).message; } catch ( e ) { message = data; }
				throw new Error( message || "The agent failed" );
			}
		}, self._abort.signal ).then( function () {
			answer.pending = false;
			if ( !answer.text ) { answer.text = "I have nothing to say to that."; }
			self._finish( answer.text, false );
		} ).catch( function ( e ) {
			answer.pending = false;
			if ( e && e.name === "AbortError" ) {
				if ( !answer.text ) { self._messages.pop(); }
				self._finish( answer.text, false );
				return;
			}
			var limited = e && e.status === 429;
			self._messages.pop();
			self._messages.push( { role: "error", text: limited ? ( e.message || "Please wait a moment." ) : "Sorry, something went wrong. Try again." } );
			self._finish( "", true, e );
		} );
	};

	BxAgent.prototype._finish = function ( text, failed, error ) {
		this._busy = false;
		this._tool = "";
		this._abort = null;
		this._thread = "";
		this._save();
		this._render();
		if ( this._live && !failed && text ) {
			this._live.textContent = "Answer: " + text.slice( 0, 500 );
		}
		if ( failed ) {
			this._emit( "bx-error", { message: String( error && error.message || error ) } );
		} else {
			this._emit( "bx-done", { text: text } );
		}
		if ( this._input && this._isOpen() ) { this._input.focus(); }
	};

	BxAgent.prototype.stop = function () {
		var thread = this._thread;
		if ( this._abort ) { this._abort.abort(); }
		if ( thread && this._token ) {
			this._request( "/cancel", { method: "POST", auth: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify( { threadId: thread } ) } ).catch( function () {} );
		}
	};

	BxAgent.prototype.reset = function () {
		if ( this._busy ) { this.stop(); }
		this._messages = [];
		this._label = Math.random().toString( 36 ).slice( 2, 10 );
		this._save();
		this._render();
		if ( this._input ) { this._input.focus(); }
	};

	BxAgent.prototype._emit = function ( name, detail ) {
		this.dispatchEvent( new CustomEvent( name, { detail: detail, bubbles: true, composed: true } ) );
	};

	// ---- drawing ----------------------------------------------------------------------------------------------------

	BxAgent.prototype._fail = function ( message ) {
		// the hosted page has nothing else to show, so it says why; a widget on someone's page just stays out of the way
		if ( this._mode === "page" ) {
			var root = this.shadowRoot || this.attachShadow( { mode: "open" } );
			root.replaceChildren( el( "style", { text: CSS } ), el( "p", { role: "alert", text: message, style: "font:15px system-ui;padding:16px" } ) );
		}
		if ( window.console ) { console.warn( "bx-agent: " + message ); }
	};

	BxAgent.prototype._applyLook = function () {
		var look = this._look || {};
		this.setAttribute( "data-position", look.position === "bottom-left" ? "bottom-left" : "bottom-right" );
		this.setAttribute( "data-theme", look.theme === "light" || look.theme === "dark" ? look.theme : "auto" );
		if ( /^#[0-9a-f]{6}$/i.test( look.color || "" ) ) {
			this.style.setProperty( "--accent", look.color );
			this.style.setProperty( "--accent-fg", textOn( look.color ) );
		}
		this._launcher.innerHTML = iconSvg( look.icon );
		this._panel.setAttribute( "aria-label", look.title || "Chat" );
		this._title.textContent = look.title || "Chat";
		this._input.setAttribute( "placeholder", look.placeholder || "Ask a question" );
		this._input.setAttribute( "aria-label", look.placeholder || "Ask a question" );
	};

	BxAgent.prototype._isOpen = function () {
		return this._mode !== "widget" || !this._panel.hidden;
	};

	// the look can be set from the page (the preview) at any time; the widget redraws
	Object.defineProperty( BxAgent.prototype, "look", {
		get: function () { return this._look; },
		set: function ( value ) {
			this._look = value || {};
			if ( this._log ) {
				this._applyLook();
				this._render();
			}
		}
	} );

	BxAgent.prototype._build = function () {
		var self = this;
		var root = self.attachShadow( { mode: "open" } );
		root.appendChild( el( "style", { text: CSS } ) );

		self._live = el( "div", { class: "sr", "aria-live": "polite", role: "status" } );
		self._log = el( "div", { class: "log", role: "log", tabindex: "0", "aria-label": "Conversation" } );
		self._input = el( "textarea", { rows: "1", maxlength: "2000", placeholder: "Ask a question", "aria-label": "Ask a question" } );
		self._sendButton = el( "button", { class: "send", type: "submit", text: "Send" } );
		self._title = el( "h2", { text: "Chat" } );
		var newChat = el( "button", { type: "button", "aria-label": "Start a new chat", text: "New" } );
		var close = el( "button", { type: "button", "aria-label": "Close chat", text: "✕" } );
		var form = el( "form", {}, [ self._input, self._sendButton ] );
		self._panel = el( "section", { class: "panel", role: "dialog", "aria-label": "Chat", id: "panel" }, [
			el( "header", {}, self._mode !== "widget" ? [ self._title, newChat ] : [ self._title, newChat, close ] ),
			self._log, form
		] );
		self._launcher = el( "button", { class: "launcher", type: "button", "aria-label": "Open chat", "aria-expanded": "false", "aria-controls": "panel" } );
		self._launcher.innerHTML = iconSvg( "chat" );

		if ( self._mode !== "widget" ) {
			root.appendChild( self._panel );
		} else {
			self._panel.hidden = true;
			// not shown until the agent has said this website may use the chat: a button that cannot work is worse than none
			self._launcher.hidden = true;
			root.appendChild( self._launcher );
			root.appendChild( self._panel );
		}
		root.appendChild( self._live );

		self._launcher.addEventListener( "click", function () { self._toggle( self._panel.hidden ); } );
		close.addEventListener( "click", function () { self._toggle( false ); } );
		newChat.addEventListener( "click", function () { self.reset(); } );
		form.addEventListener( "submit", function ( e ) {
			e.preventDefault();
			if ( self._busy ) { self.stop(); return; }
			var text = self._input.value;
			self._input.value = "";
			self._grow();
			self.send( text );
		} );
		self._input.addEventListener( "input", function () { self._grow(); } );
		self._input.addEventListener( "keydown", function ( e ) {
			if ( e.key === "Enter" && !e.shiftKey && !e.isComposing ) {
				e.preventDefault();
				form.requestSubmit();
			}
		} );
		root.addEventListener( "keydown", function ( e ) {
			if ( e.key === "Escape" && self._mode === "widget" && !self._panel.hidden ) {
				e.stopPropagation();
				self._toggle( false );
			}
		} );
		self._applyLook();
		self._render();
	};

	BxAgent.prototype._grow = function () {
		this._input.style.height = "auto";
		this._input.style.height = Math.min( 120, this._input.scrollHeight ) + "px";
	};

	BxAgent.prototype._toggle = function ( open ) {
		this._panel.hidden = !open;
		this._launcher.setAttribute( "aria-expanded", open ? "true" : "false" );
		this._launcher.setAttribute( "aria-label", open ? "Close chat" : "Open chat" );
		if ( open ) {
			this._input.focus();
			this._log.scrollTop = this._log.scrollHeight;
		} else {
			this._launcher.focus();
		}
	};

	/** Updates the text of the answer being streamed, without redrawing the whole log (so a reader's place is kept) */
	BxAgent.prototype._paint = function ( answer ) {
		if ( !answer._node ) {
			this._render();
			return;
		}
		answer._node.textContent = answer.text;
		answer._node.classList.toggle( "typing", !answer.text );
		if ( this._toolNode ) { this._toolNode.textContent = this._tool || ""; }
		var near = this._log.scrollHeight - this._log.scrollTop - this._log.clientHeight < 80;
		if ( near ) { this._log.scrollTop = this._log.scrollHeight; }
	};

	BxAgent.prototype._render = function () {
		var self = this;
		if ( !self._log ) { return; }
		var look = self._look || {};
		self._log.replaceChildren();
		self._log.setAttribute( "aria-busy", self._busy ? "true" : "false" );
		// a streamed answer is not read out piece by piece: the finished answer is announced once, from the status region
		self._log.setAttribute( "aria-live", "off" );
		if ( !self._messages.length ) {
			if ( look.welcome ) {
				self._log.appendChild( el( "div", { class: "msg bot", text: look.welcome } ) );
			}
			var list = ( look.suggestions || [] ).slice( 0, 3 );
			if ( list.length ) {
				var box = el( "div", { class: "suggestions" } );
				list.forEach( function ( s ) {
					var b = el( "button", { type: "button", text: s } );
					b.addEventListener( "click", function () { self.send( s ); } );
					box.appendChild( b );
				} );
				self._log.appendChild( box );
			}
		}
		self._toolNode = null;
		self._messages.forEach( function ( m ) {
			var node = el( "div", { class: "msg " + m.role + ( m.pending && !m.text ? " typing" : "" ) } );
			node.textContent = m.text;
			m._node = node;
			self._log.appendChild( node );
			if ( m.pending ) {
				self._toolNode = el( "div", { class: "tool", text: self._tool || "" } );
				self._log.appendChild( self._toolNode );
			}
		} );
		self._sendButton.textContent = self._busy ? "Stop" : "Send";
		self._sendButton.setAttribute( "aria-label", self._busy ? "Stop the answer" : "Send" );
		self._log.scrollTop = self._log.scrollHeight;
	};

	customElements.define( "bx-agent", BxAgent );

	// the snippet: one script tag with data-embed adds the element
	if ( SCRIPT && SCRIPT.getAttribute( "data-embed" ) && !document.querySelector( "bx-agent" ) ) {
		var mount = function () {
			var node = document.createElement( "bx-agent" );
			node.setAttribute( "embed", SCRIPT.getAttribute( "data-embed" ) );
			[ "storage", "storage-key", "credentials", "mode" ].forEach( function ( a ) {
				if ( SCRIPT.getAttribute( "data-" + a ) ) { node.setAttribute( a, SCRIPT.getAttribute( "data-" + a ) ); }
			} );
			document.body.appendChild( node );
		};
		if ( document.readyState === "loading" ) {
			document.addEventListener( "DOMContentLoaded", mount );
		} else {
			mount();
		}
	}
} )();
