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

import dev.tamboui.style.Style;
import dev.tamboui.text.Line;

/**
 * Draws a Markdown table with borders: rounded corners, a rule under the header, the edges in the accent colour and
 * the header in bold. TamboUI's Markdown view draws tables as bare columns, so {@link MarkdownLines} cuts the tables
 * out of an answer and gives them to this class.
 *
 * Cells keep {@code `code`}, {@code **bold**} and {@code *italic*}, wrap at spaces when the table is wider than the
 * screen, and follow the column alignment of the delimiter row. When the screen is too narrow even for the longest
 * word in each column, {@link #render} says so by returning null and the caller shows the table another way.
 */
final class TableLines {

	private static final Pattern	DELIMITER	= Pattern.compile( "^\\s*\\|?\\s*:?-+:?\\s*(\\|\\s*:?-+:?\\s*)*\\|?\\s*$" );
	private static final Pattern	INLINE		= Pattern.compile( "`([^`]+)`|\\*\\*([^*]+)\\*\\*|\\*([^*]+)\\*" );

	private enum Align {
		LEFT, CENTER, RIGHT
	}

	/** a run of cell text and its look */
	private record Piece( String text, Style style ) {
	}

	private TableLines() {
	}

	/**
	 * @param header the line with the column names
	 * @param next   the line after it
	 *
	 * @return true when the two lines begin a table: a header and a delimiter row with the same number of columns
	 */
	static boolean starts( String header, String next ) {
		if ( header == null || next == null || !header.contains( "|" ) || !DELIMITER.matcher( next ).matches() || !next.contains( "-" ) ) {
			return false;
		}
		return cells( header ).size() == cells( next ).size() && !( cells( next ).size() == 1 && !next.contains( "|" ) );
	}

	/**
	 * @param lines the table: header, delimiter row, then the body rows
	 * @param width the columns the table may use
	 * @param theme the palette
	 *
	 * @return the table as styled lines, or null when it cannot be made to fit in {@code width}
	 */
	static List<Line> render( List<String> lines, int width, Theme theme ) {
		List<List<String>>	rows	= new ArrayList<>();
		for ( int i = 0; i < lines.size(); i++ ) {
			if ( i != 1 ) {
				rows.add( cells( lines.get( i ) ) );
			}
		}
		int			n		= cells( lines.get( 1 ) ).size();
		Align[]		align	= alignments( cells( lines.get( 1 ) ) );
		for ( List<String> r : rows ) {
			while ( r.size() < n ) {
				r.add( "" );
			}
		}

		// widths: what each column would like, and the least it can be cut to (its longest word)
		int[]	want	= new int[ n ];
		int[]	least	= new int[ n ];
		for ( List<String> r : rows ) {
			for ( int c = 0; c < n; c++ ) {
				String text = visible( r.get( c ) );
				want[ c ]	= Math.max( want[ c ], text.length() );
				least[ c ]	= Math.max( least[ c ], longestWord( text ) );
			}
		}
		for ( int c = 0; c < n; c++ ) {
			want[ c ]	= Math.max( 1, want[ c ] );
			least[ c ]	= Math.max( 1, Math.min( least[ c ], want[ c ] ) );
		}
		int	overhead	= 3 * n + 1;
		int	room		= width - overhead;
		int[] w			= want.clone();
		if ( sum( want ) > room ) {
			if ( sum( least ) > room ) {
				return null;
			}
			w = least.clone();
			int spare = room - sum( least );
			int grow = 0;
			for ( int c = 0; c < n; c++ ) {
				grow += want[ c ] - least[ c ];
			}
			for ( int c = 0; c < n && grow > 0; c++ ) {
				int add = (int) Math.floor( spare * ( ( want[ c ] - least[ c ] ) / (double) grow ) );
				w[ c ] += add;
			}
			// the rounding leaves a few cells; give them to the columns that still want more
			int left = room - sum( w );
			for ( int c = 0; left > 0 && c < n; c++ ) {
				int add = Math.min( left, want[ c ] - w[ c ] );
				w[ c ] += add;
				left -= add;
			}
		}

		Style		edge	= theme.accent;
		List<Row>	out		= new ArrayList<>();
		out.add( border( "╭", "┬", "╮", w, edge ) );
		for ( int r = 0; r < rows.size(); r++ ) {
			boolean header = r == 0;
			out.addAll( rowLines( rows.get( r ), w, align, header, edge, theme ) );
			if ( header ) {
				out.add( border( "├", "┼", "┤", w, edge ) );
			}
		}
		out.add( border( "╰", "┴", "╯", w, edge ) );
		List<Line> result = new ArrayList<>();
		for ( Row r : out ) {
			result.add( r.toLine() );
		}
		return result;
	}

	// ----------------------------------------------------------------------------------

	private static Row border( String left, String mid, String right, int[] w, Style edge ) {
		StringBuilder sb = new StringBuilder( left );
		for ( int c = 0; c < w.length; c++ ) {
			sb.append( "─".repeat( w[ c ] + 2 ) ).append( c == w.length - 1 ? right : mid );
		}
		return Row.of( sb.toString(), edge );
	}

	/** the physical lines of one table row: each cell wrapped to its column, side by side */
	private static List<Row> rowLines( List<String> cells, int[] w, Align[] align, boolean header, Style edge, Theme theme ) {
		List<List<List<Piece>>>	wrapped	= new ArrayList<>();
		int						height	= 1;
		for ( int c = 0; c < w.length; c++ ) {
			List<List<Piece>> lines = wrap( pieces( cells.get( c ), header, theme ), w[ c ] );
			wrapped.add( lines );
			height = Math.max( height, lines.size() );
		}
		List<Row> rows = new ArrayList<>();
		for ( int line = 0; line < height; line++ ) {
			Row row = Row.of().add( "│", edge );
			for ( int c = 0; c < w.length; c++ ) {
				List<Piece>	pieces	= line < wrapped.get( c ).size() ? wrapped.get( c ).get( line ) : List.of();
				int			len		= 0;
				for ( Piece p : pieces ) {
					len += p.text.length();
				}
				int			gap		= w[ c ] - len;
				int			before	= align[ c ] == Align.RIGHT ? gap : align[ c ] == Align.CENTER ? gap / 2 : 0;
				row.add( " " + " ".repeat( before ), theme.plain );
				for ( Piece p : pieces ) {
					row.add( p.text, p.style );
				}
				row.add( " ".repeat( gap - before ) + " ", theme.plain ).add( "│", edge );
			}
			rows.add( row );
		}
		return rows;
	}

	/** splits a cell into runs of text with the look of its inline code, bold and italics */
	private static List<Piece> pieces( String cell, boolean header, Theme theme ) {
		Style		base	= header ? theme.accentBold : theme.plain;
		List<Piece>	out		= new ArrayList<>();
		Matcher		m		= INLINE.matcher( cell );
		int			at		= 0;
		while ( m.find() ) {
			if ( m.start() > at ) {
				out.add( new Piece( cell.substring( at, m.start() ), base ) );
			}
			if ( m.group( 1 ) != null ) {
				out.add( new Piece( m.group( 1 ), theme.ok ) );
			} else if ( m.group( 2 ) != null ) {
				out.add( new Piece( m.group( 2 ), base.bold() ) );
			} else {
				out.add( new Piece( m.group( 3 ), base.italic() ) );
			}
			at = m.end();
		}
		if ( at < cell.length() ) {
			out.add( new Piece( cell.substring( at ), base ) );
		}
		return out;
	}

	/** breaks the runs into lines of at most {@code width} cells, at spaces where there are any */
	private static List<List<Piece>> wrap( List<Piece> pieces, int width ) {
		List<List<Piece>>	lines	= new ArrayList<>();
		List<Piece>			line	= new ArrayList<>();
		int					used	= 0;
		for ( Piece p : pieces ) {
			// split into words and the spaces between them, keeping each with its piece's style
			Matcher words = Pattern.compile( "\\S+|\\s+" ).matcher( p.text );
			while ( words.find() ) {
				String word = words.group();
				if ( word.isBlank() ) {
					if ( used > 0 && used + word.length() <= width ) {
						line.add( new Piece( word, p.style ) );
						used += word.length();
					}
					continue;
				}
				while ( word.length() > width ) {
					if ( used > 0 ) {
						lines.add( line );
						line	= new ArrayList<>();
						used	= 0;
					}
					line.add( new Piece( word.substring( 0, width ), p.style ) );
					lines.add( line );
					line	= new ArrayList<>();
					word	= word.substring( width );
				}
				if ( used + word.length() > width ) {
					lines.add( trimEnd( line ) );
					line	= new ArrayList<>();
					used	= 0;
				}
				line.add( new Piece( word, p.style ) );
				used += word.length();
			}
		}
		lines.add( trimEnd( line ) );
		return lines;
	}

	private static List<Piece> trimEnd( List<Piece> line ) {
		while ( !line.isEmpty() && line.get( line.size() - 1 ).text.isBlank() ) {
			line.remove( line.size() - 1 );
		}
		return line;
	}

	/** the cells of a table line: split on pipes that are not escaped, without the pipes at the ends */
	static List<String> cells( String line ) {
		String t = line.strip();
		if ( t.startsWith( "|" ) ) {
			t = t.substring( 1 );
		}
		if ( t.endsWith( "|" ) && !t.endsWith( "\\|" ) ) {
			t = t.substring( 0, t.length() - 1 );
		}
		List<String>	cells	= new ArrayList<>();
		StringBuilder	cell	= new StringBuilder();
		for ( int i = 0; i < t.length(); i++ ) {
			char ch = t.charAt( i );
			if ( ch == '\\' && i + 1 < t.length() && t.charAt( i + 1 ) == '|' ) {
				cell.append( '|' );
				i++;
			} else if ( ch == '|' ) {
				cells.add( cell.toString().strip() );
				cell.setLength( 0 );
			} else {
				cell.append( ch );
			}
		}
		cells.add( cell.toString().strip() );
		return cells;
	}

	private static Align[] alignments( List<String> delimiters ) {
		Align[] out = new Align[ delimiters.size() ];
		for ( int i = 0; i < out.length; i++ ) {
			String d = delimiters.get( i );
			out[ i ] = d.startsWith( ":" ) && d.endsWith( ":" ) ? Align.CENTER : d.endsWith( ":" ) ? Align.RIGHT : Align.LEFT;
		}
		return out;
	}

	/** the cell as it will read: without the marks that make code, bold and italics */
	private static String visible( String cell ) {
		return INLINE.matcher( cell ).replaceAll( m -> Matcher.quoteReplacement( m.group( 1 ) != null ? m.group( 1 ) : m.group( 2 ) != null ? m.group( 2 ) : m.group( 3 ) ) );
	}

	private static int longestWord( String text ) {
		int best = 0;
		for ( String w : text.split( "\\s+" ) ) {
			best = Math.max( best, w.length() );
		}
		return best;
	}

	private static int sum( int[] a ) {
		int s = 0;
		for ( int v : a ) {
			s += v;
		}
		return s;
	}
}
