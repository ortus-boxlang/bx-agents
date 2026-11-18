/**
 * Ways into the chat. Until the chat moves into this app, the chat is the current page (config.chatUrl), which opens
 * the conversation kept under CONVERSATION_KEY when it loads, as its own list does.
 */
export const CONVERSATION_KEY = "bxagents_webui_conversation";

/**
 * Opens a conversation in the chat.
 *
 * @param {string} chatUrl Where the chat is
 * @param {string} [id] The conversation, or none for a new one
 */
export function openInChat( chatUrl, id ) {
	try {
		if ( id ) {
			localStorage.setItem( CONVERSATION_KEY, id );
		} else {
			localStorage.removeItem( CONVERSATION_KEY );
		}
	} catch ( e ) {
		// the chat then opens its last conversation
	}
	window.location.href = chatUrl;
}

/**
 * Starts a conversation with an agent (a sub-agent you talk to directly) and opens it in the chat.
 *
 * @param {{ post: Function }} api The API client
 * @param {string} chatUrl Where the chat is
 * @param {string} agent The agent's name
 * @returns {Promise<boolean>} False when the server would not start it
 */
export async function talkTo( api, chatUrl, agent ) {
	const result = await api.post( "/sessions", { agent } );
	if ( !result.ok || !result.data.conversationId ) {
		return false;
	}
	openInChat( chatUrl, result.data.conversationId );
	return true;
}
