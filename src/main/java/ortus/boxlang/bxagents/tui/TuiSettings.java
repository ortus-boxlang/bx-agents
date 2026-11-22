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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The settings of the terminal chat's look and behaviour, in one registry. Each setting says its name, what it may be, what it is when nothing
 * says otherwise, and what it does, and everything else is made from that: the checks on every file that can hold a setting, the
 * {@code /settings} panel and the documentation table. A new setting is one more line in {@link #ALL}.
 * <p>
 * The same {@code tui:} block, with the same names, can be written in four places. The first of them that has a value for a setting wins,
 * from the highest: the flag of one run, the agent's own file in its data home, the person's file for all agents, and the project's
 * {@code Agent.yml}. When none has a value the default of the registry is used. {@link #resolve} does that and remembers where each value
 * came from.
 * <p>
 * The {@code prompt} and {@code widgets} of the same block are the message box's look, which {@code PromptLook} owns.
 */
public final class TuiSettings {

	/**
	 * The kinds of value a setting can have
	 */
	public enum Kind {

		/**
		 * {@code true} or {@code false}
		 */
		BOOL,

		/**
		 * One of a fixed list of words
		 */
		CHOICE,

		/**
		 * A whole number between a minimum and a maximum
		 */
		INT
	}

	/**
	 * One setting
	 *
	 * @param name    The name under {@code tui:}
	 * @param kind    What kind of value it takes
	 * @param choices For a {@link Kind#CHOICE}, the words, the default first; for the others empty
	 * @param def     The default, as the text a file would hold
	 * @param min     For an {@link Kind#INT}, the least it may be
	 * @param max     For an {@link Kind#INT}, the most it may be
	 * @param does    What it does, in a sentence
	 */
	public record Setting( String name, Kind kind, List<String> choices, String def, int min, int max, String does ) {

		/**
		 * @return The values the setting may have, as the text a file would hold: {@code true} and {@code false}, the words, or the range
		 */
		public String allowed() {
			return switch ( kind ) {
				case BOOL -> "true, false";
				case CHOICE -> String.join( ", ", choices );
				case INT -> min + " to " + max;
			};
		}
	}

	/**
	 * Every setting, in the order the panel and the documentation list them
	 */
	public static final List<Setting>	ALL		= List.of(
	    choice( "fullscreen", List.of( "true", "false" ), "true",
	        "Clear the screen when the chat opens and keep the message box at the bottom. false keeps the box right under the last line" ),
	    choice( "header", List.of( "full", "compact", "hidden" ), "full",
	        "What is printed when the chat opens: the icon with the agent, what it loaded and the hints, one line, or nothing" ),
	    choice( "spacing", List.of( "normal", "compact" ), "normal", "A blank line between the turns of the conversation, or none" ),
	    choice( "theme", List.of( "auto", "dark", "light" ), "auto", "The colours: for a dark or a light terminal, or by what the terminal says it supports" ),
	    choice( "animations", List.of( "true", "false" ), "true", "The spinner and the other motion while the agent works. false shows a still marker" ),
	    choice( "thinking", List.of( "show", "hide" ), "show", "Show the model's thinking while it works, or only that it is working" ),
	    choice( "tools", List.of( "detail", "summary", "hidden" ), "detail",
	        "Tool calls with their arguments and time, with only the name and result, or not at all" ),
	    choice( "markdown", List.of( "rendered", "source" ), "rendered",
	        "Answers drawn with headings, lists, tables and coloured code, or as the text the model wrote" ),
	    number( "menuRows", 8, 3, 20, "How many commands or files the / and @ menus show at once" ),
	    choice( "notify", List.of( "off", "bell", "system" ), "off",
	        "Tell you when a long answer is done: nothing, the terminal bell, or a desktop notification" ),
	    choice( "terminalTitle", List.of( "true", "false" ), "true", "Put the agent's name in the terminal's title while the chat is open" ) );

	/**
	 * The name of the layer for an agent's own settings file, which the panel and {@code /settings} write by default
	 */
	public static final String			AGENT	= "this agent";

	/**
	 * The name of the layer for the person's file for every agent
	 */
	public static final String			USER	= "your file";

	/**
	 * The names of the {@code tui:} block that the message box's look owns, and so are not settings of this registry
	 */
	public static final List<String>	LOOK	= List.of( "prompt", "widgets" );

	/**
	 * Nothing to create: the methods are static
	 */
	private TuiSettings() {
	}

	/**
	 * A setting of a few words, the first of the list being the default unless another is given
	 *
	 * @param name    The name
	 * @param choices The words
	 * @param def     The default
	 * @param does    What it does
	 *
	 * @return The setting, a true or false one when the words are {@code true} and {@code false}
	 */
	private static Setting choice( String name, List<String> choices, String def, String does ) {
		boolean bool = choices.equals( List.of( "true", "false" ) );
		return new Setting( name, bool ? Kind.BOOL : Kind.CHOICE, bool ? List.of() : choices, def, 0, 0, does );
	}

	/**
	 * A whole number setting
	 *
	 * @param name The name
	 * @param def  The default
	 * @param min  The least it may be
	 * @param max  The most it may be
	 * @param does What it does
	 *
	 * @return The setting
	 */
	private static Setting number( String name, int def, int min, int max, String does ) {
		return new Setting( name, Kind.INT, List.of(), String.valueOf( def ), min, max, does );
	}

	/**
	 * @param name A name, in any case
	 *
	 * @return The setting of that name, or null
	 */
	public static Setting find( String name ) {
		for ( Setting s : ALL ) {
			if ( s.name().equalsIgnoreCase( name == null ? "" : name.strip() ) ) {
				return s;
			}
		}
		return null;
	}

	/**
	 * A value as the setting wants it written
	 *
	 * @param setting The setting
	 * @param raw     What a file or a flag holds: text, a boolean or a number
	 *
	 * @return The value in its canonical text ({@code true}, a word in lower case, or a number), or null when it is not one the setting takes
	 */
	public static String normalize( Setting setting, Object raw ) {
		if ( raw == null ) {
			return null;
		}
		String text = String.valueOf( raw ).strip().toLowerCase( Locale.ROOT );
		switch ( setting.kind() ) {
			case BOOL :
				if ( List.of( "true", "yes", "on" ).contains( text ) ) {
					return "true";
				}
				return List.of( "false", "no", "off" ).contains( text ) ? "false" : null;
			case CHOICE :
				return setting.choices().contains( text ) ? text : null;
			default :
				try {
					int n = Integer.parseInt( text );
					return n >= setting.min() && n <= setting.max() ? String.valueOf( n ) : null;
				} catch ( NumberFormatException e ) {
					return null;
				}
		}
	}

	/**
	 * What is wrong with a {@code tui:} block, apart from the message box's look
	 *
	 * @param tui   The block as read from a file
	 * @param label How to name the file in a message, such as {@code Agent.yml}
	 *
	 * @return One sentence per problem; empty when the settings are fine
	 */
	public static List<String> problems( Map<?, ?> tui, String label ) {
		List<String> out = new ArrayList<>();
		for ( Map.Entry<?, ?> e : tui.entrySet() ) {
			String key = String.valueOf( e.getKey() );
			if ( LOOK.contains( key.toLowerCase( Locale.ROOT ) ) ) {
				continue;
			}
			Setting setting = find( key );
			if ( setting == null ) {
				out.add( label + ": tui has no setting '" + key + "'. The settings are " + names() );
			} else if ( normalize( setting, e.getValue() ) == null ) {
				out.add( label + ": tui." + setting.name() + " '" + e.getValue() + "' is not valid. Use one of: " + setting.allowed() );
			}
		}
		return out;
	}

	/**
	 * @return Every name a {@code tui:} block may have, the settings and the message box's look, in a sentence
	 */
	public static String names() {
		List<String> names = new ArrayList<>();
		for ( Setting s : ALL ) {
			names.add( s.name() );
		}
		names.addAll( LOOK );
		return String.join( ", ", names );
	}

	/**
	 * The values found in one place that can hold settings
	 *
	 * @param name   Where they came from, such as {@code this agent}, for the panel to say
	 * @param values The setting names and their values; what is not a setting or not valid is left out when resolving
	 */
	public record Layer( String name, Map<String, Object> values ) {
	}

	/**
	 * The settings the chat runs with, and where each came from
	 */
	public static final class Resolved {

		/**
		 * The canonical value of each setting
		 */
		private final Map<String, String>	values	= new LinkedHashMap<>();

		/**
		 * The name of the layer each value came from, {@code default} when none had one
		 */
		private final Map<String, String>	sources	= new LinkedHashMap<>();

		/**
		 * The layers the values were decided from, lowest first, so a change to one of them can be decided again
		 */
		private final List<Layer>			layers	= new ArrayList<>();

		/**
		 * The same settings with one value of one layer changed, and decided again from all the layers
		 *
		 * @param layer   the name of the layer, such as {@link TuiSettings#AGENT}; it is added when the settings were decided without it
		 * @param setting the setting
		 * @param value   the value as text, or null to take the setting out of that layer
		 *
		 * @return the new settings; this one is not changed
		 */
		public Resolved with( String layer, String setting, String value ) {
			List<Layer>	copy	= new ArrayList<>();
			boolean		found	= false;
			for ( Layer l : layers ) {
				Map<String, Object> values = new LinkedHashMap<>( l.values() );
				if ( l.name().equals( layer ) ) {
					found = true;
					if ( value == null ) {
						values.remove( setting );
					} else {
						values.put( setting, value );
					}
				}
				copy.add( new Layer( l.name(), values ) );
			}
			if ( !found && value != null ) {
				copy.add( new Layer( layer, new LinkedHashMap<>( Map.of( setting, value ) ) ) );
			}
			return resolve( copy );
		}

		/**
		 * @param name A setting
		 *
		 * @return Its value as text
		 */
		public String get( String name ) {
			return values.get( name );
		}

		/**
		 * @param name A true or false setting
		 *
		 * @return Whether it is true
		 */
		public boolean bool( String name ) {
			return "true".equals( values.get( name ) );
		}

		/**
		 * @param name A whole number setting
		 *
		 * @return Its value
		 */
		public int integer( String name ) {
			return Integer.parseInt( values.get( name ) );
		}

		/**
		 * @param name A setting
		 *
		 * @return The name of the layer that gave its value, or {@code default}
		 */
		public String source( String name ) {
			return sources.getOrDefault( name, "default" );
		}
	}

	/**
	 * The settings with nothing set: every default
	 *
	 * @return The defaults
	 */
	public static Resolved defaults() {
		return resolve( List.of() );
	}

	/**
	 * Decide each setting from the places that can hold it. A later layer wins over an earlier one, a value a setting does not take is
	 * passed over (it is reported by {@link #problems}, not here), and what no layer has is the default.
	 *
	 * @param layers From the lowest to the highest
	 *
	 * @return The value of every setting and where it came from
	 */
	public static Resolved resolve( List<Layer> layers ) {
		Resolved out = new Resolved();
		out.layers.addAll( layers );
		for ( Setting s : ALL ) {
			out.values.put( s.name(), s.def() );
			out.sources.put( s.name(), "default" );
		}
		for ( Layer layer : layers ) {
			for ( Map.Entry<String, Object> e : layer.values().entrySet() ) {
				Setting	s		= find( e.getKey() );
				String	value	= s == null ? null : normalize( s, e.getValue() );
				if ( value != null ) {
					out.values.put( s.name(), value );
					out.sources.put( s.name(), layer.name() );
				}
			}
		}
		return out;
	}

	/**
	 * The same as {@link #resolve(List)}, for a caller that has plain maps (BoxLang structs): each map holds {@code name} and {@code values}
	 *
	 * @param layers From the lowest to the highest, each a map with a {@code name} and a {@code values} map
	 *
	 * @return The value of every setting and where it came from
	 */
	@SuppressWarnings( "unchecked" )
	public static Resolved resolveMaps( List<?> layers ) {
		List<Layer> list = new ArrayList<>();
		for ( Object each : layers ) {
			Map<?, ?>			m		= ( Map<?, ?> ) each;
			Map<String, Object>	values	= new LinkedHashMap<>();
			Object				given	= lookup( m, "values" );
			if ( given instanceof Map<?, ?> g ) {
				for ( Map.Entry<?, ?> e : g.entrySet() ) {
					values.put( String.valueOf( e.getKey() ), e.getValue() );
				}
			}
			list.add( new Layer( String.valueOf( lookup( m, "name" ) ), values ) );
		}
		return resolve( list );
	}

	/**
	 * A value of a map by its key, whatever the case: a BoxLang struct keeps keys in its own type
	 *
	 * @param map A map
	 * @param key The key
	 *
	 * @return The value, or null
	 */
	private static Object lookup( Map<?, ?> map, String key ) {
		for ( Map.Entry<?, ?> e : map.entrySet() ) {
			if ( String.valueOf( e.getKey() ).equalsIgnoreCase( key ) ) {
				return e.getValue();
			}
		}
		return null;
	}

}
