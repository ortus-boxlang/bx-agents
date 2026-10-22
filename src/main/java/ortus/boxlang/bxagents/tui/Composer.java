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
 * The message box at the bottom of the chat: a small multi-line editor with history.
 * It holds text and a caret and nothing else, so it tests without a terminal.
 *
 * Enter sends. Alt+Enter, Ctrl+J, or a trailing backslash before Enter adds a line.
 * Up and Down move between lines, and past the first or last line walk the history.
 * Ctrl+C clears what is typed, or asks to leave when the box is empty; Ctrl+D asks to
 * leave from an empty box.
 */
final class Composer {

	/** What a key did that the caller must act on. */
	enum Outcome {
		NONE, SUBMIT, EXIT, CLEARED
	}

	private final List<StringBuilder>	lines	= new ArrayList<>();
	private final List<String>			history	= new ArrayList<>();
	private int							row;
	private int							col;
	private int							historyAt;
	private String						draft	= "";

	private KeyMap						keys	= KeyMap.defaults();

	Composer() {
		lines.add( new StringBuilder() );
	}

	void keys( KeyMap keys ) {
		this.keys = keys;
	}

	/** @return the whole text, lines joined by newlines */
	String text() {
		StringBuilder sb = new StringBuilder();
		for ( int i = 0; i < lines.size(); i++ ) {
			if ( i > 0 ) {
				sb.append( '\n' );
			}
			sb.append( lines.get( i ) );
		}
		return sb.toString();
	}

	boolean isEmpty() {
		return lines.size() == 1 && lines.get( 0 ).length() == 0;
	}

	int rowCount() {
		return lines.size();
	}

	int caretRow() {
		return row;
	}

	int caretCol() {
		return col;
	}

	String line( int i ) {
		return lines.get( i ).toString();
	}

	/** Replaces the text and puts the caret at its end. */
	void setText( String text ) {
		lines.clear();
		for ( String l : text.split( "\n", -1 ) ) {
			lines.add( new StringBuilder( l ) );
		}
		row	= lines.size() - 1;
		col	= lines.get( row ).length();
	}

	/**
	 * The {@code @} mention the caret is in: an at sign that starts a word, and the letters after it up to the caret.
	 *
	 * @return the letters after the at sign, or null when the caret is not in a mention
	 */
	String atQuery() {
		String	line	= lines.get( row ).toString();
		int		from	= atStart( line );
		return from < 0 ? null : line.substring( from + 1, col );
	}

	/** Replaces the mention under the caret (the at sign and its letters) with {@code @path}, quoted when it has a space. */
	void replaceAtMention( String path ) {
		StringBuilder	current	= lines.get( row );
		int				from	= atStart( current.toString() );
		if ( from < 0 ) {
			return;
		}
		String mention = "@" + ( path.contains( " " ) ? "\"" + path + "\"" : path ) + " ";
		current.replace( from, col, mention );
		col = from + mention.length();
	}

	/** Where the at sign of the mention before the caret is, or -1. */
	private int atStart( String line ) {
		for ( int i = col - 1; i >= 0; i-- ) {
			char c = line.charAt( i );
			if ( c == ' ' || c == '"' ) {
				return -1;
			}
			if ( c == '@' ) {
				return i == 0 || line.charAt( i - 1 ) == ' ' ? i : -1;
			}
		}
		return -1;
	}

	/** Remembers a sent message for Up, and empties the box. */
	void sent() {
		String t = text();
		if ( !t.isBlank() && ( history.isEmpty() || !history.get( history.size() - 1 ).equals( t ) ) ) {
			history.add( t );
		}
		historyAt	= history.size();
		draft		= "";
		setText( "" );
	}

	void paste( String pasted ) {
		for ( String part : pasted.replace( "\r\n", "\n" ).replace( '\r', '\n' ).split( "(?<=\n)", -1 ) ) {
			boolean newline = part.endsWith( "\n" );
			insert( newline ? part.substring( 0, part.length() - 1 ) : part );
			if ( newline ) {
				newLine();
			}
		}
	}

	Outcome key( KeyEvent k ) {
		if ( keys.is( KeyMap.Action.CLEAR, k ) ) {
			if ( isEmpty() ) {
				return Outcome.EXIT;
			}
			setText( "" );
			return Outcome.CLEARED;
		}
		if ( keys.is( KeyMap.Action.EXIT, k ) ) {
			if ( isEmpty() ) {
				return Outcome.EXIT;
			}
			deleteForward();
			return Outcome.NONE;
		}
		if ( keys.is( KeyMap.Action.NEWLINE, k ) ) {
			newLine();
			return Outcome.NONE;
		}
		if ( keys.is( KeyMap.Action.SUBMIT, k ) ) {
			StringBuilder current = lines.get( row );
			if ( current.length() > 0 && current.charAt( current.length() - 1 ) == '\\' && col == current.length() ) {
				current.setLength( current.length() - 1 );
				col--;
				newLine();
				return Outcome.NONE;
			}
			return text().isBlank() ? Outcome.NONE : Outcome.SUBMIT;
		}
		if ( keys.is( KeyMap.Action.DELETE_TO_START, k ) ) {
			lines.get( row ).delete( 0, col );
			col = 0;
		} else if ( keys.is( KeyMap.Action.DELETE_WORD, k ) ) {
			deleteWordBack();
		} else if ( keys.is( KeyMap.Action.LINE_START, k ) ) {
			col = 0;
		} else if ( keys.is( KeyMap.Action.LINE_END, k ) ) {
			col = lines.get( row ).length();
		} else if ( keys.is( KeyMap.Action.HISTORY_PREVIOUS, k ) && row == 0 ) {
			historyPrevious();
		} else if ( keys.is( KeyMap.Action.HISTORY_NEXT, k ) && row == lines.size() - 1 ) {
			historyNext();
		} else if ( k.isKey( KeyCode.LEFT ) ) {
			if ( col > 0 ) {
				col--;
			} else if ( row > 0 ) {
				row--;
				col = lines.get( row ).length();
			}
		} else if ( k.isKey( KeyCode.RIGHT ) ) {
			if ( col < lines.get( row ).length() ) {
				col++;
			} else if ( row < lines.size() - 1 ) {
				row++;
				col = 0;
			}
		} else if ( k.isKey( KeyCode.UP ) ) {
			if ( row > 0 ) {
				row--;
				col = Math.min( col, lines.get( row ).length() );
			}
		} else if ( k.isKey( KeyCode.DOWN ) ) {
			if ( row < lines.size() - 1 ) {
				row++;
				col = Math.min( col, lines.get( row ).length() );
			}
		} else if ( k.isKey( KeyCode.BACKSPACE ) ) {
			backspace();
		} else if ( k.isKey( KeyCode.DELETE ) ) {
			deleteForward();
		} else if ( k.isKey( KeyCode.CHAR ) && !k.hasCtrl() && !k.hasAlt() ) {
			insert( k.string() );
		}
		return Outcome.NONE;
	}

	private void insert( String s ) {
		lines.get( row ).insert( col, s );
		col += s.length();
	}

	private void newLine() {
		StringBuilder	current	= lines.get( row );
		String			rest	= current.substring( col );
		current.setLength( col );
		lines.add( row + 1, new StringBuilder( rest ) );
		row++;
		col = 0;
	}

	private void backspace() {
		if ( col > 0 ) {
			lines.get( row ).deleteCharAt( --col );
		} else if ( row > 0 ) {
			StringBuilder	previous	= lines.get( row - 1 );
			int				joinAt		= previous.length();
			previous.append( lines.remove( row ) );
			row--;
			col = joinAt;
		}
	}

	private void deleteForward() {
		StringBuilder current = lines.get( row );
		if ( col < current.length() ) {
			current.deleteCharAt( col );
		} else if ( row < lines.size() - 1 ) {
			current.append( lines.remove( row + 1 ) );
		}
	}

	private void deleteWordBack() {
		StringBuilder	current	= lines.get( row );
		int				at		= col;
		while ( at > 0 && current.charAt( at - 1 ) == ' ' ) {
			at--;
		}
		while ( at > 0 && current.charAt( at - 1 ) != ' ' ) {
			at--;
		}
		current.delete( at, col );
		col = at;
	}

	private void historyPrevious() {
		if ( history.isEmpty() || historyAt == 0 ) {
			return;
		}
		if ( historyAt == history.size() ) {
			draft = text();
		}
		historyAt--;
		setText( history.get( historyAt ) );
	}

	private void historyNext() {
		if ( historyAt >= history.size() ) {
			return;
		}
		historyAt++;
		setText( historyAt == history.size() ? draft : history.get( historyAt ) );
	}

}
