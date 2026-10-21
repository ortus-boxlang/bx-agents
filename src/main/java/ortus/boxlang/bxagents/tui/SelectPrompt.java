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
	private final List<String>	preface;
	private String				hotkeys		= "";
	private String				footerText	= "";
	private int					cursor;

	SelectPrompt( Theme theme, String title, String help, List<Choice> choices, String current ) {
		this( theme, title, help, choices, current, List.of() );
	}

	/**
	 * @param preface lines shown between the question and the choices, for a review screen
	 */
	SelectPrompt( Theme theme, String title, String help, List<Choice> choices, String current, List<String> preface ) {
		super( theme, title, help );
		this.preface	= preface;
		this.choices	= choices;
		for ( int i = 0; i < choices.size(); i++ ) {
			if ( choices.get( i ).value.equals( current ) ) {
				cursor = i;
			}
		}
	}

	/**
	 * Letters that finish the prompt with "letter:value" (the value of the option under the cursor), so a
	 * list can offer actions on its rows. Tab does the same as "tab:value".
	 *
	 * @param keys   the letters
	 * @param footer the hint line, or empty for the default
	 */
	SelectPrompt withHotkeys( String keys, String footer ) {
		this.hotkeys	= keys == null ? "" : keys;
		this.footerText	= footer == null ? "" : footer;
		return this;
	}

	@Override
	void key( KeyEvent key ) {
		abortKeys( key );
		if ( !key.hasCtrl() && !key.hasAlt() ) {
			String under = choices.isEmpty() ? "" : choices.get( cursor ).value;
			if ( key.isKey( KeyCode.TAB ) && !hotkeys.isEmpty() ) {
				finish( "tab:" + under );
				return;
			}
			if ( key.isKey( KeyCode.CHAR ) && key.string().length() == 1 && hotkeys.indexOf( key.string().charAt( 0 ) ) >= 0 ) {
				finish( key.string() + ":" + under );
				return;
			}
		}
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
		for ( String line : preface ) {
			rows.add( Row.of( "  " + line, theme.plain ) );
		}
		if ( !preface.isEmpty() ) {
			rows.add( Row.of() );
		}
		int	room		= Math.max( 3, height - rows.size() );
		int	first		= Math.max( 0, Math.min( cursor - room / 2, choices.size() - room ) );
		int	last		= Math.min( choices.size(), first + room );
		int	labelWidth	= 0;
		for ( Choice c : choices ) {
			labelWidth = Math.max( labelWidth, c.label.length() );
		}
		for ( int i = first; i < last; i++ ) {
			Choice	c	= choices.get( i );
			boolean	on	= i == cursor;
			Row		r	= Row.of().add( on ? "  > " : "    ", theme.accent );
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
		return footerText.isEmpty() ? "↑↓ move   enter select   esc back" : footerText;
	}

	static String pad( String s, int w ) {
		StringBuilder sb = new StringBuilder( s );
		while ( sb.length() < w ) {
			sb.append( ' ' );
		}
		return sb.toString();
	}

}
