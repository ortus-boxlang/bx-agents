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
 * The project's icon, the three dots and the swirl, drawn in braille characters the way the BoxLang installers draw the BoxLang mark: each
 * character holds a block of 2 by 4 dots, so thirteen rows and twenty-six columns hold the whole icon. The colour goes from the accent to
 * the ok colour from left to right and a little from top to bottom, the way the icon goes from cyan to green, and is one colour where the
 * terminal has no more. Every braille character is one cell wide, so the width counts are exact.
 */
final class Logo {

	/**
	 * The drawing, one string per row of text. It was made from {@code docs/assets/bxagents-icon-full.svg}.
	 */
	private static final List<String> ART = List.of(
	    "            ⣠⣤⣤⡀",
	    "           ⣾⣿⣿⣿⣿⡆",
	    "        ⢀⣴⣆⠙⢿⣿⣿⠟⢡⣤⣀",
	    "     ⢀⡴⢠⣿⣿⣿⠗⢀⣠⣤⣶⣿⣿⣿⣷⣄",
	    "    ⣴⣿⢁⣿⣿⠟⠁ ⠋⠉⠉⠉⠙⠛⠻⢿⣿⣷⡄",
	    "   ⣸⣿⡏⢸⣿⠏        ⠙⢷⣦⣌⠛⢿⡄",
	    "   ⣿⣿⣧⠈⡿          ⠈⢻⣿⣷⣄⠃",
	    "   ⣿⣿⣿⣆           ⢀⡀⢿⣿⣿⣆",
	    " ⣀⣀⣉⠙⢻⣿⣦⡀         ⣸⣧⠸⠟⢛⣛⡀",
	    "⣼⣿⣿⣿⣷⡀⢉⠛⠛⠦    ⣀⣠ ⣰⣿⣿ ⣾⣿⣿⣿⣦",
	    "⢻⣿⣿⣿⡿⢁⣾⣿⣿⣶⣶⣶⣾⡿⠟⣁⣼⣿⣿⣿⠈⣿⣿⣿⣿⡿",
	    " ⠉⠉⠉ ⠚⠻⠿⠿⠟⠛⣋⣩⣴⣾⣿⣿⡿⠟⠁ ⠈⠙⠛⠉",
	    "        ⠈⠙⠛⠛⠛⠛⠛⠉⠁" );

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
		for ( int y = 0; y < ART.size(); y++ ) {
			String	line	= ART.get( y );
			Row		row		= Row.of();
			for ( int x = 0; x < width; x++ ) {
				char c = x < line.length() ? line.charAt( x ) : ' ';
				row.add( String.valueOf( c ), c == ' ' ? theme.plain : theme.gradient( shade( x, y, width, ART.size() ) ) );
			}
			rows.add( row );
		}
		return rows;
	}

	/**
	 * Where a cell is on the way from the accent colour to the ok colour: mostly by how far right it is, a little by how far down
	 *
	 * @param x      The column
	 * @param y      The row
	 * @param width  How many columns the mark has
	 * @param height How many rows the mark has
	 *
	 * @return A number from 0, the accent, to 1, the ok colour
	 */
	private static double shade( int x, int y, int width, int height ) {
		double	across	= width <= 1 ? 0 : x / ( double ) ( width - 1 );
		double	down	= height <= 1 ? 0 : y / ( double ) ( height - 1 );
		return 0.7 * across + 0.3 * down;
	}

}
