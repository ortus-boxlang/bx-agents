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
import java.util.Map;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

/**
 * The state of the full-screen log viewer (`bxAgents logs --ui`), without a terminal: the open log, the level and the
 * search, the lines and where the view is scrolled. {@link #key(KeyEvent)} changes it and {@link #render(int, int)}
 * draws it as rows, so it is tested like the prompts. {@link LogScreen} puts it on the screen; BoxLang reads the logs and
 * hands the lines in.
 *
 * Keys: Left and Right (or Tab) change the log, l the level, / searches (Enter keeps it, Esc drops it), Up, Down, Page
 * Up, Page Down and Home scroll, End goes back to the newest lines and follows them, q or Esc leaves.
 */
public final class LogView {

	/** The level filters, least to most strict: blank shows all */
	static final String[]			LEVELS		= { "", "warn", "error" };

	private final Theme				theme;
	private final List<String>		areas;
	private final List<Map<?, ?>>	lines		= new ArrayList<>();
	private int						area;
	private int						level;
	private String					query		= "";
	private final StringBuilder		typing		= new StringBuilder();
	private boolean					searching;
	/** how many lines the view is above the newest; 0 follows the end */
	private int						scroll;
	private int						pageRows	= 20;
	private boolean					changed;
	private boolean					done;
	private String					status		= "";

	/**
	 * @param theme the palette
	 * @param areas the logs, in the order of the tabs
	 * @param open  the log to open first; the first one when blank or unknown
	 */
	public LogView( Theme theme, List<?> areas, String open ) {
		this.theme	= theme;
		this.areas	= new ArrayList<>();
		for ( Object a : areas ) {
			this.areas.add( String.valueOf( a ) );
		}
		this.area = Math.max( 0, this.areas.indexOf( open == null ? "" : open ) );
	}

	/** @return the open log */
	public String area() {
		return areas.isEmpty() ? "" : areas.get( area );
	}

	/** @return the level filter: blank, warn or error */
	public String level() {
		return LEVELS[ level ];
	}

	/** @return the search kept with Enter */
	public String query() {
		return query;
	}

	/** @return true once the person asked to leave */
	public boolean isDone() {
		return done;
	}

	/** @return true when the log, the level or the search changed since the last call, so the lines must be read again */
	public boolean takeChange() {
		boolean was = changed;
		changed = false;
		return was;
	}

	/** @param text a short note shown in the header, such as "live" or why the log could not be read */
	public void status( String text ) {
		this.status = text == null ? "" : text;
	}

	/**
	 * Shows these lines instead of the ones shown, at the end.
	 *
	 * @param fresh maps with time, level, subject and message, oldest first
	 */
	public void setLines( List<?> fresh ) {
		lines.clear();
		addAll( fresh );
		scroll = 0;
	}

	/**
	 * Adds new lines after the shown ones and keeps the last `cap`. A view scrolled up stays on the same lines.
	 *
	 * @param added maps with time, level, subject and message, oldest first
	 * @param cap   how many lines to keep at most
	 */
	public void append( List<?> added, int cap ) {
		int before = lines.size();
		addAll( added );
		int grew = lines.size() - before;
		while ( lines.size() > Math.max( 1, cap ) ) {
			lines.remove( 0 );
		}
		if ( scroll > 0 ) {
			scroll = Math.min( scroll + grew, maxScroll() );
		}
	}

	/** @return how many lines are held */
	public int size() {
		return lines.size();
	}

	private void addAll( List<?> more ) {
		if ( more == null ) {
			return;
		}
		for ( Object o : more ) {
			if ( o instanceof Map<?, ?> m ) {
				lines.add( m );
			}
		}
	}

	private int maxScroll() {
		return Math.max( 0, lines.size() - pageRows );
	}

	/**
	 * @param key a key the person pressed
	 */
	public void key( KeyEvent key ) {
		if ( searching ) {
			searchKey( key );
			return;
		}
		if ( key.hasCtrl() && key.isChar( 'c' ) || key.isKey( KeyCode.ESCAPE ) || key.isChar( 'q' ) ) {
			done = true;
		} else if ( key.isKey( KeyCode.RIGHT ) || key.isKey( KeyCode.TAB ) ) {
			openArea( area + 1 );
		} else if ( key.isKey( KeyCode.LEFT ) ) {
			openArea( area - 1 );
		} else if ( key.isChar( 'l' ) ) {
			level	= ( level + 1 ) % LEVELS.length;
			changed	= true;
		} else if ( key.isChar( '/' ) ) {
			searching = true;
			typing.setLength( 0 );
			typing.append( query );
		} else if ( key.isKey( KeyCode.UP ) || key.isChar( 'k' ) ) {
			scroll = Math.min( scroll + 1, maxScroll() );
		} else if ( key.isKey( KeyCode.DOWN ) || key.isChar( 'j' ) ) {
			scroll = Math.max( 0, scroll - 1 );
		} else if ( key.isKey( KeyCode.PAGE_UP ) ) {
			scroll = Math.min( scroll + pageRows, maxScroll() );
		} else if ( key.isKey( KeyCode.PAGE_DOWN ) ) {
			scroll = Math.max( 0, scroll - pageRows );
		} else if ( key.isKey( KeyCode.HOME ) ) {
			scroll = maxScroll();
		} else if ( key.isKey( KeyCode.END ) ) {
			scroll = 0;
		}
	}

	private void searchKey( KeyEvent key ) {
		if ( key.isKey( KeyCode.ENTER ) ) {
			searching	= false;
			changed		= !query.equals( typing.toString().trim() ) || changed;
			query		= typing.toString().trim();
		} else if ( key.isKey( KeyCode.ESCAPE ) || key.hasCtrl() && key.isChar( 'c' ) ) {
			searching = false;
		} else if ( key.isKey( KeyCode.BACKSPACE ) ) {
			if ( typing.length() > 0 ) {
				typing.setLength( typing.length() - 1 );
			}
		} else if ( key.isKey( KeyCode.CHAR ) && !key.hasCtrl() && !key.hasAlt() ) {
			typing.append( key.string() );
		}
	}

	private void openArea( int to ) {
		if ( areas.isEmpty() ) {
			return;
		}
		area	= ( to + areas.size() ) % areas.size();
		changed	= true;
	}

	/**
	 * Draws the viewer: a header, the tabs, the filters, the lines that fit, and the keys.
	 *
	 * @param width  cells across
	 * @param height rows down
	 *
	 * @return one row per screen line, top first
	 */
	public List<Row> render( int width, int height ) {
		List<Row>	out		= new ArrayList<>();
		Row			head	= Row.of().add( " bxAgents logs", theme.accentBold );
		String		state	= scroll > 0 ? "paused, " + scroll + " newer below (End to follow)" : status;
		if ( !state.isEmpty() ) {
			head.add( "  " + state, theme.muted );
		}
		out.add( head );

		Row tabs = Row.of( " ", theme.plain );
		for ( int i = 0; i < areas.size(); i++ ) {
			tabs.add( i == area ? "[" + areas.get( i ) + "]" : " " + areas.get( i ) + " ", i == area ? theme.selected : theme.muted ).add( " ", theme.plain );
		}
		out.add( tabs );

		Row filters = Row.of( " level ", theme.muted ).add( level().isEmpty() ? "all" : level() + " and above", theme.plain );
		if ( searching ) {
			filters.add( "   search ", theme.muted ).add( typing + "_", theme.accent );
		} else if ( !query.isEmpty() ) {
			filters.add( "   search ", theme.muted ).add( query, theme.plain );
		}
		out.add( filters );
		out.add( Row.of( "", theme.plain ) );

		int room = Math.max( 1, height - out.size() - 1 );
		pageRows	= room;
		scroll		= Math.min( scroll, maxScroll() );
		int	end		= lines.size() - scroll;
		int	start	= Math.max( 0, end - room );
		if ( lines.isEmpty() ) {
			out.add( Row.of( " Nothing logged here yet" + ( level > 0 || !query.isEmpty() ? " that matches." : "." ), theme.muted ) );
		}
		for ( int i = start; i < end; i++ ) {
			out.add( line( lines.get( i ) ) );
		}
		while ( out.size() < height - 1 ) {
			out.add( Row.of( "", theme.plain ) );
		}
		out.add( Row.of( searching ? " type to search   enter keep   esc drop" : " ←/→ log   l level   / search   ↑/↓ pgup/pgdn home end scroll   q quit",
		    theme.muted ) );
		return out;
	}

	private Row line( Map<?, ?> l ) {
		String	time	= String.valueOf( l.get( "time" ) == null ? "" : l.get( "time" ) );
		String	lvl		= String.valueOf( l.get( "level" ) == null ? "info" : l.get( "level" ) );
		String	subject	= String.valueOf( l.get( "subject" ) == null ? "" : l.get( "subject" ) );
		String	message	= String.valueOf( l.get( "message" ) == null ? "" : l.get( "message" ) );
		Row		row		= Row.of( " " + ( time.length() >= 19 ? time.substring( 11, 19 ) : pad( time, 8 ) ) + " ", theme.muted );
		row.add( pad( lvl.toUpperCase(), 5 ), "error".equals( lvl ) ? theme.error : "warn".equals( lvl ) ? theme.warn : theme.muted );
		if ( !subject.isEmpty() ) {
			row.add( "  [" + subject + "]", theme.muted );
		}
		return row.add( "  " + message, theme.plain );
	}

	private static String pad( String s, int n ) {
		return s.length() >= n ? s : s + " ".repeat( n - s.length() );
	}

}
