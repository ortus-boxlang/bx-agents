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

/**
 * One option in a select or multi-select list. BoxLang hands lists over as
 * plain strings or as structs with value, label, hint and selected keys, and
 * {@link #from(Object)} reads either.
 */
public final class Choice {

	public final String		value;
	public final String		label;
	public final String		hint;
	public final boolean	selected;

	public Choice( String value, String label, String hint, boolean selected ) {
		this.value		= value;
		this.label		= label;
		this.hint		= hint;
		this.selected	= selected;
	}

	/**
	 * @param raw a String, or a Map with value, label, hint, selected
	 *
	 * @return the choice
	 */
	public static Choice from( Object raw ) {
		if ( raw instanceof Map<?, ?> m ) {
			String	value	= str( get( m, "value" ) );
			String	label	= get( m, "label" ) == null ? value : str( get( m, "label" ) );
			return new Choice( value, label, get( m, "hint" ) == null ? "" : str( get( m, "hint" ) ), truthy( get( m, "selected" ) ) );
		}
		String s = String.valueOf( raw );
		return new Choice( s, s, "", false );
	}

	/**
	 * @param raw a List of Strings or Maps
	 *
	 * @return the choices, in order
	 */
	public static List<Choice> listFrom( List<?> raw ) {
		List<Choice> out = new ArrayList<>();
		for ( Object o : raw ) {
			out.add( from( o ) );
		}
		return out;
	}

	// BoxLang structs are case-insensitive and key by Key objects; try the plain name, then a case-folded scan.
	private static Object get( Map<?, ?> m, String name ) {
		Object v = m.get( name );
		if ( v != null ) {
			return v;
		}
		for ( Map.Entry<?, ?> e : m.entrySet() ) {
			if ( String.valueOf( e.getKey() ).equalsIgnoreCase( name ) ) {
				return e.getValue();
			}
		}
		return null;
	}

	private static String str( Object o ) {
		return o == null ? "" : String.valueOf( o );
	}

	private static boolean truthy( Object o ) {
		return o != null && ( o instanceof Boolean b ? b : "true".equalsIgnoreCase( String.valueOf( o ) ) );
	}

}
