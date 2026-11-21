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
import java.util.Locale;
import java.util.Map;

/**
 * The menu of slash commands under the message box: which commands match what was typed, in what order, which one is picked and which are in
 * view. It draws nothing and reads no keys, so the rules can be tested without a terminal; {@link ChatScreen} owns the keys and the drawing.
 * <p>
 * Typing {@code /} alone lists every command, grouped. Typing more narrows the list: names that start with it come first, then names that
 * contain it, then, from three characters on, commands whose description contains it.
 */
final class SlashMenu {

	/**
	 * How many commands are in view at once. The list scrolls when there are more.
	 */
	static final int					WINDOW		= 8;

	/**
	 * How many commands are in view in this menu: {@link #WINDOW} unless {@link #setWindow} says otherwise
	 */
	private int							window		= WINDOW;

	/**
	 * How many characters must be typed before the descriptions are searched too: one or two letters would match nearly every sentence
	 */
	private static final int			HINT_MATCH	= 3;

	/**
	 * The headings in the order they are listed. Any other heading, such as an extension's name, follows in the order it appears.
	 */
	private static final List<String>	GROUPS		= List.of( "Conversation", "Agent", "Model", "Screen", "Memory" );

	/**
	 * One command as the menu shows it
	 *
	 * @param name        The name with its slash, such as {@code /resume}
	 * @param usage       What follows the name, such as {@code [n|id]}, empty when nothing does
	 * @param description What the command does, in a few words
	 * @param group       The heading it is listed under
	 */
	record Item( String name, String usage, String description, String group ) {

		/**
		 * @return True when the command needs nothing after its name, so choosing it from the menu can run it at once
		 */
		boolean runsAtOnce() {
			return usage.isEmpty();
		}

		/**
		 * @return The text the message box holds once the command is taken from the menu: the name, and a space when something may follow
		 */
		String fill() {
			return runsAtOnce() ? name : name + " ";
		}
	}

	/**
	 * Every command, grouped, in the order the menu lists them when nothing is typed
	 */
	private final List<Item>	all;

	/**
	 * The commands that match what is typed, best first
	 */
	private List<Item>			matches	= List.of();

	/**
	 * What was typed when the matches were worked out, so they are worked out again only when it changes
	 */
	private String				typed	= null;

	/**
	 * Which of the matches is picked
	 */
	private int					pick;

	/**
	 * The first of the matches in view
	 */
	private int					top;

	/**
	 * Whether Esc closed the menu for what is typed now. Typing something else opens it again.
	 */
	private boolean				dismissed;

	/**
	 * @param commands Maps with {@code name}, {@code hint}, and optionally {@code usage}, {@code group} and {@code extension}, as the
	 *                 command registry returns them for the terminal
	 */
	SlashMenu( List<Map<?, ?>> commands ) {
		this.all = grouped( commands );
	}

	/**
	 * The description of a command: the part of its hint before the first colon, since after the colon the hint gives examples that the usage
	 * already covers.
	 *
	 * @param hint The one line hint of a command
	 *
	 * @return The description, in a few words
	 */
	static String description( String hint ) {
		int colon = hint.indexOf( ": " );
		return ( colon > 0 ? hint.substring( 0, colon ) : hint ).strip();
	}

	/**
	 * Turn the registry's maps into items, listed by group
	 *
	 * @param commands Maps with {@code name}, {@code hint}, and optionally {@code usage} and {@code group}
	 *
	 * @return The items, the known groups first in their set order, then any other group in the order it first appears, and within a group
	 *         in the order the commands were given
	 */
	private static List<Item> grouped( List<Map<?, ?>> commands ) {
		List<String>	order	= new ArrayList<>( GROUPS );
		List<Item>		items	= new ArrayList<>();
		for ( Map<?, ?> c : commands ) {
			String group = text( c, "group", "Other" );
			if ( !order.contains( group ) ) {
				order.add( group );
			}
			items.add( new Item( text( c, "name", "" ), text( c, "usage", "" ), description( text( c, "hint", "" ) ), group ) );
		}
		// "Other" is listed last, whatever else was added
		if ( order.remove( "Other" ) ) {
			order.add( "Other" );
		}
		List<Item> sorted = new ArrayList<>();
		for ( String group : order ) {
			for ( Item item : items ) {
				if ( item.group().equals( group ) ) {
					sorted.add( item );
				}
			}
		}
		return List.copyOf( sorted );
	}

	/**
	 * A text field of a map
	 *
	 * @param map      The map
	 * @param key      The key
	 * @param fallback What to return when the key is missing or null
	 *
	 * @return The value as text
	 */
	private static String text( Map<?, ?> map, String key, String fallback ) {
		Object value = map.get( key );
		return value == null ? fallback : String.valueOf( value );
	}

	/**
	 * Take what is in the message box. The matches are worked out again only when it changed, and the pick goes back to the first match when
	 * it did.
	 *
	 * @param text     What the message box holds
	 * @param rowCount How many lines the message box has: the menu is only for a single line
	 */
	void sync( String text, int rowCount ) {
		String now = rowCount == 1 && text.startsWith( "/" ) && !text.contains( " " ) ? text : null;
		if ( java.util.Objects.equals( now, typed ) ) {
			return;
		}
		typed		= now;
		dismissed	= false;
		pick		= 0;
		top			= 0;
		matches		= now == null ? List.of() : rank( now.substring( 1 ).toLowerCase( Locale.ROOT ) );
	}

	/**
	 * The commands that match a query, best first
	 *
	 * @param query What was typed after the slash, in lower case
	 *
	 * @return All the commands for an empty query. Otherwise the names that start with it, then those that contain it, then those whose
	 *         description contains it, each in listing order.
	 */
	private List<Item> rank( String query ) {
		if ( query.isEmpty() ) {
			return all;
		}
		List<Item>	starts	= new ArrayList<>();
		List<Item>	inName	= new ArrayList<>();
		List<Item>	inHint	= new ArrayList<>();
		for ( Item item : all ) {
			String name = item.name().substring( 1 ).toLowerCase( Locale.ROOT );
			if ( name.startsWith( query ) ) {
				starts.add( item );
			} else if ( name.contains( query ) ) {
				inName.add( item );
			} else if ( query.length() >= HINT_MATCH && item.description().toLowerCase( Locale.ROOT ).contains( query ) ) {
				inHint.add( item );
			}
		}
		List<Item> ranked = new ArrayList<>( starts );
		ranked.addAll( inName );
		ranked.addAll( inHint );
		return ranked;
	}

	/**
	 * @return True when the menu is showing: something matches and Esc has not closed it
	 */
	boolean isOpen() {
		return !dismissed && !matches.isEmpty();
	}

	/**
	 * Close the menu until something else is typed
	 */
	void dismiss() {
		dismissed = true;
	}

	/**
	 * Move the pick, wrapping at both ends, and scroll to keep it in view
	 *
	 * @param delta 1 for down, -1 for up
	 */
	void move( int delta ) {
		if ( matches.isEmpty() ) {
			return;
		}
		pick = Math.floorMod( pick + delta, matches.size() );
		if ( pick < top ) {
			top = pick;
		} else if ( pick >= top + window ) {
			top = pick - window + 1;
		}
	}

	/**
	 * @param rows How many commands to show at once
	 */
	void setWindow( int rows ) {
		this.window	= Math.max( 1, rows );
		this.top	= Math.max( 0, Math.min( top, Math.max( 0, matches.size() - window ) ) );
	}

	/**
	 * @return The command that is picked, or null when nothing matches
	 */
	Item picked() {
		return matches.isEmpty() ? null : matches.get( pick );
	}

	/**
	 * @return The commands in view, from the first one that is not scrolled past
	 */
	List<Item> window() {
		return matches.subList( top, Math.min( matches.size(), top + window ) );
	}

	/**
	 * @return Where the picked command is within the window
	 */
	int pickInWindow() {
		return pick - top;
	}

	/**
	 * @return Where the picked command is among all the matches, counting from 1
	 */
	int position() {
		return pick + 1;
	}

	/**
	 * @return How many commands match
	 */
	int size() {
		return matches.size();
	}

	/**
	 * @return True when nothing was typed after the slash, so the list is every command under its group heading
	 */
	boolean isGrouped() {
		return "/".equals( typed );
	}

}
