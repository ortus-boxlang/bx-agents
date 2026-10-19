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
 * Word wrapping for plain text that is shown before it is rendered as Markdown
 * (the answer as it streams in) and for the composer.
 */
final class Wrap {

	private Wrap() {
	}

	/**
	 * @param text  text with optional newlines
	 * @param width columns available
	 *
	 * @return the lines, none longer than width; blank lines are kept
	 */
	static List<String> wrap( String text, int width ) {
		int				w	= Math.max( 8, width );
		List<String>	out	= new ArrayList<>();
		for ( String paragraph : text.split( "\n", -1 ) ) {
			String line = paragraph;
			if ( line.length() <= w ) {
				out.add( line );
				continue;
			}
			while ( line.length() > w ) {
				int cut = line.lastIndexOf( ' ', w );
				if ( cut <= 0 ) {
					cut = w;
				}
				out.add( line.substring( 0, cut ) );
				line = line.substring( cut ).stripLeading();
			}
			out.add( line );
		}
		return out;
	}

	/**
	 * @return the last n lines of the wrapped text
	 */
	static List<String> tail( String text, int width, int n ) {
		List<String> all = wrap( text, width );
		return all.size() <= n ? all : all.subList( all.size() - n, all.size() );
	}

}
