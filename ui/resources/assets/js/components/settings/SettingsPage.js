/**
 * The Settings page: the appearance (the theme and appearance stores), the model for the next messages (GET /profiles,
 * kept in this browser as the chat keeps it), the account, the extensions (GET /extensions, admin) and the server
 * (GET /agent).
 *
 * @returns {object} Alpine component state and actions
 */
import { accentForeground, contrastRatio, normalizeHex } from "../../utils/color.js";

const PROFILE_KEY = "bxagents_webui_profile";
const EXTENSION_LISTS = [
	"commands",
	"schedulers",
	"slots",
	"keys",
	"verbs",
	"sources",
	"prefixes"
];

/**
 * @param {object} ext An extension as GET /extensions answers it
 * @returns {string} What it adds: "commands: a, b; slots: c", or ""
 */
export function extensionAdds( ext ) {
	return EXTENSION_LISTS.filter( k => ( ext[ k ] || [] ).length ).map( k => k + ": " + ext[ k ].join( ", " ) ).join( "; " );
}

/**
 * @param {object} info What GET /agent answers
 * @returns {Array<{ label: string, value: string }>} The facts worth showing, in order
 */
export function serverFacts( info ) {
	const vision = info.vision === "yes" ? "The model can see them" : info.vision === "no" ? "Not offered" : "";
	return [
		{ label: "Agent", value: info.name || "" },
		{ label: "Model", value: info.model || "" },
		{ label: "Tools", value: info.toolCount !== undefined ? String( info.toolCount ) : "" },
		{ label: "Context window", value: info.contextWindow ? info.contextWindow + " tokens" : "" },
		{ label: "Pictures", value: vision },
		{ label: "Sub-agents", value: ( info.subAgents || [] ).length ? info.subAgents.join( ", " ) : "None" }
	].filter( fact => fact.value );
}

/**
 * @returns {object} Alpine component state and actions
 */
export function settingsPage() {
	return {
		/** @type {string} The accent as typed in the hex box */
		hex               : "",
		/** @type {boolean} True when the hex box holds no colour */
		hexInvalid        : false,
		/** @type {Array<{ name: string, model?: string, description?: string, provider?: string }>} Profiles offered */
		profiles          : [],
		/** @type {string} The profile for the next messages ("" for the default model) */
		profile           : "",
		/** @type {boolean} True once GET /extensions answered */
		extensionsShown   : false,
		/** @type {Array<object>} The extensions */
		extensions        : [],
		/** @type {string[]} Problems the loader found */
		extensionProblems : [],
		/** @type {Array<{ label: string, value: string }>} The server's facts */
		facts             : [],

		/** Loads what the page shows; the model and the extensions once the capabilities are known. */
		async init() {
			this.hex = this.$store.appearance.accent;
			this.loadServer();
			await this.$store.session.loaded();
			if ( this.$store.session.can( "profiles" ) ) {
				this.loadProfiles();
			}
			if ( this.$store.session.can( "admin" ) ) {
				this.loadExtensions();
			}
		},

		/** @returns {string} "4.6 : 1 on buttons", for the accent in use */
		get contrastText() {
			const accent = this.$store.appearance.accent;
			if ( !accent ) {
				return "";
			}
			const ratio = contrastRatio( accent, accentForeground( accent ) );
			return ratio.toFixed( 1 ) + " : 1 on buttons" + ( ratio < 4.5 ? ", low" : "" );
		},

		/** @returns {boolean} True when the accent's text is hard to read */
		get contrastLow() {
			const accent = this.$store.appearance.accent;
			return !!accent && contrastRatio( accent, accentForeground( accent ) ) < 4.5;
		},

		/**
		 * @param {string} accent "#rrggbb", or "" for the default
		 */
		pickAccent( accent ) {
			this.$store.appearance.set( { accent } );
			this.hex = accent;
			this.hexInvalid = false;
		},

		/** Takes the colour typed in the hex box. */
		takeHex() {
			if ( this.hex.trim() === "" ) {
				this.pickAccent( "" );
				return;
			}
			const accent = normalizeHex( this.hex );
			if ( !accent ) {
				this.hexInvalid = true;
				return;
			}
			this.pickAccent( accent );
		},

		/** Back to the project's own look and the system's mode. */
		reset() {
			this.$store.appearance.reset();
			this.$store.theme.set( "system" );
			this.hex = "";
			this.hexInvalid = false;
		},

		/** Reads the profiles the server offers, and the one this browser chose. */
		async loadProfiles() {
			const result = await this.$api.get( "/profiles" );
			if ( !result.ok ) {
				return;
			}
			this.profiles = result.data.profiles || [];
			let remembered = "";
			try {
				remembered = localStorage.getItem( PROFILE_KEY ) || "";
			} catch {
				remembered = "";
			}
			this.profile = this.profiles.some( p => p.name === remembered ) ? remembered : "";
		},

		/**
		 * @param {{ name: string, model?: string }} profile A profile
		 * @returns {string} "fast (gpt-4o-mini)"
		 */
		profileLabel( profile ) {
			return profile.name + ( profile.model ? " (" + profile.model + ")" : "" );
		},

		/** Keeps the chosen profile in this browser, where the chat reads it. */
		pickProfile() {
			try {
				localStorage.setItem( PROFILE_KEY, this.profile );
			} catch {
				// the choice still holds for this visit
			}
			const chosen = this.profiles.find( p => p.name === this.profile );
			this.$toast.success( "The next messages use " + ( chosen ? this.profileLabel( chosen ) : "the default model" ) + "." );
		},

		/** Reads the extensions (older servers have no such route: the card stays hidden). */
		async loadExtensions() {
			const result = await this.$api.get( "/extensions" );
			if ( !result.ok || !Array.isArray( result.data.extensions ) ) {
				return;
			}
			this.extensions = result.data.extensions;
			this.extensionProblems = result.data.problems || [];
			this.extensionsShown = true;
		},

		/** Loads the extensions again (admin). */
		async reloadExtensions() {
			const result = await this.$api.post( "/extensions/reload", {} );
			if ( result.ok ) {
				this.$toast.success( "Reloaded: " + result.data.loaded + " loaded, " + result.data.failed + " failed." );
			} else {
				this.$toast.error( result.error || "Could not reload the extensions." );
			}
			await this.loadExtensions();
		},

		/**
		 * @param {{ state?: string }} ext An extension
		 * @returns {boolean} True when it loaded fine
		 */
		extensionGood( ext ) {
			return !/fail|error|disabled|skipped/i.test( ext.state || "" );
		},

		/** What an extension adds */
		extensionAdds,

		/** Reads what the server says about the agent. */
		async loadServer() {
			const result = await this.$api.get( "/agent" );
			if ( result.ok ) {
				this.facts = serverFacts( result.data );
			}
		}
	};
}
