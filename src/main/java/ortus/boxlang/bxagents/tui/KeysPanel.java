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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

/**
 * The keyboard shortcuts as a panel in the live area: every shortcut in sections, narrowed by typing, scrolled with the arrow keys. It is
 * drawn like the message box, with a rule above and below and a bar down the left, so it looks the same in any terminal and font.
 * <p>
 * It draws nothing itself and reads no terminal: {@link ChatScreen} gives it keys and draws the rows it returns, which keeps the rules
 * testable.
 */
final class KeysPanel {

	/**
	 * The headings in the order they are listed
	 */
	static final List<String> SECTIONS = List.of( "Writing a message", "Menus", "While the agent works", "Prefixes", "Extensions", "This panel" );

	/**
	 * One line of the panel
	 *
	 * @param section The heading it is listed under
	 * @param keys    The keys, as people read them
	 * @param does    What they do
	 * @param was     What the keys were before the person changed them, empty when they were not changed
	 * @param id      The name to use for the action under {@code chat: keys:} in {@code bxAgents.yml}, empty for what cannot be changed
	 */
	record Entry( String section, String keys, String does, String was, String id ) {
	}

	/**
	 * The actions that only mean something while the agent works
	 */
	private static final Set<String>	WHILE_WORKING	= Set.of( "stop" );

	/**
	 * Every shortcut, in the order of {@link #SECTIONS}
	 */
	private final List<Entry>			entries			= new ArrayList<>();

	/**
	 * What was typed to narrow the list
	 */
	private final StringBuilder			filter			= new StringBuilder();

	/**
	 * The first body line in view
	 */
	private int							top;

	/**
	 * How many body lines were in view when the rows were last made, which PageUp and PageDown move by
	 */
	private int							page			= 8;

	/**
	 * @param table What {@link KeyMap#table()} gives: the actions as bound now, with what they were before a change, and the keys that
	 *              extensions added
	 */
	KeysPanel( List<Map<String, String>> table ) {
		Set<String> known = new HashSet<>();
		for ( KeyMap.Action a : KeyMap.Action.values() ) {
			known.add( a.id() );
		}
		for ( Map<String, String> row : table ) {
			String	id		= row.get( "id" );
			String	section	= !known.contains( id ) ? "Extensions" : WHILE_WORKING.contains( id ) ? "While the agent works" : "Writing a message";
			entries.add( new Entry( section, row.get( "keys" ), row.get( "does" ), row.getOrDefault( "was", "" ), id ) );
		}
		add( "While the agent works", "Enter", "Steer: your message is added to the run" );
		add( "Menus", "/  then Up, Down", "Move through the commands" );
		add( "Menus", "/  then Tab", "Fill the picked command" );
		add( "Menus", "/  then Enter", "Run it, or fill it in when it takes something" );
		add( "Menus", "/  then Esc", "Close the menu" );
		add( "Menus", "@  then Up, Down, Tab", "Pick a file and complete it" );
		add( "Prefixes", "/command", "Run a slash command" );
		add( "Prefixes", "@path/to/file", "Send a text file or a picture with the message" );
		add( "Prefixes", "!command, !!command", "Run a shell command on your machine (!! shows it only)" );
		add( "Prefixes", "#fn( args ), ##fn( args )", "Call one BoxLang built-in (## shows it only)" );
		add( "This panel", "F1, Ctrl+/, ?", "Open it. ? works on an empty box, the others while you type" );
		add( "This panel", "Type", "Narrow the list; Esc clears the filter, then closes" );
		add( "This panel", "Up, Down, PgUp, PgDn", "Scroll" );
		add( "This panel", "bxAgents.yml", "To change a key, list its name (the grey word) under chat: keys: in ~/.bxagents/bxAgents.yml" );
	}

	/**
	 * Add a shortcut that is not an action of the key map
	 *
	 * @param section The heading
	 * @param keys    The keys
	 * @param does    What they do
	 */
	private void add( String section, String keys, String does ) {
		entries.add( new Entry( section, keys, does, "", "" ) );
	}

	/**
	 * Take a key
	 *
	 * @param k The key
	 *
	 * @return True when the panel should close
	 */
	boolean key( KeyEvent k ) {
		if ( k.isKey( KeyCode.F1 ) || k.hasCtrl() && ( k.isChar( '/' ) || k.isChar( '_' ) ) ) {
			return true;
		}
		if ( k.isKey( KeyCode.ESCAPE ) ) {
			if ( filter.length() == 0 ) {
				return true;
			}
			filter.setLength( 0 );
			top = 0;
		} else if ( k.isKey( KeyCode.BACKSPACE ) ) {
			if ( filter.length() > 0 ) {
				filter.setLength( filter.length() - 1 );
				top = 0;
			}
		} else if ( k.isKey( KeyCode.UP ) ) {
			top = Math.max( 0, top - 1 );
		} else if ( k.isKey( KeyCode.DOWN ) ) {
			top++;
		} else if ( k.isKey( KeyCode.PAGE_UP ) ) {
			top = Math.max( 0, top - page );
		} else if ( k.isKey( KeyCode.PAGE_DOWN ) ) {
			top += page;
		} else if ( k.isKey( KeyCode.CHAR ) && !k.hasCtrl() && !k.hasAlt() ) {
			filter.append( k.string() );
			top = 0;
		}
		return false;
	}

	/**
	 * @return What was typed to narrow the list
	 */
	String filter() {
		return filter.toString();
	}

	/**
	 * @return The shortcuts that match the filter in their keys, what they do or their heading, in the order of {@link #SECTIONS}
	 */
	List<Entry> shown() {
		String		q	= filter.toString().toLowerCase( Locale.ROOT ).strip();
		List<Entry>	out	= new ArrayList<>();
		for ( String section : SECTIONS ) {
			for ( Entry e : entries ) {
				if ( e.section().equals( section ) && ( q.isEmpty() || e.keys().toLowerCase( Locale.ROOT ).contains( q )
				    || e.does().toLowerCase( Locale.ROOT ).contains( q ) || e.id().toLowerCase( Locale.ROOT ).contains( q )
				    || section.toLowerCase( Locale.ROOT ).contains( q ) ) ) {
					out.add( e );
				}
			}
		}
		return out;
	}

	/**
	 * @return How many shortcuts there are in all
	 */
	int size() {
		return entries.size();
	}

	/**
	 * The panel as rows: a rule with the title, the filter line, the shortcuts, a line with the keys of the panel, and a rule
	 *
	 * @param theme  The palette
	 * @param width  The width of the screen
	 * @param height How many rows the panel may take
	 *
	 * @return The rows, none wider than the screen
	 */
	List<Row> rows( Theme theme, int width, int height ) {
		int			keyCol	= Math.max( 12, Math.min( 30, width / 3 ) );
		List<Entry>	list	= shown();
		List<Row>	body	= new ArrayList<>();
		String		last	= null;
		for ( Entry e : list ) {
			if ( !e.section().equals( last ) ) {
				body.add( Row.of().add( e.section(), theme.bold ) );
				last = e.section();
			}
			String	keys	= e.keys().length() > keyCol ? e.keys().substring( 0, keyCol - 1 ) + "…" : e.keys();
			Row		row		= Row.of().add( "  " + keys + " ".repeat( keyCol - keys.length() ), theme.accent ).add( "  " + e.does(), theme.plain );
			if ( !e.was().isEmpty() ) {
				row.add( "  (was " + e.was() + ")", theme.warn );
			}
			if ( !e.id().isEmpty() ) {
				row.add( "  " + e.id(), theme.muted );
			}
			body.add( row );
		}
		int room = Math.max( 3, height - 4 );
		page	= room - 1;
		top		= Math.max( 0, Math.min( top, Math.max( 0, body.size() - room ) ) );
		List<Row>	out		= new ArrayList<>();
		String		title	= "Keyboard shortcuts";
		out.add(
		    Row.of().add( "── ", theme.accent ).add( title, theme.bold ).add( " " + "─".repeat( Math.max( 0, width - title.length() - 4 ) ), theme.accent ) );
		out.add( barred( theme, width, Row.of().add( "filter ", theme.muted ).add( filter + "▏", theme.selected ).add(
		    filter.length() == 0 ? "  type to narrow the list" : "  " + list.size() + " of " + entries.size(), theme.muted ) ) );
		for ( int i = 0; i < room; i++ ) {
			int at = top + i;
			out.add( barred( theme, width, at < body.size() ? body.get( at ) : Row.of() ) );
		}
		String arrows = body.size() > room ? ( top > 0 ? "↑ " : "  " ) + ( top + room < body.size() ? "↓  " : "   " ) : "";
		out.add( barred( theme, width,
		    Row.of( arrows + ( filter.length() == 0 ? "esc closes" : "esc clears the filter" ) + " · ↑↓ scroll · type to filter · F1 closes", theme.muted ) ) );
		out.add( Row.of( "─".repeat( width ), theme.accent ) );
		return out;
	}

	/**
	 * A row with the accent bar down its left side
	 *
	 * @param theme The palette
	 * @param width The width of the screen
	 * @param row   The content
	 *
	 * @return The row, cut to the width of the screen
	 */
	private static Row barred( Theme theme, int width, Row row ) {
		return Row.of().add( "▎ ", theme.accent ).addPadded( row, Math.max( 0, width - 2 ) );
	}

}
