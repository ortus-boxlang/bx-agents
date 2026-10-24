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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dev.tamboui.buffer.Buffer;
import dev.tamboui.buffer.Cell;
import dev.tamboui.layout.Rect;
import dev.tamboui.markdown.MarkdownView;
import dev.tamboui.style.Style;
import dev.tamboui.text.Line;
import dev.tamboui.text.Span;

/**
 * Turns Markdown into styled lines that can be printed into the terminal's scrollback.
 * TamboUI's MarkdownView draws into a buffer, so the text is drawn into an off-screen
 * one and read back cell by cell, merging runs of one style into one span.
 */
final class MarkdownLines {

	private static final Pattern FENCE = Pattern.compile( "^ {0,3}(```+|~~~+)" );

	private MarkdownLines() {
	}

	/** @return the lines for a terminal whose colours are found from the environment */
	static List<Line> render( String markdown, int width ) {
		return render( markdown, width, Theme.detect() );
	}

	/**
	 * Tables are cut out and drawn with borders ({@link TableLines}); everything around them is TamboUI's.
	 *
	 * @param markdown the text
	 * @param width    columns the lines may use
	 * @param theme    the palette, for the table borders
	 *
	 * @return the styled lines; the plain wrapped text if rendering fails
	 */
	static List<Line> render( String markdown, int width, Theme theme ) {
		int				w		= Math.max( 20, width );
		List<Line>		out		= new ArrayList<>();
		StringBuilder	text	= new StringBuilder();
		String[]		lines	= markdown.split( "\n", -1 );
		String			fence	= "";
		for ( int i = 0; i < lines.length; i++ ) {
			String	line	= lines[ i ];
			Matcher	f		= FENCE.matcher( line );
			if ( fence.isEmpty() && f.find() ) {
				fence = f.group( 1 );
			} else if ( !fence.isEmpty() && line.strip().startsWith( fence ) && line.strip().replace( fence.substring( 0, 1 ), "" ).isEmpty() ) {
				fence = "";
			} else if ( fence.isEmpty() && i + 1 < lines.length && TableLines.starts( line, lines[ i + 1 ] ) ) {
				int end = i + 2;
				while ( end < lines.length && !lines[ end ].isBlank() && lines[ end ].contains( "|" ) ) {
					end++;
				}
				List<Line> table = TableLines.render( java.util.Arrays.asList( lines ).subList( i, end ), w, theme );
				if ( table != null ) {
					flush( text, w, out );
					if ( !out.isEmpty() ) {
						out.add( Line.from( "" ) );
					}
					out.addAll( table );
					out.add( Line.from( "" ) );
					text.setLength( 0 );
					i = end - 1;
					continue;
				}
			}
			text.append( line ).append( '\n' );
		}
		flush( text, w, out );
		while ( !out.isEmpty() && out.get( out.size() - 1 ).rawContent().isBlank() ) {
			out.remove( out.size() - 1 );
		}
		return out;
	}

	private static void flush( StringBuilder text, int w, List<Line> out ) {
		if ( !text.toString().isBlank() ) {
			out.addAll( plain( text.toString().strip(), w ) );
		}
		text.setLength( 0 );
	}

	/** TamboUI's rendering of Markdown that holds no table */
	private static List<Line> plain( String markdown, int w ) {
		try {
			MarkdownView	view	= MarkdownView.builder().source( markdown ).syntaxHighlighter( Grammars.highlighter() ).build();
			int				h		= view.computeHeight( w );
			if ( h <= 0 ) {
				return List.of();
			}
			Rect	area	= new Rect( 0, 0, w, h );
			Buffer	buffer	= Buffer.empty( area );
			view.render( area, buffer );
			List<Line> lines = new ArrayList<>();
			for ( int y = 0; y < h; y++ ) {
				lines.add( readLine( buffer, y, w ) );
			}
			// trailing blank lines carry no meaning
			while ( !lines.isEmpty() && lines.get( lines.size() - 1 ).rawContent().isBlank() ) {
				lines.remove( lines.size() - 1 );
			}
			return lines;
		} catch ( RuntimeException e ) {
			List<Line> plain = new ArrayList<>();
			for ( String s : Wrap.wrap( markdown, w ) ) {
				plain.add( Line.from( s ) );
			}
			return plain;
		}
	}

	private static Line readLine( Buffer buffer, int y, int width ) {
		List<Span>		spans	= new ArrayList<>();
		StringBuilder	run		= new StringBuilder();
		Style			style	= null;
		for ( int x = 0; x < width; x++ ) {
			Cell c = buffer.get( x, y );
			if ( c.isContinuation() ) {
				continue;
			}
			String symbol = c.symbol().isEmpty() ? " " : c.symbol();
			if ( style == null || !style.equals( c.style() ) ) {
				if ( run.length() > 0 ) {
					spans.add( Span.styled( run.toString(), style ) );
					run.setLength( 0 );
				}
				style = c.style();
			}
			run.append( symbol );
		}
		if ( run.length() > 0 ) {
			// drop the padding the buffer adds to the right of the text
			String text = run.toString().stripTrailing();
			if ( !text.isEmpty() ) {
				spans.add( Span.styled( text, style ) );
			}
		}
		return Line.from( spans );
	}

}
