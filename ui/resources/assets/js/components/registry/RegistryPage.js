import { keepInAddress } from "../../utils/address.js";

/**
 * The Registry page: the tools (GET /tools, grouped by the word before the first underscore), the skills (GET /skills,
 * with a reader: GET /skills/read) and the volumes (GET /volumes). The tab comes from the address (data-tab).
 */

/**
 * @param {Array<{ name: string, description?: string }>} tools The tools
 * @param {string} query A search
 * @returns {Array<{ key: string, tools: Array<object> }>} The tools that match, grouped ("note_remember" is in "note"),
 *          groups by name with "other" last
 */
export function groupTools( tools, query ) {
	const term = String( query || "" ).trim().toLowerCase();
	const groups = {};
	tools.filter( t => !term || ( t.name + " " + ( t.description || "" ) ).toLowerCase().includes( term ) ).forEach( t => {
		const cut = t.name.indexOf( "_" );
		const key = cut > 0 ? t.name.slice( 0, cut ) : "other";
		( groups[ key ] = groups[ key ] || [] ).push( t );
	} );
	return Object.keys( groups )
		.sort( ( a, b ) => a === "other" ? 1 : b === "other" ? -1 : a < b ? -1 : 1 )
		.map( key => ( { key, tools: groups[ key ] } ) );
}

/**
 * @param {string} name A tool's name
 * @param {string[]} connectorIds The connectors' ids
 * @returns {boolean} True for a connector's tool (named <id>__<tool>)
 */
export function fromConnector( name, connectorIds ) {
	const cut = name.indexOf( "__" );
	return cut > 0 && connectorIds.includes( name.slice( 0, cut ) );
}

/**
 * @returns {object} Alpine component state and actions
 */
export function registryPage() {
	return {
		/** @type {string} tools | skills | volumes */
		tab         : "tools",
		/** @type {Object<string, boolean>} True for each tab that has loaded */
		loaded      : {},
		/** @type {string} Why the open tab could not be read */
		failed      : "",
		/** @type {Array<object>} The tools */
		tools       : [],
		/** @type {string[]} The connectors' ids */
		connectorIds: [],
		/** @type {string} A search in the tools */
		query       : "",
		/** @type {Array<object>} The skills */
		skills      : [],
		/** @type {{ name: string, text: string, note: string } | null} The skill being read */
		reading     : null,
		/** @type {Array<object>} The volumes */
		volumes     : [],

		/** @returns {Array<{ key: string, tools: Array<object> }>} The tools that match the search, grouped */
		get groups() {
			return groupTools( this.tools, this.query );
		},

		/** Opens the tab from the address and loads it. */
		init() {
			const wanted = this.$el.dataset.tab;
			this.tab = [ "tools", "skills", "volumes" ].includes( wanted ) ? wanted : "tools";
			this.$watch( "tab", tab => {
				keepInAddress( this.$store.session.config.basePath + "/registry/" + tab );
				this.load();
			} );
			this.load();
		},

		/** Loads the open tab, once. */
		async load() {
			if ( this.loaded[ this.tab ] ) {
				return;
			}
			this.failed = "";
			const tab = this.tab;
			if ( tab === "tools" ) {
				await this.$store.session.loaded();
				const [ tools, connectors ] = await Promise.all( [
					this.$api.get( "/tools" ),
					this.$store.session.can( "connectors" ) ? this.$api.get( "/connectors" ) : Promise.resolve( { ok: false } )
				] );
				this.failed = tools.ok ? "" : "Could not load the tools.";
				this.tools = tools.ok ? tools.data.tools || [] : [];
				this.connectorIds = connectors.ok ? ( connectors.data.connectors || [] ).map( c => c.id ) : [];
			} else if ( tab === "skills" ) {
				const result = await this.$api.get( "/skills" );
				this.failed = result.ok ? "" : "Could not load the skills.";
				this.skills = result.ok ? result.data.skills || [] : [];
			} else {
				const result = await this.$api.get( "/volumes" );
				this.failed = result.ok ? "" : "Could not load the volumes.";
				this.volumes = result.ok ? result.data.volumes || [] : [];
			}
			this.loaded[ tab ] = true;
		},

		/**
		 * @param {string} name A tool's name
		 * @returns {boolean} True for a connector's tool
		 */
		isConnectorTool( name ) {
			return fromConnector( name, this.connectorIds );
		},

		/**
		 * Opens the reader on a skill.
		 *
		 * @param {{ name: string }} skill The skill
		 */
		async read( skill ) {
			this.reading = { name: skill.name, text: "Loading...", note: "" };
			const result = await this.$api.get( "/skills/read?name=" + encodeURIComponent( skill.name ) );
			if ( !result.ok ) {
				this.reading.text = result.error || "Could not read this skill.";
				return;
			}
			const s = result.data;
			if ( typeof s.body !== "string" ) {
				this.reading.text = "This server cannot show the text of a skill yet.";
				return;
			}
			this.reading.text = s.body;
			this.reading.note = ( s.origin ? "Written by the " + s.origin + ". " : "" ) + ( s.size ? s.size + " bytes. " : "" )
				+ ( s.savedAt ? "Saved " + this.$fmt.stampText( s.savedAt ) + "." : "" );
		}
	};
}
