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
 * Pick one option. Up/Down (or k/j) move, Enter picks. Longer lists scroll in
 * a window sized to the room the screen has left.
 */
final class SelectPrompt extends Prompt {

	private final List<Choice>	choices;
	private int					cursor;

	SelectPrompt( Theme theme, String title, String help, List<Choice> choices, String current ) {
		super( theme, title, help );
		this.choices = choices;
		for ( int i = 0; i < choices.size(); i++ ) {
			if ( choices.get( i ).value.equals( current ) ) {
				cursor = i;
			}
		}
	}

	@Override
	void key( KeyEvent key ) {
		abortKeys( key );
		if ( choices.isEmpty() ) {
			return;
		}
		if ( key.isKey( KeyCode.UP ) || key.isChar( 'k' ) ) {
			cursor = ( cursor + choices.size() - 1 ) % choices.size();
		} else if ( key.isKey( KeyCode.DOWN ) || key.isChar( 'j' ) ) {
			cursor = ( cursor + 1 ) % choices.size();
		} else if ( key.isKey( KeyCode.HOME ) ) {
			cursor = 0;
		} else if ( key.isKey( KeyCode.END ) ) {
			cursor = choices.size() - 1;
		} else if ( key.isKey( KeyCode.ENTER ) ) {
			finish( choices.get( cursor ).value );
		}
	}

	@Override
	List<Row> render( int width, int height ) {
		List<Row> rows = new ArrayList<>();
		rows.add( titleRow() );
		if ( !help.isEmpty() ) {
			rows.add( helpRow() );
		}
		int room = Math.max( 3, height - rows.size() );
		int first = Math.max( 0, Math.min( cursor - room / 2, choices.size() - room ) );
		int last = Math.min( choices.size(), first + room );
		int labelWidth = 0;
		for ( Choice c : choices ) {
			labelWidth = Math.max( labelWidth, c.label.length() );
		}
		for ( int i = first; i < last; i++ ) {
			Choice c = choices.get( i );
			boolean on = i == cursor;
			Row r = Row.of().add( on ? "  > " : "    ", theme.accent );
			r.add( pad( c.label, labelWidth ), on ? theme.selected : theme.plain );
			if ( !c.hint.isEmpty() ) {
				r.add( "  " + c.hint, theme.muted );
			}
			rows.add( r );
		}
		if ( first > 0 || last < choices.size() ) {
			rows.add( Row.of( "    " + ( first > 0 ? "↑ " : "  " ) + ( last < choices.size() ? "↓ more" : "" ), theme.muted ) );
		}
		return rows;
	}

	@Override
	String footer() {
		return "↑↓ move   enter select   esc back";
	}


	static String pad( String s, int w ) {
		StringBuilder sb = new StringBuilder( s );
		while ( sb.length() < w ) {
			sb.append( ' ' );
		}
		return sb.toString();
	}

}
