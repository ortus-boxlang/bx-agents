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
import java.util.function.BiFunction;

/**
 * The {@code @name:query} sources extensions add to the {@code @} menu. The menu offers the source names while a
 * name is being typed ({@code @ji} offers {@code jira:}), and the source's own suggestions once the colon is typed
 * ({@code @jira:AB}). Suggestions are asked of the extension, which can be slow, and the box is redrawn many times a
 * second, so the last answer is kept for as long as the same thing is typed.
 */
final class AtSources {

	private final List<String>								names;
	private final BiFunction<String, String, List<String>>	suggester;
	private String											askedName	= null;
	private String											askedQuery	= null;
	private List<String>									answer		= List.of();

	/**
	 * @param names     the source names in use
	 * @param suggester asked for ( name, what follows the colon ); may throw, which gives no suggestions
	 */
	AtSources( List<String> names, BiFunction<String, String, List<String>> suggester ) {
		this.names		= List.copyOf( names );
		this.suggester	= suggester;
	}

	boolean isEmpty() {
		return names.isEmpty();
	}

	/**
	 * @param query the letters after the at sign, up to the caret
	 * @param files what the file index offers for them
	 * @param limit the most entries to return
	 *
	 * @return the entries for the menu: {@code name:} or {@code name:value} for sources, then paths
	 */
	List<String> matches( String query, List<String> files, int limit ) {
		List<String>	out		= new ArrayList<>();
		int				colon	= query.indexOf( ':' );
		if ( colon >= 0 ) {
			String name = nameFor( query.substring( 0, colon ) );
			if ( name != null ) {
				for ( String value : suggestions( name, query.substring( colon + 1 ) ) ) {
					out.add( name + ":" + ( value.contains( " " ) ? "\"" + value + "\"" : value ) );
					if ( out.size() >= limit ) {
						break;
					}
				}
				return out;
			}
			return files;
		}
		for ( String name : names ) {
			if ( name.toLowerCase( Locale.ROOT ).startsWith( query.toLowerCase( Locale.ROOT ) ) ) {
				out.add( name + ":" );
			}
		}
		out.addAll( files );
		return out.size() > limit ? out.subList( 0, limit ) : out;
	}

	private String nameFor( String typed ) {
		for ( String name : names ) {
			if ( name.equalsIgnoreCase( typed ) ) {
				return name;
			}
		}
		return null;
	}

	private List<String> suggestions( String name, String query ) {
		if ( name.equals( askedName ) && query.equals( askedQuery ) ) {
			return answer;
		}
		askedName	= name;
		askedQuery	= query;
		try {
			List<String> given = suggester.apply( name, query );
			answer = given == null ? List.of() : given;
		} catch ( RuntimeException e ) {
			answer = List.of();
		}
		return answer;
	}

}
