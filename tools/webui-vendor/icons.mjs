// Builds ../../src/main/bx/models/build/generators/webui/vendor/icons.svg: one SVG sprite with a <symbol id="i-<name>"> for each
// Phosphor icon (regular weight) named in icons.json. The generated page inlines the sprite and uses <svg><use href="#i-name"/></svg>.
// The output is committed, so building a project needs no Node. Add a name to icons.json and run `npm run icons` to ship another icon.
import { readFileSync, writeFileSync, existsSync } from "node:fs"

const root = new URL( "./node_modules/@phosphor-icons/core/", import.meta.url ).pathname
const out = new URL( "../../src/main/bx/models/build/generators/webui/vendor/icons.svg", import.meta.url ).pathname
const names = JSON.parse( readFileSync( new URL( "icons.json", import.meta.url ), "utf8" ) )
const version = JSON.parse( readFileSync( root + "package.json", "utf8" ) ).version
const missing = []
const symbols = []
for ( const name of [ ...new Set( names ) ].sort() ) {
	const file = root + "assets/regular/" + name + ".svg"
	if ( !existsSync( file ) ) {
		missing.push( name )
		continue
	}
	const inner = readFileSync( file, "utf8" ).replace( /^[\s\S]*?<svg[^>]*>/, "" ).replace( /<\/svg>\s*$/, "" ).trim()
	symbols.push( `<symbol id="i-${ name }" viewBox="0 0 256 256">${ inner }</symbol>` )
}
if ( missing.length ) {
	console.error( "No such Phosphor icon: " + missing.join( ", " ) )
	process.exit( 1 )
}
const sprite = `<!-- Phosphor Icons ${ version } (regular), MIT License, Copyright (c) 2023 Phosphor Icons. Built by tools/webui-vendor/icons.mjs. -->\n` +
	`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">\n${ symbols.join( "\n" ) }\n</svg>\n`
writeFileSync( out, sprite )
console.log( out, sprite.length + " bytes,", symbols.length + " icons" )
