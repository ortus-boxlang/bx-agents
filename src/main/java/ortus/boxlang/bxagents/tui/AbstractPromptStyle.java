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
import java.util.function.UnaryOperator;

import dev.tamboui.style.Style;

/**
 * What every prompt style shares: the colour that says whether the agent is working, the message box rows with
 * their caret, the top bar with its label and widgets, and the hint row. A style puts these together and draws
 * its own edges.
 */
public abstract class AbstractPromptStyle implements PromptStyle {

	/** the text before the first line of the message box */
	protected static final String	MARK	= "❯";

	private final String			name;
	private final String			description;

	protected AbstractPromptStyle( String name, String description ) {
		this.name			= name;
		this.description	= description;
	}

	@Override
	public String name() {
		return name;
	}

	@Override
	public String description() {
		return description;
	}

	/** @return the colour of the edges: the accent at rest, amber while the agent works */
	protected Style tone( PromptState state, Theme theme ) {
		return state.working() ? theme.warn : theme.accent;
	}

	/**
	 * One row of the message box: the prompt mark or its indent, then the text. The row with the caret scrolls to
	 * keep it in view; the others are cut with an ellipsis.
	 *
	 * @param row    the row to add to
	 * @param state  the prompt
	 * @param i      which line of the message box
	 * @param room   the cells the text may use
	 * @param tone   the colour of the mark and the caret
	 * @param theme  the palette
	 * @param indent the text before the first line of the box, which the other lines get as spaces
	 *
	 * @return the row
	 */
	protected Row inputRow( Row row, PromptState state, int i, int room, Style tone, Theme theme, String indent ) {
		return inputRow( row, state, i, room, tone, theme, indent, s -> s );
	}

	/**
	 * The same, with every style passed through {@code paint}: the panel style uses it to lay its background under
	 * the text.
	 */
	protected Row inputRow( Row row, PromptState state, int i, int room, Style tone, Theme theme, String indent, UnaryOperator<Style> paint ) {
		row.add( i == 0 ? indent : " ".repeat( indent.length() ), paint.apply( tone.bold() ) );
		int		left	= Math.max( 1, room - indent.length() );
		String	text	= state.lines().get( i );
		Style	plain	= paint.apply( theme.plain );
		if ( i != state.caretRow() ) {
			return row.add( text.length() <= left ? text : text.substring( 0, left - 1 ) + "…", plain );
		}
		int		avail	= Math.max( 1, left - 1 );
		int		start	= text.length() <= avail ? 0 : Math.max( 0, state.caretCol() - avail + 1 );
		int		end		= Math.min( text.length(), start + avail );
		int		caret	= Math.max( 0, Math.min( state.caretCol() - start, end - start ) );
		String	shown	= text.substring( start, end );
		return row.add( shown.substring( 0, caret ), plain ).add( "▏", paint.apply( tone ) ).add( shown.substring( caret ), plain );
	}

	/**
	 * The top bar: an edge, the label, the top widgets and a run of rules to the far edge.
	 *
	 * @param open  what starts the bar, such as {@code "── "} or {@code "╭─ "}
	 * @param close what ends it, such as {@code ""} or {@code "╮"}
	 */
	protected Row topBar( PromptState state, Theme theme, String open, String close ) {
		Style			tone	= tone( state, theme );
		int				room	= state.width() - open.length() - close.length() - state.label().length() - 5;
		List<String>	shown	= fit( state.top(), room - 3, " · " );
		Row				row		= Row.of().add( open, tone ).add( state.label(), tone.bold() );
		int				used	= open.length() + state.label().length() + 1 + close.length();
		if ( !shown.isEmpty() ) {
			String joined = String.join( " · ", shown );
			row.add( " · ", theme.muted ).add( joined, theme.muted );
			used += 3 + joined.length();
		}
		return row.add( " ", tone ).add( "─".repeat( Math.max( 1, state.width() - used ) ), tone ).add( close, tone );
	}

	/** @return a bar of rules the full width, in the tone */
	protected Row rule( PromptState state, Theme theme ) {
		return Row.of( "─".repeat( state.width() ), tone( state, theme ) );
	}

	/**
	 * The hint row: the keys on the left, the bottom widgets and the recording mark on the right. When the row is
	 * too narrow the last widgets drop off.
	 */
	protected Row hintRow( PromptState state, Theme theme ) {
		String			left	= " " + state.hint();
		List<String>	shown	= new ArrayList<>( state.bottom() );
		String			rec		= state.recording() ? "● rec" : "";
		while ( !shown.isEmpty() && left.length() + 2 + rightLength( shown, rec ) > state.width() ) {
			shown.remove( shown.size() - 1 );
		}
		String	widgets	= String.join( " · ", shown );
		int		gap		= Math.max( 1, state.width() - left.length() - rightLength( shown, rec ) );
		Row		row		= Row.of().add( left, theme.muted ).add( " ".repeat( gap ), theme.muted ).add( widgets, theme.muted );
		if ( !rec.isEmpty() ) {
			row.add( widgets.isEmpty() ? "" : "  ", theme.muted ).add( rec, theme.error );
		}
		return row;
	}

	/**
	 * A bar that carries the hint on the left and the bottom widgets and the recording mark on the right.
	 *
	 * @param open  what starts the bar, such as {@code "──"} or {@code "╰─"}
	 * @param close what ends it, such as {@code "──"} or {@code "─╯"}
	 */
	protected Row hintBar( PromptState state, Theme theme, String open, String close ) {
		Style			tone	= tone( state, theme );
		String			left	= " " + state.hint() + " ";
		String			rec		= state.recording() ? "● rec" : "";
		List<String>	shown	= new ArrayList<>( state.bottom() );
		while ( !shown.isEmpty() && open.length() + left.length() + rightLength( shown, rec ) + 3 + close.length() > state.width() ) {
			shown.remove( shown.size() - 1 );
		}
		String	widgets	= String.join( " · ", shown );
		Row		row		= Row.of().add( open, tone ).add( left, theme.muted );
		int		used	= open.length() + left.length() + close.length();
		boolean	right	= !widgets.isEmpty() || !rec.isEmpty();
		if ( right ) {
			used += 2 + rightLength( shown, rec );
		}
		row.add( "─".repeat( Math.max( 1, state.width() - used ) ), tone );
		if ( right ) {
			row.add( " ", tone ).add( widgets, theme.muted );
			if ( !rec.isEmpty() ) {
				row.add( widgets.isEmpty() ? "" : "  ", theme.muted ).add( rec, theme.error );
			}
			row.add( " ", tone );
		}
		return row.add( close, tone );
	}

	/** @return the widgets that fit in {@code room} cells joined by {@code sep}, dropping from the end */
	protected static List<String> fit( List<String> items, int room, String sep ) {
		List<String> out = new ArrayList<>( items );
		while ( !out.isEmpty() && String.join( sep, out ).length() > room ) {
			out.remove( out.size() - 1 );
		}
		return out;
	}

	private static int rightLength( List<String> widgets, String rec ) {
		int n = String.join( " · ", widgets ).length();
		if ( !rec.isEmpty() ) {
			n += ( widgets.isEmpty() ? 0 : 2 ) + rec.length();
		}
		return n;
	}
}
