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

import dev.tamboui.style.Color;
import dev.tamboui.style.Style;

/**
 * The one palette every BxAgents terminal screen draws with: teal as the
 * accent, green for "done", a quiet gray for hints. The values come from the
 * docs site theme (--bxsites-gradient-start/end), so the CLI looks like the
 * site.
 *
 * It degrades the way terminals expect: true color when COLORTERM says so, the
 * 256-color cube when TERM does, the 16 basic colors otherwise, and no color
 * at all when NO_COLOR is set (https://no-color.org) or TERM is "dumb".
 * {@link #paint(String, String)} serves the same palette to plain
 * <code>println</code> output (the summary and next-steps screens), so the
 * text printed after the full-screen UI closes matches it.
 */
public final class Theme {

	/** Palette entries by name; the same names {@link #paint} accepts. */
	private static final String[]	NAMES		= { "accent", "ok", "muted", "warn", "error" };
	private static final int[][]	RGB			= { { 0x00, 0xDB, 0xFF }, { 0x00, 0xFF, 0x78 }, { 0x93, 0xA8, 0xB8 }, { 0xFF, 0xB4, 0x54 }, { 0xFF, 0x5C, 0x5C } };
	private static final int[]		INDEXED		= { 45, 48, 109, 214, 203 };
	private static final int[]		BASIC		= { 36, 32, 90, 33, 31 };

	/** none, basic, indexed or truecolor */
	private final String			depth;

	public final Style				accent;
	public final Style				accentBold;
	public final Style				ok;
	public final Style				muted;
	public final Style				warn;
	public final Style				error;
	public final Style				plain;
	public final Style				bold;
	public final Style				selected;

	public Theme( String depth ) {
		this.depth		= depth;
		this.accent		= color( 0 );
		this.accentBold	= color( 0 ).bold();
		this.ok			= color( 1 );
		this.muted		= color( 2 );
		this.warn		= color( 3 );
		this.error		= color( 4 );
		this.plain		= Style.EMPTY;
		this.bold		= Style.EMPTY.bold();
		this.selected	= depth.equals( "none" ) ? Style.EMPTY.bold().reversed() : color( 0 ).bold();
	}

	/**
	 * Reads NO_COLOR, TERM and COLORTERM.
	 *
	 * @return the theme for this terminal
	 */
	public static Theme detect() {
		return detect( System.getenv( "NO_COLOR" ), System.getenv( "TERM" ), System.getenv( "COLORTERM" ) );
	}

	/**
	 * @param noColor   the NO_COLOR value, or null
	 * @param term      the TERM value, or null
	 * @param colorTerm the COLORTERM value, or null
	 *
	 * @return the theme those three variables select
	 */
	public static Theme detect( String noColor, String term, String colorTerm ) {
		String t = term == null ? "" : term;
		if ( ( noColor != null && !noColor.isEmpty() ) || t.equals( "dumb" ) ) {
			return new Theme( "none" );
		}
		String c = colorTerm == null ? "" : colorTerm.toLowerCase();
		if ( c.contains( "truecolor" ) || c.contains( "24bit" ) ) {
			return new Theme( "truecolor" );
		}
		return new Theme( t.contains( "256" ) ? "indexed" : "basic" );
	}

	/** @return none, basic, indexed or truecolor */
	public String depth() {
		return depth;
	}

	/** @return false when output must carry no color codes */
	public boolean hasColor() {
		return !depth.equals( "none" );
	}

	private Style color( int i ) {
		switch ( depth ) {
			case "truecolor" :
				return Style.EMPTY.fg( Color.rgb( RGB[ i ][ 0 ], RGB[ i ][ 1 ], RGB[ i ][ 2 ] ) );
			case "indexed" :
				return Style.EMPTY.fg( Color.indexed( INDEXED[ i ] ) );
			case "basic" :
				return Style.EMPTY.fg( basicColor( i ) );
			default :
				return Style.EMPTY;
		}
	}

	private static Color basicColor( int i ) {
		switch ( i ) {
			case 0 :
				return Color.CYAN;
			case 1 :
				return Color.GREEN;
			case 2 :
				return Color.GRAY;
			case 3 :
				return Color.YELLOW;
			default :
				return Color.RED;
		}
	}

	/**
	 * Wraps text in the ANSI codes for a palette entry, for plain output.
	 *
	 * @param name one of accent, ok, muted, warn, error, bold
	 * @param text the text to color
	 *
	 * @return the text with escape codes, or the text unchanged when color is off
	 */
	public String paint( String name, String text ) {
		if ( !hasColor() ) {
			return text;
		}
		String open;
		if ( name.equals( "bold" ) ) {
			open = "\u001b[1m";
		} else {
			int i = indexOf( name );
			if ( i < 0 ) {
				return text;
			}
			switch ( depth ) {
				case "truecolor" :
					open = "\u001b[38;2;" + RGB[ i ][ 0 ] + ";" + RGB[ i ][ 1 ] + ";" + RGB[ i ][ 2 ] + "m";
					break;
				case "indexed" :
					open = "\u001b[38;5;" + INDEXED[ i ] + "m";
					break;
				default :
					open = "\u001b[" + BASIC[ i ] + "m";
			}
		}
		return open + text + "\u001b[0m";
	}

	private static int indexOf( String name ) {
		for ( int i = 0; i < NAMES.length; i++ ) {
			if ( NAMES[ i ].equals( name ) ) {
				return i;
			}
		}
		return -1;
	}

}
