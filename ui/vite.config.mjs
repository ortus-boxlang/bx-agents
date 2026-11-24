/**
 * Vite for the BX Agents web app, the way cbGenesis does it: coldbox-vite-plugin, one Sass entry and one JS entry.
 *
 * The output goes into the ColdBox module itself (src/main/bx/bxagentsui/includes/build). It is not committed: Gradle's
 * uiBuild makes it, so building this repository needs Node (24), and the module zip ships it built (an agent build never
 * needs Node). `npm run dev` writes includes/hot instead, and the module's Vite helper then loads the assets from this
 * dev server with hot reload.
 *
 * Docs: https://github.com/coldbox/coldbox-vite-plugin and https://vitejs.dev/config/
 */
import { defineConfig } from "vite";
import coldbox from "coldbox-vite-plugin";

// where a built agent serves the module's built assets (copied to <public>/includes/bxagentsui)
process.env.ASSET_URL ??= "/includes/bxagentsui";

export default defineConfig( {
	plugins : [
		coldbox( {
			input : [
				"resources/assets/scss/app.scss",
				"resources/assets/js/App.js"
			],
			publicDirectory : "../src/main/bx/bxagentsui/includes",
			// a change to a handler, a layout or a view reloads the page
			refresh         : [
				"../src/main/bx/bxagentsui/**/*.bxm",
				"../src/main/bx/bxagentsui/**/*.bx"
			]
		} )
	],
	server : {
		// the agent serves the page on another port: let it load the scripts from here
		cors : true
	},
	build : { emptyOutDir: true }
} );
