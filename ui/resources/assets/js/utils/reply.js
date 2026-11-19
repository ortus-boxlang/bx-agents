/**
 * What a slash command answers (POST /command): a Reply of blocks to show in order, and effects that say what happened
 * to the conversation. Blocks: text { text, style }, table { rows, layout }, file { name, mime, text }, choose { title,
 * options: [ { label, hint, line } ] }. Effects: conversation { id } (another one opened), reset (messages gone).
 *
 * @param {{ effects?: Array<{ type: string, id?: string }> }} reply The Reply
 * @param {string} openId The conversation open now
 * @returns {{ open: string, reload: boolean }} A conversation to open instead, or that this one must be read again
 */
export function replyEffects( reply, openId ) {
	const effects = reply.effects || [];
	const opened = effects.find( e => e.type === "conversation" );
	if ( opened && opened.id && opened.id !== openId ) {
		return { open: opened.id, reload: false };
	}
	return { open: "", reload: effects.some( e => e.type === "reset" ) };
}

/**
 * @param {Array<{ name: string }>} commands The commands offered (GET /commands)
 * @param {string} typed What is in the composer
 * @returns {Array<object>} The commands that start with it, while only a command name is typed
 */
export function slashMatches( commands, typed ) {
	if ( !commands.length || !typed.startsWith( "/" ) || /\s/.test( typed ) ) {
		return [];
	}
	return commands.filter( c => c.name.startsWith( typed.toLowerCase() ) );
}
