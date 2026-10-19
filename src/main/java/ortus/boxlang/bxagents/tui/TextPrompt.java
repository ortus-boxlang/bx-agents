/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package ortus.boxlang.bxagents.tui;

import java.util.ArrayList;
import java.util.List;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

/**
 * One line of text. Left/Right/Home/End move, Backspace/Delete edit, Ctrl+U
 * clears. A secret prompt shows bullets and keeps its text out of the
 * transcript. An empty Enter takes the default; with no default it asks again.
 */
final class TextPrompt extends Prompt {

	private final StringBuilder	text;
	private final String		fallback;
	private final boolean		secret;
	private final String		requiredMessage;
	private int					caret;
	private boolean				rejected;

	TextPrompt( Theme theme, String title, String help, String fallback, boolean secret, String requiredMessage ) {
		super( theme, title, help );
		this.fallback			= fallback == null ? "" : fallback;
		this.secret				= secret;
		this.requiredMessage	= requiredMessage == null ? "" : requiredMessage;
		this.text				= new StringBuilder();
	}

	@Override
	void key( KeyEvent key ) {
		abortKeys( key );
		if ( key.isKey( KeyCode.ENTER ) ) {
			String value = text.length() == 0 ? fallback : text.toString();
			if ( value.isEmpty() && !requiredMessage.isEmpty() ) {
				rejected = true;
				return;
			}
			finish( value );
		} else if ( key.isKey( KeyCode.BACKSPACE ) ) {
			if ( caret > 0 ) {
				text.deleteCharAt( --caret );
			}
		} else if ( key.isKey( KeyCode.DELETE ) ) {
			if ( caret < text.length() ) {
				text.deleteCharAt( caret );
			}
		} else if ( key.isKey( KeyCode.LEFT ) ) {
			caret = Math.max( 0, caret - 1 );
		} else if ( key.isKey( KeyCode.RIGHT ) ) {
			caret = Math.min( text.length(), caret + 1 );
		} else if ( key.isKey( KeyCode.HOME ) ) {
			caret = 0;
		} else if ( key.isKey( KeyCode.END ) ) {
			caret = text.length();
		} else if ( key.hasCtrl() && key.isChar( 'u' ) ) {
			text.setLength( 0 );
			caret = 0;
		} else if ( key.isKey( KeyCode.CHAR ) && !key.hasCtrl() && !key.hasAlt() ) {
			text.insert( caret, key.string() );
			caret		+= key.string().length();
			rejected	= false;
		}
	}

	/** Pasted text goes in at the caret, newlines dropped. */
	void paste( String pasted ) {
		String clean = pasted.replace( "\r", "" ).replace( "\n", "" );
		text.insert( caret, clean );
		caret += clean.length();
	}

	@Override
	List<Row> render( int width, int height ) {
		List<Row> rows = new ArrayList<>();
		rows.add( titleRow() );
		if ( !help.isEmpty() ) {
			rows.add( helpRow() );
		}
		String	shown	= secret ? "•".repeat( text.length() ) : text.toString();
		Row		r		= Row.of().add( "  > ", theme.accent );
		if ( text.length() == 0 && !fallback.isEmpty() ) {
			r.add( "▏", theme.accent ).add( secret ? "" : fallback, theme.muted );
		} else {
			r.add( shown.substring( 0, caret ), theme.plain ).add( "▏", theme.accent ).add( shown.substring( caret ), theme.plain );
		}
		rows.add( r );
		if ( rejected ) {
			rows.add( Row.of( "    " + requiredMessage, theme.error ) );
		}
		return rows;
	}

	@Override
	String footer() {
		return "enter confirm   esc back";
	}

}
