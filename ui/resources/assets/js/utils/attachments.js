/**
 * What goes with a message: pictures travel as attachments for the server to check and build, text files are read here
 * and go inside the message. The server checks everything again; these checks only save the upload.
 */
export const IMAGE_TYPES = [ "image/png", "image/jpeg", "image/gif", "image/webp" ];
export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_CHARS = 100000;
const TEXT_NAMES = /\.(txt|md|json|ya?ml|csv|xml|html?|css|js|ts|bx|bxs|bxm|cfc|cfm|java|py|sql|sh|log|ini|toml)$/i;

/**
 * @param {{ name: string, type: string, size: number }} file A file chosen, pasted or dropped
 * @param {{ images: number, seesImages: boolean }} state How many pictures wait, and whether the model can see them
 * @returns {{ kind: "image" | "text" | "", problem: string }} What it is, or why it cannot go
 */
export function classifyFile( file, state ) {
	if ( IMAGE_TYPES.includes( file.type ) ) {
		if ( !state.seesImages ) {
			return { kind: "", problem: "The model in use cannot see pictures." };
		}
		if ( state.images >= MAX_IMAGES ) {
			return { kind: "", problem: "At most " + MAX_IMAGES + " pictures go with one message." };
		}
		if ( file.size > MAX_IMAGE_BYTES ) {
			return { kind: "", problem: file.name + " is larger than 5 MB." };
		}
		return { kind: "image", problem: "" };
	}
	if ( ( file.type || "" ).startsWith( "text/" ) || TEXT_NAMES.test( file.name || "" ) ) {
		return { kind: "text", problem: "" };
	}
	return { kind: "", problem: file.name + " is not a picture or a text file." };
}

/**
 * @param {string} content A text file's content
 * @returns {string} It, cut at MAX_TEXT_CHARS with a note saying so
 */
export function clipText( content ) {
	return content.length > MAX_TEXT_CHARS ? content.slice( 0, MAX_TEXT_CHARS ) + "\n(the file was cut at " + MAX_TEXT_CHARS + " characters)" : content;
}

/**
 * @param {string} text What was typed
 * @param {Array<{ name: string, content: string }>} texts The text files that go with it
 * @returns {string} The message with each file's contents after it, in a code block
 */
export function withTextFiles( text, texts ) {
	return texts.reduce( ( all, f ) => all + "\n\nAttached, the contents of the file `" + f.name + "`:\n```\n" + f.content + "\n```", text );
}

/**
 * @param {string} dataUrl A picture read as a data: address
 * @returns {string} Its base64 data, as the API takes it
 */
export function base64Of( dataUrl ) {
	return dataUrl.slice( dataUrl.indexOf( "," ) + 1 );
}
