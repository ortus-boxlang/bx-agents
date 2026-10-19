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

import dev.tamboui.style.Style;

/**
 * One line of a screen: a run of styled text segments. Plain data, so a
 * prompt can describe what it shows without touching a terminal, and a test
 * can read it back with {@link #plainText()}.
 */
public final class Row {

	private record Seg( String text, Style style ) {
	}

	private final List<Seg>	segs	= new ArrayList<>();

	/** Bare constructor; chain {@link #add} calls. */
	public static Row of() {
		return new Row();
	}

	/** A row of one segment. */
	public static Row of( String text, Style style ) {
		return new Row().add( text, style );
	}

	/**
	 * @return this row with the segment appended
	 */
	public Row add( String text, Style style ) {
		if ( text != null && !text.isEmpty() ) {
			segs.add( new Seg( text, style ) );
		}
		return this;
	}

	/** @return the text without styles */
	public String plainText() {
		StringBuilder sb = new StringBuilder();
		for ( Seg s : segs ) {
			sb.append( s.text );
		}
		return sb.toString();
	}

	/** @return the width in cells (every glyph used here is one cell wide) */
	public int width() {
		return plainText().length();
	}

	/**
	 * Writes the row into a buffer line, clipped to maxWidth.
	 *
	 * @param buffer   the frame buffer
	 * @param x        left cell
	 * @param y        line
	 * @param maxWidth cells available
	 */
	public void draw( dev.tamboui.buffer.Buffer buffer, int x, int y, int maxWidth ) {
		int at = x;
		for ( Seg s : segs ) {
			int room = x + maxWidth - at;
			if ( room <= 0 ) {
				return;
			}
			String t = s.text.length() > room ? s.text.substring( 0, room ) : s.text;
			buffer.setString( at, y, t, s.style );
			at += t.length();
		}
	}

}
