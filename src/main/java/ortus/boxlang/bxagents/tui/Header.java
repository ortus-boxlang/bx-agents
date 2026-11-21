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

/**
 * The full heading of the chat: the project's mark with, beside it, the name and who the agent is, the version, the model, what the agent
 * has loaded, and the keys. It builds rows and prints nothing, so its shape can be tested without a terminal; {@link ChatScreen} prints them.
 */
final class Header {

	/**
	 * Columns between the mark and the text beside it
	 */
	static final int			GAP			= 3;

	/**
	 * The least width the text beside the mark may have before the heading gives way to the one line version
	 */
	static final int			MIN_TEXT	= 46;

	/**
	 * The least number of terminal rows the full heading wants: the mark, and room left for the box and some conversation
	 */
	static final int			EXTRA_ROWS	= 8;

	/**
	 * The label column: the longest label and a space
	 */
	private static final int	LABEL		= 12;

	/**
	 * What the heading says
	 *
	 * @param agent      The agent's name
	 * @param version    The module's version, empty for none
	 * @param model      The model in use
	 * @param mode       How the chat reaches the agent
	 * @param hints      The lines of keys, each on its own row
	 * @param skills     The names of the skills the agent can load
	 * @param extensions The names of the extensions that loaded
	 * @param failed     The names of the extensions that did not load
	 */
	record Facts( String agent, String version, String model, String mode, List<String> hints, List<String> skills, List<String> extensions,
	    List<String> failed ) {
	}

	/**
	 * Nothing to create: the methods are static
	 */
	private Header() {
	}

	/**
	 * @param columns How wide the terminal is
	 * @param rows    How tall the terminal is
	 *
	 * @return True when the terminal has room for the mark with text beside it
	 */
	static boolean fits( int columns, int rows ) {
		return columns >= 2 + Logo.width() + GAP + MIN_TEXT && rows >= Logo.height() + EXTRA_ROWS;
	}

	/**
	 * The heading
	 *
	 * @param theme   The palette
	 * @param facts   What it says
	 * @param columns How wide the terminal is
	 *
	 * @return One row per line, the mark's rows with the text beside them, between a blank row above and one below
	 */
	static List<Row> rows( Theme theme, Facts facts, int columns ) {
		int			room	= Math.max( MIN_TEXT, columns - 2 - Logo.width() - GAP );
		List<Row>	text	= text( theme, facts, room );
		List<Row>	mark	= Logo.rows( theme );
		List<Row>	rows	= new ArrayList<>();
		rows.add( Row.of() );
		for ( int y = 0; y < mark.size(); y++ ) {
			Row row = Row.of( "  ", theme.plain ).addPadded( mark.get( y ), Logo.width() ).add( " ".repeat( GAP ), theme.plain );
			if ( y < text.size() ) {
				row.addPadded( text.get( y ), text.get( y ).width() );
			}
			rows.add( row );
		}
		rows.add( Row.of() );
		return rows;
	}

	/**
	 * The text that goes beside the mark, one entry for each row of the mark: the name, the facts, what is loaded, and the keys. A blank
	 * entry is an empty row.
	 *
	 * @param theme The palette
	 * @param facts What it says
	 * @param room  How many columns the text may take
	 *
	 * @return At most as many rows as the mark has
	 */
	static List<Row> text( Theme theme, Facts facts, int room ) {
		List<Row> text = new ArrayList<>();
		text.add( Row.of() );
		text.add( Row.of() );
		text.add( Row.of() );
		text.add( title( theme, facts, room ) );
		text.add( Row.of() );
		text.add(
		    Row.of( cut( ( facts.version().isEmpty() ? "" : "v" + facts.version() + " · " ) + facts.model() + " · " + facts.mode(), room ), theme.muted ) );
		text.add( Row.of() );
		if ( !facts.skills().isEmpty() ) {
			text.add( loaded( theme, "skills", facts.skills(), List.of(), room ) );
		}
		if ( !facts.extensions().isEmpty() || !facts.failed().isEmpty() ) {
			text.add( loaded( theme, "extensions", facts.extensions(), facts.failed(), room ) );
		}
		text.add( Row.of() );
		for ( String hint : facts.hints() ) {
			text.add( Row.of( cut( hint, room ), theme.muted ) );
		}
		return text.size() > Logo.height() ? new ArrayList<>( text.subList( 0, Logo.height() ) ) : text;
	}

	/**
	 * The name of the project, then the agent's name, which is cut with an ellipsis when it does not fit
	 */
	private static Row title( Theme theme, Facts facts, int room ) {
		String	name	= "B X A G E N T S";
		String	rest	= "  ·  ";
		int		left	= room - name.length() - rest.length();
		Row		row		= Row.of( name, theme.accentBold );
		if ( left > 1 && !facts.agent().isEmpty() ) {
			row.add( rest, theme.muted ).add( cut( facts.agent(), left ), theme.bold );
		}
		return row;
	}

	/**
	 * One line of what is loaded: the label, then the names in the order given as many as fit, then how many more there are. Names that did
	 * not load come last, in the warning colour.
	 *
	 * @param theme  The palette
	 * @param label  skills or extensions
	 * @param names  What loaded
	 * @param failed What did not
	 * @param room   How many columns the line may take
	 *
	 * @return The row
	 */
	static Row loaded( Theme theme, String label, List<String> names, List<String> failed, int room ) {
		Row				row	= Row.of( ( label + " ".repeat( LABEL ) ).substring( 0, LABEL ), theme.muted );
		List<String>	all	= new ArrayList<>( names );
		for ( String f : failed ) {
			all.add( f + " (failed)" );
		}
		int	budget	= room - LABEL;
		int	used	= 0;
		int	shown	= 0;
		for ( int i = 0; i < all.size(); i++ ) {
			String	name	= all.get( i );
			int		more	= all.size() - shown - 1;
			String	tail	= more > 0 ? "  +" + more + " more" : "";
			int		need	= ( shown == 0 ? 0 : 2 ) + name.length();
			// a name that would crowd out the "+N more" is left for the count
			if ( shown > 0 && used + need + tail.length() > budget ) {
				break;
			}
			if ( shown == 0 && need > budget ) {
				row.add( cut( name, budget ), theme.plain );
				return row;
			}
			if ( shown > 0 ) {
				row.add( ", ", theme.muted );
			}
			row.add( name, i >= names.size() ? theme.warn : theme.plain );
			used += need;
			shown++;
		}
		if ( shown < all.size() ) {
			row.add( "  +" + ( all.size() - shown ) + " more", theme.muted );
		}
		return row;
	}

	/**
	 * @param text What to fit
	 * @param max  How many columns it may take
	 *
	 * @return The text, or its start with an ellipsis when it is longer than that
	 */
	static String cut( String text, int max ) {
		if ( max <= 0 ) {
			return "";
		}
		return text.length() <= max ? text : text.substring( 0, Math.max( 0, max - 1 ) ) + "…";
	}

}
