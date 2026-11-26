/**
 * The Embeds page (admin): the agent on other websites, for anonymous visitors. A list of embeds, an editor (agent, look
 * and text, the tools visitors may use, the websites that may show it, limits), a live preview drawn by the real widget,
 * the snippets to paste, the counters and Save, Disable and Rotate key.
 *
 * Everything is read and written through the agent API (GET and POST /embeds ...). The page checks what it can before it
 * sends (the same rules as the server), but the server decides: what it refuses is shown in the form.
 */

/** What a limit may be set to, as the server says */
export const LIMIT_RANGES = {
	perVisitorPerMinute : [
		1,
		600
	],
	dailyMessages : [
		1,
		1000000
	],
	maxMessageChars : [
		1,
		20000
	]
};

/** The words the limits are asked for in */
export const LIMIT_LABELS = {
	perVisitorPerMinute : "Messages per visitor per minute",
	dailyMessages       : "Messages per day for the whole embed",
	maxMessageChars     : "Longest message, in characters"
};

/**
 * @param {string} text What was typed as a website
 * @returns {string} What is wrong with it as an origin (scheme, host and an optional port, nothing else), or "" when it is one
 */
export function originProblem( text ) {
	const value = String( text || "" ).trim();
	if ( !value ) {
		return "Type a website, such as https://docs.example.com";
	}
	if ( value.includes( "*" ) ) {
		return "No wildcards: list each website exactly, such as https://docs.example.com";
	}
	if ( !/^https?:\/\//i.test( value ) ) {
		return "Start with http:// or https://, then the host";
	}
	if ( /^https?:\/\/[^/?#]*[/?#]/i.test( value ) ) {
		return "Only the website, with no path or query: https://docs.example.com, not https://docs.example.com/page";
	}
	if ( /@/.test( value ) ) {
		return "No user name in an origin";
	}
	const match = /^https?:\/\/([A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?)(:([0-9]{1,5}))?$/i.exec( value );
	if ( !match || value.includes( ".." ) ) {
		return "That is not a website: write https://host or https://host:port";
	}
	if ( match[ 4 ] && ( Number( match[ 4 ] ) < 1 || Number( match[ 4 ] ) > 65535 ) ) {
		return "A port is from 1 to 65535";
	}
	return "";
}

/**
 * @param {string} text A website
 * @returns {string} The origin as the server keeps it: trimmed, in lower case
 */
export function normalizeOrigin( text ) {
	return String( text || "" ).trim().toLowerCase();
}

/**
 * @returns {object} A new embed's form, with the defaults the server would give
 */
/** The launcher glyphs an embed may pick: the same names and drawings as the widget's (widget.js ICONS) */
export const ICONS = [
	{ name: "chat", label: "Chat bubble", svg: "<path d=\"M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z\"/>" },
	{ name: "question", label: "Question mark", svg: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7\"/><path d=\"M12 17h.01\"/>" },
	{ name: "sparkle", label: "Sparkle", svg: "<path d=\"M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z\"/><path d=\"M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z\"/>" },
	{ name: "headset", label: "Headset", svg: "<path d=\"M4 14v-2a8 8 0 0 1 16 0v2\"/><rect x=\"3\" y=\"14\" width=\"4\" height=\"6\" rx=\"1.5\"/><rect x=\"17\" y=\"14\" width=\"4\" height=\"6\" rx=\"1.5\"/><path d=\"M19 20c0 1-1.5 2-4 2h-2\"/>" },
	{ name: "book", label: "Book", svg: "<path d=\"M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z\"/><path d=\"M4 5.5v16\"/><path d=\"M8 7h8\"/>" }
];

export function blankEmbed() {
	return {
		id      : "",
		name    : "",
		enabled : true,
		expires : "",
		target  : { agent: "", profile: "" },
		look    : { title: "", welcome: "", placeholder: "Ask a question", suggestions: [], color: "#2563eb", position: "bottom-right", theme: "auto", icon: "chat" },
		tools   : [],
		limits  : { allowedOrigins: [], perVisitorPerMinute: 10, dailyMessages: 200, maxMessageChars: 2000 }
	};
}

/**
 * @param {object} embed An embed as the API answers it
 * @returns {object} A form to edit: a copy, with every field present
 */
export function formOf( embed ) {
	const base = blankEmbed();
	return {
		...base,
		...embed,
		target : { ...base.target, ...( embed.target || {} ) },
		look   : { ...base.look, ...( embed.look || {} ), suggestions: [ ...( ( embed.look || {} ).suggestions || [] ) ] },
		tools  : [ ...( embed.tools || [] ) ],
		limits : { ...base.limits, ...( embed.limits || {} ), allowedOrigins: [ ...( ( embed.limits || {} ).allowedOrigins || [] ) ] }
	};
}

/**
 * @param {object} form The embed being edited
 * @returns {Array<{ field: string, text: string }>} What is wrong with it, in the words the server would use; empty when it can be saved
 */
export function formProblems( form ) {
	const problems = [];
	const name = String( form.name || "" ).trim();
	if ( !name || name.length > 80 ) {
		problems.push( { field: "name", text: "Give it a name of 1 to 80 characters." } );
	}
	if ( !( form.limits.allowedOrigins || [] ).length ) {
		problems.push( { field: "origins", text: "List at least one website that may show it." } );
	}
	for ( const key of Object.keys( LIMIT_RANGES ) ) {
		const n = Number( form.limits[ key ] );
		const [
			low,
			high
		] = LIMIT_RANGES[ key ];
		if ( form.limits[ key ] === "" || !Number.isInteger( n ) || n < low || n > high ) {
			problems.push( { field: key, text: LIMIT_LABELS[ key ] + " is a whole number from " + low + " to " + high + "." } );
		}
	}
	if ( !/^#[0-9a-f]{6}$/i.test( form.look.color || "" ) ) {
		problems.push( { field: "color", text: "The colour is six hex digits, such as #2563eb." } );
	}
	if ( ( form.look.suggestions || [] ).length > 3 ) {
		problems.push( { field: "suggestions", text: "Up to three suggested questions." } );
	}
	for ( const key of [
		"title",
		"welcome",
		"placeholder"
	] ) {
		const max = { title: 80, welcome: 500, placeholder: 120 }[ key ];
		if ( String( form.look[ key ] || "" ).length > max ) {
			problems.push( { field: key, text: "The " + key + " is up to " + max + " characters." } );
		}
	}
	return problems;
}

/**
 * @param {object} form The embed being edited
 * @returns {object} The body to send: what the server reads, with the limits as numbers
 */
export function bodyOf( form ) {
	return {
		name    : String( form.name ).trim(),
		enabled : !!form.enabled,
		target  : { agent: String( form.target.agent || "" ).trim(), profile: String( form.target.profile || "" ).trim() },
		look    : { ...form.look, suggestions: form.look.suggestions.map( s => String( s ).trim() ).filter( Boolean ) },
		tools   : [ ...form.tools ],
		limits  : {
			allowedOrigins      : form.limits.allowedOrigins.map( normalizeOrigin ),
			perVisitorPerMinute : Number( form.limits.perVisitorPerMinute ),
			dailyMessages       : Number( form.limits.dailyMessages ),
			maxMessageChars     : Number( form.limits.maxMessageChars )
		}
	};
}

/**
 * @param {{ blockedOrigin: number, limited: number, messages: number }} usage The counters
 * @returns {boolean} True when nothing has happened yet, so the page says so instead of showing zeros as results
 */
export function noVisits( usage ) {
	return !usage || ( !usage.messages && !usage.blockedOrigin && !usage.limited );
}

/**
 * @returns {object} Alpine component state and actions
 */
export function embedsPage() {
	return {
		/** @type {Array<{ name: string, label: string, svg: string }>} The launcher glyphs to pick from */
		icons           : ICONS,
		/** @type {boolean} True until the list answered */
		loading         : true,
		/** @type {string} Why the list could not be read */
		failed          : "",
		/** @type {Array<object>} The embeds */
		embeds          : [],
		/** @type {Array<string>} The names of the tools the agent has: what an embed may list */
		tools           : [],
		/** @type {object|null} The embed being edited (a form), or null when none is open */
		form            : null,
		/** @type {string} The form as it was last saved, to tell what changed */
		savedJson       : "",
		/** @type {boolean} True while Save is going */
		saving          : false,
		/** @type {Array<{ field: string, text: string }>} What the page or the server refused */
		problems        : [],
		/** @type {string} The website being typed */
		originDraft     : "",
		/** @type {string} What is wrong with it */
		originError     : "",
		/** @type {string} The suggested question being typed */
		suggestionDraft : "",
		/** @type {Array<object>} The snippets of the open embed */
		snippets        : [],
		/** @type {string} The open snippet tab */
		snippetTab      : "html",
		/** @type {string} The snippet just copied, for the button */
		copied          : "",
		/** @type {object|null} The counters of the open embed */
		usage           : null,
		/** @type {boolean} True once the widget script of the agent is loaded, which draws the preview */
		widgetReady     : false,

		/** Loads the list and the widget that draws the preview. */
		init() {
			this.loadWidget();
			this.load();
		},

		/** Loads the agent's widget script (the preview is the real widget, so it cannot drift from what visitors see). */
		loadWidget() {
			if ( window.customElements && customElements.get( "bx-agent" ) ) {
				this.widgetReady = true;
				return;
			}
			const script = document.createElement( "script" );
			script.src = this.$store.session.config.apiBase + "/embed/widget.js";
			script.onload = () => { this.widgetReady = true; };
			script.onerror = () => { this.widgetReady = false; };
			document.head.appendChild( script );
		},

		/** Reads the embeds. */
		async load() {
			const result = await this.$api.get( "/embeds" );
			this.loading = false;
			if ( !result.ok ) {
				this.failed = result.status === 404 ? "This agent keeps no database, so it has no embeds." : "Could not load the embeds.";
				return;
			}
			this.failed = "";
			this.embeds = result.data.embeds || [];
			this.tools = result.data.tools || [];
		},

		/** @returns {boolean} True when the form has changes that are not saved */
		get dirty() {
			return !!this.form && JSON.stringify( this.form ) !== this.savedJson;
		},

		/** @returns {object} The look the preview draws: the form's, with the name for a title left blank */
		get previewLook() {
			if ( !this.form ) {
				return {};
			}
			const look = JSON.parse( JSON.stringify( this.form.look ) );
			look.title = look.title || this.form.name || "Chat";
			return look;
		},

		/** @returns {Array<string>} The tools to offer: the agent's, and any an embed lists that the agent no longer has */
		get toolChoices() {
			const have = new Set( this.tools );
			return [
				...this.tools,
				...( this.form ? this.form.tools.filter( t => !have.has( t ) ) : [] )
			];
		},

		/**
		 * @param {string} name A tool
		 * @returns {boolean} True when the agent no longer has it
		 */
		toolGone( name ) {
			return !this.tools.includes( name );
		},

		/**
		 * @param {{ enabled: boolean, expires?: string }} embed An embed
		 * @returns {{ kind: string, label: string }} Its state chip
		 */
		stateOf( embed ) {
			if ( !embed.enabled ) {
				return { kind: "", label: "Off" };
			}
			if ( embed.expires && new Date( embed.expires ).getTime() <= Date.now() ) {
				return { kind: "warn", label: "Expired" };
			}
			return { kind: "ok", label: "On" };
		},

		/** Opens an empty form for a new embed. */
		newEmbed() {
			this.form = blankEmbed();
			this.savedJson = "";
			this.problems = [];
			this.snippets = [];
			this.usage = null;
			this.originDraft = this.originError = this.suggestionDraft = "";
			this.$nextTick( () => document.getElementById( "embedName" )?.focus() );
		},

		/**
		 * Opens an embed to edit.
		 *
		 * @param {object} embed An embed of the list
		 */
		async select( embed ) {
			if ( this.dirty && !await this.$confirm( { title: "Leave without saving?", body: "Your changes to " + ( this.form.name || "this embed" ) + " are not saved.", yes: "Leave", danger: true } ) ) {
				return;
			}
			this.form = formOf( embed );
			this.savedJson = JSON.stringify( this.form );
			this.problems = [];
			this.originDraft = this.originError = this.suggestionDraft = "";
			this.snippets = [];
			this.usage = null;
			await Promise.all( [
				this.loadSnippets(),
				this.loadUsage()
			] );
		},

		/** Closes the editor. */
		async close() {
			if ( this.dirty && !await this.$confirm( { title: "Leave without saving?", body: "Your changes are not saved.", yes: "Leave", danger: true } ) ) {
				return;
			}
			this.form = null;
		},

		/** Reads the snippets of the open embed, written for this agent's own address. */
		async loadSnippets() {
			if ( !this.form || !this.form.id ) {
				return;
			}
			const result = await this.$api.get( "/embeds/snippets?id=" + encodeURIComponent( this.form.id ) + "&base=" + encodeURIComponent( window.location.origin ) );
			this.snippets = result.ok ? ( result.data.snippets || [] ) : [];
			if ( this.snippets.length && !this.snippets.some( s => s.id === this.snippetTab ) ) {
				this.snippetTab = this.snippets[ 0 ].id;
			}
		},

		/** Reads the counters of the open embed. */
		async loadUsage() {
			if ( !this.form || !this.form.id ) {
				return;
			}
			const result = await this.$api.get( "/embeds/usage?id=" + encodeURIComponent( this.form.id ) );
			this.usage = result.ok ? result.data : null;
		},

		/** Adds the typed website, if it is one. */
		addOrigin() {
			const problem = originProblem( this.originDraft );
			if ( problem ) {
				this.originError = problem;
				return;
			}
			const origin = normalizeOrigin( this.originDraft );
			if ( !this.form.limits.allowedOrigins.includes( origin ) ) {
				this.form.limits.allowedOrigins.push( origin );
			}
			this.originDraft = this.originError = "";
		},

		/**
		 * @param {number} index Which website
		 */
		removeOrigin( index ) {
			this.form.limits.allowedOrigins.splice( index, 1 );
			this.$nextTick( () => document.getElementById( "embedOrigin" )?.focus() );
		},

		/** Adds the typed suggested question, up to three. */
		addSuggestion() {
			const text = this.suggestionDraft.trim();
			if ( !text || this.form.look.suggestions.length >= 3 ) {
				return;
			}
			this.form.look.suggestions.push( text.slice( 0, 120 ) );
			this.suggestionDraft = "";
		},

		/**
		 * @param {number} index Which suggestion
		 */
		removeSuggestion( index ) {
			this.form.look.suggestions.splice( index, 1 );
		},

		/**
		 * @param {string} name A tool
		 */
		toggleTool( name ) {
			const at = this.form.tools.indexOf( name );
			if ( at < 0 ) {
				this.form.tools.push( name );
			} else {
				this.form.tools.splice( at, 1 );
			}
		},

		/**
		 * @param {string} field A field name from formProblems
		 * @returns {string} The problem with it, or ""
		 */
		problemOf( field ) {
			const found = this.problems.find( p => p.field === field );
			return found ? found.text : "";
		},

		/** Saves the open embed: a new one is made, an old one is changed. */
		async save() {
			// a website typed but not added is added now: leaving it out silently would be a surprise
			if ( this.originDraft.trim() ) {
				this.addOrigin();
				if ( this.originError ) {
					return;
				}
			}
			this.problems = formProblems( this.form );
			if ( this.problems.length ) {
				this.$toast.error( "Fix what is marked first." );
				return;
			}
			this.saving = true;
			const body = bodyOf( this.form );
			const isNew = !this.form.id;
			if ( !isNew ) {
				body.id = this.form.id;
			}
			const result = await this.$api.post( isNew ? "/embeds" : "/embeds/update", body );
			this.saving = false;
			if ( !result.ok ) {
				this.problems = [ { field: "", text: result.error || "The embed was not saved." } ];
				this.$toast.error( "The embed was not saved." );
				return;
			}
			this.$toast.success( ( isNew ? "Made " : "Saved " ) + result.data.name + "." );
			await this.load();
			this.form = formOf( result.data );
			this.savedJson = JSON.stringify( this.form );
			this.problems = [];
			await Promise.all( [
				this.loadSnippets(),
				this.loadUsage()
			] );
		},

		/** Turns the open embed off or on. A visitor of an embed that is off is answered as if it did not exist. */
		async toggleEnabled() {
			if ( !this.form.id ) {
				this.form.enabled = !this.form.enabled;
				return;
			}
			// a change made here is saved at once: what is on the form is saved too, unless the person has edits that are not
			const wasClean = !this.dirty;
			const turningOff = this.form.enabled;
			if ( turningOff && !await this.$confirm( { title: "Turn " + this.form.name + " off?", body: "Visitors get no chat until you turn it on again. Their saved chats are kept.", yes: "Turn off", danger: true } ) ) {
				return;
			}
			const result = await this.$api.post( "/embeds/update", { id: this.form.id, enabled: !turningOff } );
			if ( !result.ok ) {
				this.$toast.error( result.error || "That did not work." );
				return;
			}
			this.form.enabled = !turningOff;
			this.markSaved( wasClean );
			this.$toast.success( turningOff ? "Turned off." : "Turned on." );
			await this.load();
		},

		/**
		 * After a change that was saved on its own (turning on or off, a new key): when the form had no unsaved edits it is
		 * saved as it is now, so the page does not say "Unsaved changes" for something already stored.
		 *
		 * @param {boolean} wasClean True when the form had no unsaved edits before the change
		 */
		markSaved( wasClean ) {
			if ( wasClean ) {
				this.savedJson = JSON.stringify( this.form );
			}
		},

		/** Gives the open embed a new signing key, after asking. */
		async rotate() {
			if ( !await this.$confirm( {
				title  : "Rotate the key of " + this.form.name + "?",
				body   : "Every visitor who is chatting right now loses their session and gets a new one on their next message. The snippet on your website does not change.",
				yes    : "Rotate key",
				danger : true
			} ) ) {
				return;
			}
			const result = await this.$api.post( "/embeds/rotate", { id: this.form.id } );
			if ( !result.ok ) {
				this.$toast.error( result.error || "The key was not rotated." );
				return;
			}
			const wasClean = !this.dirty;
			this.form.keyVersion = result.data.keyVersion;
			this.markSaved( wasClean );
			this.$toast.success( "New key, version " + result.data.keyVersion + ". Open sessions have ended." );
			await this.load();
		},

		/**
		 * Copies a snippet.
		 *
		 * @param {{ id: string, code: string }} snippet The snippet
		 */
		async copy( snippet ) {
			try {
				await navigator.clipboard.writeText( snippet.code );
			} catch {
				// no clipboard permission (an http page): select the text so Ctrl+C works
				const box = this.$refs.snippetCode;
				if ( box ) {
					const range = document.createRange();
					range.selectNodeContents( box );
					const selection = window.getSelection();
					selection.removeAllRanges();
					selection.addRange( range );
				}
				this.$toast.error( "Could not copy. The text is selected: press Ctrl+C." );
				return;
			}
			this.copied = snippet.id;
			this.$toast.success( "Copied the " + snippet.title + " snippet." );
			setTimeout( () => { this.copied = ""; }, 2000 );
		},

		/**
		 * @param {object} snippet A snippet
		 * @returns {boolean} True when it is the open tab
		 */
		isTab( snippet ) {
			return snippet.id === this.snippetTab;
		},

		/**
		 * Draws the preview: the real widget, given the look of the form. Run by x-effect, so it follows every change.
		 *
		 * @param {HTMLElement} node The <bx-agent> element
		 */
		paint( node ) {
			if ( node && this.widgetReady ) {
				node.look = this.previewLook;
			}
		},

		noVisits
	};
}
