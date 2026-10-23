// Bundles entry.js into ../../src/main/bx/models/build/generators/webui/vendor/libs.min.js (one IIFE, licence
// comments kept) and prints what went in. The output is committed: building a project needs no Node.
import { build } from "esbuild"
import { statSync } from "node:fs"

const out = new URL( "../../src/main/bx/models/build/generators/webui/vendor/libs.min.js", import.meta.url ).pathname
await build( {
	entryPoints : [ new URL( "entry.js", import.meta.url ).pathname ],
	outfile     : out,
	bundle      : true,
	minify      : true,
	format      : "iife",
	target      : "es2020",
	legalComments : "inline",
	banner      : { js : "/* marked (MIT), DOMPurify (Apache-2.0 or MPL-2.0) and highlight.js (BSD-3-Clause), bundled by tools/webui-vendor. */" }
} )
console.log( out, statSync( out ).size + " bytes" )
