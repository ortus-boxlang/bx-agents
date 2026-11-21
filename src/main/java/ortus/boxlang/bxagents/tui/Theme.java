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
	private static final String[]	NAMES			= { "accent", "ok", "muted", "warn", "error" };
	private static final int[][]	RGB				= { { 0x00, 0xDB, 0xFF }, { 0x00, 0xFF, 0x78 }, { 0x93, 0xA8, 0xB8 }, { 0xFF, 0xB4, 0x54 },
	    { 0xFF, 0x5C, 0x5C } };
	private static final int[]		INDEXED			= { 45, 48, 109, 214, 203 };
	private static final int[]		BASIC			= { 36, 32, 90, 33, 31 };

	/** The same entries for a light background, darker so that they can be read on white */
	private static final int[][]	RGB_LIGHT		= { { 0x00, 0x7A, 0x99 }, { 0x00, 0x80, 0x3C }, { 0x55, 0x65, 0x70 }, { 0xB3, 0x6B, 0x00 },
	    { 0xC0, 0x20, 0x20 } };
	private static final int[]		INDEXED_LIGHT	= { 31, 28, 242, 130, 124 };

	/** none, basic, indexed or truecolor */
	private final String			depth;

	/** True for the colours made for a light background */
	private final boolean			light;

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
		this( depth, false );
	}

	/**
	 * @param depth none, basic, indexed or truecolor
	 * @param light true for the colours that can be read on a light background
	 */
	public Theme( String depth, boolean light ) {
		this.depth		= depth;
		this.light		= light;
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
		return detect( noColor, term, colorTerm, "dark", null );
	}

	/**
	 * @param noColor   the NO_COLOR value, or null
	 * @param term      the TERM value, or null
	 * @param colorTerm the COLORTERM value, or null
	 * @param mode      {@code dark} or {@code light} to say what the terminal's background is, or {@code auto} to go by COLORFGBG
	 * @param colorFgBg the COLORFGBG value, such as {@code 15;0}, or null
	 *
	 * @return the theme those variables and the mode select
	 */
	public static Theme detect( String noColor, String term, String colorTerm, String mode, String colorFgBg ) {
		String t = term == null ? "" : term;
		if ( ( noColor != null && !noColor.isEmpty() ) || t.equals( "dumb" ) ) {
			return new Theme( "none" );
		}
		boolean	light	= "light".equals( mode ) || "auto".equals( mode ) && lightBackground( colorFgBg );
		String	c		= colorTerm == null ? "" : colorTerm.toLowerCase();
		if ( c.contains( "truecolor" ) || c.contains( "24bit" ) ) {
			return new Theme( "truecolor", light );
		}
		return new Theme( t.contains( "256" ) ? "indexed" : "basic", light );
	}

	/**
	 * @param colorFgBg the COLORFGBG value, foreground and background colour numbers joined by a semicolon, or null
	 *
	 * @return true when the background is white or light grey (7 or 15), which some terminals report this way
	 */
	private static boolean lightBackground( String colorFgBg ) {
		if ( colorFgBg == null || !colorFgBg.contains( ";" ) ) {
			return false;
		}
		String bg = colorFgBg.substring( colorFgBg.lastIndexOf( ';' ) + 1 ).strip();
		return bg.equals( "7" ) || bg.equals( "15" );
	}

	/**
	 * Reads NO_COLOR, TERM, COLORTERM and COLORFGBG, with the theme setting
	 *
	 * @param mode {@code auto}, {@code dark} or {@code light}
	 *
	 * @return the theme for this terminal and that mode
	 */
	public static Theme detect( String mode ) {
		return detect( System.getenv( "NO_COLOR" ), System.getenv( "TERM" ), System.getenv( "COLORTERM" ), mode, System.getenv( "COLORFGBG" ) );
	}

	/** @return none, basic, indexed or truecolor */
	public String depth() {
		return depth;
	}

	/** @return false when output must carry no color codes */
	public boolean hasColor() {
		return !depth.equals( "none" );
	}

	/** @return true when a background can be laid under text, which the panel prompt style needs */
	public boolean hasPanel() {
		return depth.equals( "truecolor" ) || depth.equals( "indexed" );
	}

	/**
	 * @param style a text style
	 *
	 * @return the style with the panel's background colour under it; unchanged when {@link #hasPanel()} is false
	 */
	public Style onPanel( Style style ) {
		switch ( depth ) {
			case "truecolor" :
				return style.bg( light ? Color.rgb( 236, 241, 246 ) : Color.rgb( 26, 33, 43 ) );
			case "indexed" :
				return style.bg( Color.indexed( light ? 254 : 235 ) );
			default :
				return style;
		}
	}

	/**
	 * A colour along the line from the accent to the ok colour, which the mark's gradient uses
	 *
	 * @param t 0 for the accent, 1 for the ok colour
	 *
	 * @return The style in between where the terminal has true colour, the nearer of the two where it has less, none without colour
	 */
	public Style gradient( double t ) {
		if ( depth.equals( "truecolor" ) ) {
			int[]	a	= light ? RGB_LIGHT[ 0 ] : RGB[ 0 ];
			int[]	b	= light ? RGB_LIGHT[ 1 ] : RGB[ 1 ];
			return Style.EMPTY.fg( Color.rgb( ( int ) Math.round( a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * t ), ( int ) Math.round( a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * t ),
			    ( int ) Math.round( a[ 2 ] + ( b[ 2 ] - a[ 2 ] ) * t ) ) );
		}
		return t < 0.5 ? accent : ok;
	}

	private Style color( int i ) {
		switch ( depth ) {
			case "truecolor" :
				int[] rgb = light ? RGB_LIGHT[ i ] : RGB[ i ];
				return Style.EMPTY.fg( Color.rgb( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] ) );
			case "indexed" :
				return Style.EMPTY.fg( Color.indexed( light ? INDEXED_LIGHT[ i ] : INDEXED[ i ] ) );
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
