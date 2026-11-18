/**
 * Markdown from the model or a person, as HTML that is safe to put in the page: marked turns it into HTML and DOMPurify
 * removes anything that could run (scripts, event handlers, javascript: links). The only way the web app writes HTML
 * from text it did not make itself; `x-html` is used with $md and nowhere else.
 */
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions( { gfm: true, breaks: true } );

/**
 * @param {string} text Markdown
 * @returns {string} Safe HTML
 */
export function renderMarkdown( text ) {
	const html = marked.parse( String( text || "" ) );
	return DOMPurify.sanitize( html, { USE_PROFILES: { html: true } } );
}
