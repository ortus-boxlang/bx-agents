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
 * The bxAgents mark in block characters: three nodes on a ring, as in the icon of the project. Half blocks give square pixels, so the
 * 22 by 18 pixel drawing takes 22 columns and 9 rows. The colour goes from the accent to the ok colour across the width, the way the icon's
 * gradient goes from cyan to green, and is one colour where the terminal has no more.
 */
final class Logo {

	/**
	 * The drawing, one string per row of text
	 */
	private static final List<String> ART = List.of(
	    "         ▄██▄",
	    "       ▄██████▄",
	    "     ▄▀▀ ▀▀▀▀ ▀▀▄",
	    "    █▀          ▀█",
	    "    █            █",
	    "   ▄██▄        ▄██▄",
	    "   █████      █████",
	    "   ▀██▀▄▄    ▄▄▀██▀",
	    "        ▀▀▀▀▀▀" );

	/**
	 * Nothing to create: the methods are static
	 */
	private Logo() {
	}

	/**
	 * @return How many columns the mark takes
	 */
	static int width() {
		int w = 0;
		for ( String line : ART ) {
			w = Math.max( w, line.length() );
		}
		return w;
	}

	/**
	 * @return How many rows the mark takes
	 */
	static int height() {
		return ART.size();
	}

	/**
	 * The mark as rows, each padded to the same width so text can be put beside it
	 *
	 * @param theme The palette
	 *
	 * @return One row per line of the mark
	 */
	static List<Row> rows( Theme theme ) {
		int			width	= width();
		List<Row>	rows	= new ArrayList<>();
		for ( String line : ART ) {
			Row row = Row.of();
			for ( int x = 0; x < width; x++ ) {
				char c = x < line.length() ? line.charAt( x ) : ' ';
				row.add( String.valueOf( c ), c == ' ' ? theme.plain : theme.gradient( width <= 1 ? 0 : x / ( double ) ( width - 1 ) ) );
			}
			rows.add( row );
		}
		return rows;
	}

}
