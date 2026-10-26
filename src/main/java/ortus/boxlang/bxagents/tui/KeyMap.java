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
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import dev.tamboui.tui.event.KeyCode;
import dev.tamboui.tui.event.KeyEvent;

/**
 * Which keys do what in the chat screen, in one place: the screen asks {@code is( action, key )} and never
 * names a key itself, the help lists {@link #table()}, and a person's own file can replace the keys of an
 * action ({@link #of( Map )}).
 *
 * A key is written the way people say it: {@code enter}, {@code alt+enter}, {@code ctrl+j}, {@code esc},
 * {@code tab}, {@code up}, {@code home}, or a letter with {@code ctrl} or {@code alt}. Moving the cursor by
 * arrow, Backspace and Delete are not actions: they are what a text box is.
 *
 * A bad entry (an unknown action, a key that cannot be read, a key already used by another action in the same
 * place) is reported in {@link #problems()} and the action keeps its default keys, so one typo never leaves
 * a person without a way to send a message.
 */
public final class KeyMap {

	/** where a key is read: in the message box, or while the agent works */
	public enum Place {
		BOX, RUN
	}

	/** Everything that can be bound. The id is what a person writes in their file. */
	public enum Action {

		SUBMIT( "submit", Place.BOX, "Send the message", "enter" ),
		NEWLINE( "newline", Place.BOX, "New line in the message", "alt+enter", "shift+enter", "ctrl+j" ),
		HISTORY_PREVIOUS( "historyPrevious", Place.BOX, "Earlier message (from the first line of the box)", "up" ),
		HISTORY_NEXT( "historyNext", Place.BOX, "Later message (from the last line of the box)", "down" ),
		CLEAR( "clear", Place.BOX, "Clear the box; on an empty box, leave", "ctrl+c" ),
		EXIT( "exit", Place.BOX, "Leave on an empty box", "ctrl+d" ),
		DELETE_TO_START( "deleteToStart", Place.BOX, "Delete to the start of the line", "ctrl+u" ),
		DELETE_WORD( "deleteWord", Place.BOX, "Delete the word before the cursor", "ctrl+w" ),
		LINE_START( "lineStart", Place.BOX, "Cursor to the start of the line", "ctrl+a", "home" ),
		LINE_END( "lineEnd", Place.BOX, "Cursor to the end of the line", "ctrl+e", "end" ),
		COMPLETE( "complete", Place.BOX, "Complete the command or file name", "tab" ),
		PASTE_IMAGE( "pasteImage", Place.BOX, "Add the picture on the clipboard", "ctrl+v" ),
		STOP( "stop", Place.RUN, "Stop the agent at its next step", "esc", "ctrl+c" );

		private final String	id;
		private final Place		place;
		private final String	does;
		private final String[]	defaults;

		Action( String id, Place place, String does, String... defaults ) {
			this.id			= id;
			this.place		= place;
			this.does		= does;
			this.defaults	= defaults;
		}

		public String id() {
			return id;
		}

		public Place place() {
			return place;
		}

		public String does() {
			return does;
		}

		static Action byId( String id ) {
			for ( Action a : values() ) {
				if ( a.id.equalsIgnoreCase( id ) ) {
					return a;
				}
			}
			return null;
		}
	}

	/** one key with its modifiers */
	record Chord( KeyCode code, char letter, boolean ctrl, boolean alt, boolean shift ) {

		boolean matches( KeyEvent k ) {
			if ( ctrl != k.hasCtrl() || alt != k.hasAlt() ) {
				return false;
			}
			if ( code == KeyCode.CHAR ) {
				return k.isKey( KeyCode.CHAR ) && k.isCharIgnoreCase( letter );
			}
			return k.isKey( code ) && shift == k.hasShift();
		}

		String label() {
			StringBuilder b = new StringBuilder();
			if ( ctrl ) {
				b.append( "Ctrl+" );
			}
			if ( alt ) {
				b.append( "Alt+" );
			}
			if ( shift ) {
				b.append( "Shift+" );
			}
			b.append( code == KeyCode.CHAR ? String.valueOf( Character.toUpperCase( letter ) ) : NAMES_BY_CODE.getOrDefault( code, code.name() ) );
			return b.toString();
		}
	}

	private static final Map<String, KeyCode>	CODES_BY_NAME	= new LinkedHashMap<>();
	private static final Map<KeyCode, String>	NAMES_BY_CODE	= new LinkedHashMap<>();

	static {
		name( "enter", KeyCode.ENTER, "Enter" );
		name( "esc", KeyCode.ESCAPE, "Esc" );
		name( "escape", KeyCode.ESCAPE, "Esc" );
		name( "tab", KeyCode.TAB, "Tab" );
		name( "up", KeyCode.UP, "Up" );
		name( "down", KeyCode.DOWN, "Down" );
		name( "home", KeyCode.HOME, "Home" );
		name( "end", KeyCode.END, "End" );
	}

	private static void name( String name, KeyCode code, String label ) {
		CODES_BY_NAME.put( name, code );
		NAMES_BY_CODE.putIfAbsent( code, label );
	}

	/** An action an extension adds: it runs when its key is pressed in the message box. The id is what a person writes in their file. */
	public record Extra( String id, String does, List<String> defaults ) {
	}

	private final Map<Action, List<Chord>>	bound		= new EnumMap<>( Action.class );
	private final Map<String, List<Chord>>	extra		= new LinkedHashMap<>();
	private final Map<String, String>		extraDoes	= new LinkedHashMap<>();
	private final List<String>				problems	= new ArrayList<>();

	private KeyMap() {
	}

	/** @return the keys the screen ships with */
	public static KeyMap defaults() {
		return of( Map.of() );
	}

	/**
	 * @param overrides action id to the keys that replace its defaults, such as {@code newline -> [ "ctrl+j" ]}
	 *
	 * @return the map with the overrides that are sound applied; what was not is in {@link #problems()}
	 */
	public static KeyMap of( Map<?, ?> overrides ) {
		return of( overrides, List.of() );
	}

	/**
	 * @param overrides action id to the keys, such as {@code newline -> [ "ctrl+j" ]}
	 * @param extras    the actions extensions add, each with the keys it asks for. A key that a built-in action or an earlier
	 *                  extra already uses is refused and reported; the person can give that action another key in their file.
	 *
	 * @return the map with the overrides that are sound applied; what was not is in {@link #problems()}
	 */
	public static KeyMap of( Map<?, ?> overrides, List<Extra> extras ) {
		KeyMap map = new KeyMap();
		for ( Action a : Action.values() ) {
			List<Chord> chords = new ArrayList<>();
			for ( String spec : a.defaults ) {
				chords.add( parse( spec ) );
			}
			map.bound.put( a, chords );
		}
		for ( Extra x : extras ) {
			map.addExtra( x );
		}
		for ( Map.Entry<?, ?> e : overrides.entrySet() ) {
			String	id		= String.valueOf( e.getKey() );
			Action	action	= Action.byId( id );
			if ( action != null ) {
				map.override( action, e.getValue() );
			} else if ( map.extra.containsKey( id ) ) {
				map.overrideExtra( id, e.getValue() );
			} else {
				map.problems.add( "There is no key action [" + id + "]. The actions are: " + map.ids() );
			}
		}
		return map;
	}

	private void addExtra( Extra x ) {
		extraDoes.put( x.id(), x.does() );
		extra.put( x.id(), new ArrayList<>() );
		for ( String spec : x.defaults() ) {
			Chord c = parse( spec );
			if ( c == null ) {
				problems.add( "[" + x.id() + "]: [" + spec + "] is not a key I can read (examples: ctrl+g, alt+d, ctrl+shift+d)." );
				continue;
			}
			String clash = usedBy( c, x.id() );
			if ( clash != null ) {
				problems.add( "[" + x.id() + "]: " + c.label() + " is already used by [" + clash + "], so it was left out. Give [" + x.id()
				    + "] another key under chat: keys: in your bxAgents.yml." );
				continue;
			}
			extra.get( x.id() ).add( c );
		}
	}

	private void overrideExtra( String id, Object value ) {
		List<?>		given	= value instanceof List<?> l ? l : value == null ? List.of() : List.of( value );
		List<Chord>	chords	= new ArrayList<>();
		for ( Object o : given ) {
			Chord c = parse( String.valueOf( o ) );
			if ( c == null ) {
				problems
				    .add( "[" + id + "]: [" + o + "] is not a key I can read (examples: ctrl+g, alt+d, ctrl+shift+d). It keeps " + describeExtra( id ) + "." );
				return;
			}
			String clash = usedBy( c, id );
			if ( clash != null ) {
				problems.add( "[" + id + "]: " + c.label() + " is already used by [" + clash + "]; [" + id + "] keeps " + describeExtra( id ) + "." );
				return;
			}
			chords.add( c );
		}
		extra.put( id, chords );
	}

	/** @return the id of the action that uses the key in the message box, other than {@code except}; null when it is free */
	private String usedBy( Chord c, String except ) {
		for ( Map.Entry<Action, List<Chord>> other : bound.entrySet() ) {
			if ( other.getKey().place == Place.BOX && other.getValue().contains( c ) ) {
				return other.getKey().id;
			}
		}
		for ( Map.Entry<String, List<Chord>> other : extra.entrySet() ) {
			if ( !other.getKey().equals( except ) && other.getValue().contains( c ) ) {
				return other.getKey();
			}
		}
		return null;
	}

	private String describeExtra( String id ) {
		List<String> labels = new ArrayList<>();
		for ( Chord c : extra.getOrDefault( id, List.of() ) ) {
			labels.add( c.label() );
		}
		return labels.isEmpty() ? "no key" : String.join( ", ", labels );
	}

	/** @return the id of the extension action the key event presses, or null when it is not one */
	public String extension( KeyEvent k ) {
		for ( Map.Entry<String, List<Chord>> e : extra.entrySet() ) {
			for ( Chord c : e.getValue() ) {
				if ( c.matches( k ) ) {
					return e.getKey();
				}
			}
		}
		return null;
	}

	private void override( Action action, Object value ) {
		List<?> given = value instanceof List<?> l ? l : value == null ? List.of() : List.of( value );
		if ( given.isEmpty() ) {
			problems.add( "[" + action.id + "] needs at least one key; it keeps " + describe( action ) + "." );
			return;
		}
		List<Chord> chords = new ArrayList<>();
		for ( Object o : given ) {
			Chord c = parse( String.valueOf( o ) );
			if ( c == null ) {
				problems.add( "[" + action.id + "]: [" + o + "] is not a key I can read (examples: enter, alt+enter, ctrl+j, esc, tab). It keeps "
				    + describe( action ) + "." );
				return;
			}
			chords.add( c );
		}
		for ( Chord c : chords ) {
			for ( Map.Entry<Action, List<Chord>> other : bound.entrySet() ) {
				if ( other.getKey() != action && other.getKey().place == action.place && other.getValue().contains( c ) ) {
					problems.add( "[" + action.id + "]: " + c.label() + " is already used by [" + other.getKey().id + "]; [" + action.id + "] keeps "
					    + describe( action ) + "." );
					return;
				}
			}
		}
		if ( action.place == Place.BOX ) {
			for ( Chord c : chords ) {
				for ( Map.Entry<String, List<Chord>> other : extra.entrySet() ) {
					if ( other.getValue().contains( c ) ) {
						problems.add( "[" + action.id + "]: " + c.label() + " is already used by [" + other.getKey() + "]; [" + action.id + "] keeps "
						    + describe( action ) + "." );
						return;
					}
				}
			}
		}
		bound.put( action, chords );
	}

	/** @return true when the key event is one of the keys of the action */
	public boolean is( Action action, KeyEvent k ) {
		for ( Chord c : bound.get( action ) ) {
			if ( c.matches( k ) ) {
				return true;
			}
		}
		return false;
	}

	/** @return the keys of the action as people read them, such as {@code Alt+Enter, Shift+Enter, Ctrl+J} */
	public String describe( Action action ) {
		List<String> labels = new ArrayList<>();
		for ( Chord c : bound.get( action ) ) {
			labels.add( c.label() );
		}
		return String.join( ", ", labels );
	}

	/** @return the first key of the action as people read it, for a hint line */
	public String first( Action action ) {
		return bound.get( action ).get( 0 ).label();
	}

	/** @return what is wrong with the overrides, as sentences; empty when they were all applied */
	public List<String> problems() {
		return List.copyOf( problems );
	}

	/**
	 * @return a row per action for a help screen: id, keys, what it does, and where ({@code box} or {@code run})
	 */
	public List<Map<String, String>> table() {
		List<Map<String, String>> rows = new ArrayList<>();
		for ( Action a : Action.values() ) {
			Map<String, String> row = new LinkedHashMap<>();
			row.put( "id", a.id );
			row.put( "keys", describe( a ) );
			row.put( "does", a.does );
			row.put( "place", a.place.name().toLowerCase( Locale.ROOT ) );
			rows.add( row );
		}
		for ( String id : extra.keySet() ) {
			Map<String, String> row = new LinkedHashMap<>();
			row.put( "id", id );
			row.put( "keys", describeExtra( id ) );
			row.put( "does", extraDoes.get( id ) );
			row.put( "place", "box" );
			rows.add( row );
		}
		return rows;
	}

	String ids() {
		List<String> ids = new ArrayList<>();
		for ( Action a : Action.values() ) {
			ids.add( a.id );
		}
		ids.addAll( extra.keySet() );
		return String.join( ", ", ids );
	}

	/** @return the key written as {@code ctrl+alt+x} or {@code enter}, or null when it cannot be read */
	static Chord parse( String spec ) {
		if ( spec == null ) {
			return null;
		}
		boolean		ctrl	= false;
		boolean		alt		= false;
		boolean		shift	= false;
		String[]	parts	= spec.strip().toLowerCase( Locale.ROOT ).split( "\\+", -1 );
		for ( int i = 0; i < parts.length - 1; i++ ) {
			switch ( parts[ i ] ) {
				case "ctrl", "control" -> ctrl = true;
				case "alt", "option", "meta" -> alt = true;
				case "shift" -> shift = true;
				default -> {
					return null;
				}
			}
		}
		String	last	= parts[ parts.length - 1 ];
		KeyCode	code	= CODES_BY_NAME.get( last );
		if ( code != null ) {
			return new Chord( code, '\0', ctrl, alt, shift );
		}
		// a letter on its own is typing, not a binding; with ctrl or alt it is
		if ( last.length() == 1 && Character.isLetterOrDigit( last.charAt( 0 ) ) && ( ctrl || alt ) ) {
			return new Chord( KeyCode.CHAR, last.charAt( 0 ), ctrl, alt, false );
		}
		return null;
	}
}
