/**
 * Records proof that a change works: screenshots and a video of a tour of the web app, made against the dev stack
 * (npm run stack). A tour is tests/media/<name>.tour.js; it walks the flows and calls shot( name ) at each step.
 *
 *   node scripts/media.mjs <tour> [outDir]      default outDir: .stack/media/<tour>
 *
 * Writes <n>-<name>.png (at twice the pixels, for a sharp picture), tour.mp4 (H.264, plays in a browser and on GitHub)
 * and tour.gif (a small preview that plays inline in a pull request). Signs in as ada with the session the browser
 * tests saved (.stack/auth/ada.json): run npm run e2e once first, or sign in with the script's --sign-in.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ui = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), ".." );
const [ name, outArg ] = process.argv.slice( 2 ).filter( a => !a.startsWith( "--" ) );
if ( !name ) {
	console.error( "usage: node scripts/media.mjs <tour> [outDir]" );
	process.exit( 2 );
}
const out = path.resolve( outArg || path.join( ui, ".stack/media", name ) );
const base = process.env.UI_BASE || "http://127.0.0.1:8780/chat/";
const size = { width: 1280, height: 800 };
fs.rmSync( out, { recursive: true, force: true } );
fs.mkdirSync( path.join( out, "raw" ), { recursive: true } );

const browser = await chromium.launch();
let storageState = path.join( ui, ".stack/auth/ada.json" );
if ( process.argv.includes( "--sign-in" ) || !fs.existsSync( storageState ) ) {
	const page = await browser.newPage();
	await page.goto( base + "login.html" );
	await page.fill( "input[name=username]", "ada" );
	await page.fill( "input[type=password]", "demo-pass" );
	await Promise.all( [ page.waitForNavigation(), page.keyboard.press( "Enter" ) ] );
	storageState = await page.context().storageState();
	await page.close();
}
const context = await browser.newContext( {
	baseURL          : base,
	viewport         : size,
	deviceScaleFactor: 2,
	storageState,
	recordVideo      : { dir: path.join( out, "raw" ), size }
} );
const page = await context.newPage();
let count = 0;
/**
 * Saves a screenshot of the page as it is now.
 *
 * @param {string} label What it shows, used in the file name
 */
async function shot( label ) {
	count += 1;
	await page.screenshot( { path: path.join( out, String( count ).padStart( 2, "0" ) + "-" + label + ".png" ) } );
}
const tour = await import( pathToFileURL( path.join( ui, "tests/media", name + ".tour.js" ) ).href );
try {
	await tour.default( page, shot );
} finally {
	await context.close();
	await browser.close();
}
const raw = fs.readdirSync( path.join( out, "raw" ) ).find( f => f.endsWith( ".webm" ) );
const webm = path.join( out, "raw", raw );
execFileSync( "ffmpeg", [ "-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join( out, "tour.mp4" ) ] );
execFileSync( "ffmpeg", [ "-y", "-loglevel", "error", "-i", webm, "-vf", "fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer", path.join( out, "tour.gif" ) ] );
fs.rmSync( path.join( out, "raw" ), { recursive: true, force: true } );
console.log( "media: " + out );
for ( const f of fs.readdirSync( out ) ) {
	console.log( "  " + f + "  " + Math.round( fs.statSync( path.join( out, f ) ).size / 1024 ) + " KB" );
}
