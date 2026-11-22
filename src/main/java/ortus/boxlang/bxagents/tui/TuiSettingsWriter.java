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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Writes one setting into a YAML file that holds a {@code tui:} block, an agent's {@code Agent.yml} or the person's
 * {@code ~/.bxagents/Agent.yml}, working on the lines of the file. What the person wrote (other sections, comments, the order, the
 * comment at the end of the setting's own line) is left as it was, and only the line of the one setting changes:
 *
 * <pre>
 * tui:
 *   fullscreen: false      # a comment on the line goes with the line
 *   header: compact
 * </pre>
 *
 * A file that is not there is made, with its folder, when a setting is first written to it.
 */
public final class TuiSettingsWriter {

	/**
	 * The line {@code tui:} that starts the block, with nothing after it but a comment
	 */
	private static final Pattern	BLOCK	= Pattern.compile( "^tui:\\s*(#.*)?$" );

	/**
	 * A {@code tui:} followed by a value on the same line, as in {@code tui: { fullscreen: false }}
	 */
	private static final Pattern	FLOW	= Pattern.compile( "^tui:\\s*[^\\s#].*$" );

	/**
	 * Nothing to create: the methods are static
	 */
	private TuiSettingsWriter() {
	}

	/**
	 * Where the block is in a file
	 *
	 * @param found  whether there is a {@code tui:} line
	 * @param flow   whether the block is written on the line of {@code tui:} itself, which cannot be edited line by line
	 * @param start  the index of the {@code tui:} line
	 * @param last   the index of the last line that belongs to the block
	 * @param indent what the settings under it start with
	 */
	private record Span( boolean found, boolean flow, int start, int last, String indent ) {
	}

	/**
	 * The same as {@link #set(Path, String, String)}, for a caller that has the path as text
	 *
	 * @param file  the path of the YAML file
	 * @param name  the setting
	 * @param value the value as the text a file holds
	 *
	 * @throws IOException when the file cannot be read or written, or holds {@code tui:} on one line
	 */
	public static void set( String file, String name, String value ) throws IOException {
		set( Path.of( file ), name, value );
	}

	/**
	 * The same as {@link #remove(Path, String)}, for a caller that has the path as text
	 *
	 * @param file the path of the YAML file
	 * @param name the setting
	 *
	 * @return true when there was a line to take out
	 *
	 * @throws IOException when the file cannot be read or written
	 */
	public static boolean remove( String file, String name ) throws IOException {
		return remove( Path.of( file ), name );
	}

	/**
	 * Sets one setting, adding the {@code tui:} block and the file when they are not there
	 *
	 * @param file  the YAML file
	 * @param name  the setting
	 * @param value the value as the text a file holds: {@code true}, a word or a number
	 *
	 * @throws IOException when the file cannot be read or written, or holds {@code tui:} on one line
	 */
	public static void set( Path file, String name, String value ) throws IOException {
		List<String>	lines	= read( file );
		Span			span	= span( lines );
		if ( span.flow() ) {
			throw new IOException( file + " writes tui: on one line, so it cannot be edited here. Write it as a block, or change it by hand." );
		}
		if ( !span.found() ) {
			if ( !lines.isEmpty() && !lines.get( lines.size() - 1 ).isBlank() ) {
				lines.add( "" );
			}
			lines.add( "tui:" );
			lines.add( "  " + name + ": " + value );
			write( file, lines );
			return;
		}
		int at = child( lines, span, name );
		if ( at >= 0 ) {
			Matcher m = Pattern.compile( "^(\\s+" + Pattern.quote( name ) + ":\\s*)\\S+(\\s+#.*)?$" ).matcher( lines.get( at ) );
			if ( m.matches() ) {
				lines.set( at, m.group( 1 ) + value + ( m.group( 2 ) == null ? "" : m.group( 2 ) ) );
			} else {
				lines.set( at, span.indent() + name + ": " + value );
			}
		} else {
			lines.add( span.last() + 1, span.indent() + name + ": " + value );
		}
		write( file, lines );
	}

	/**
	 * Takes one setting out of the file, so the layer below it applies again. The {@code tui:} line goes too when nothing is left under it.
	 *
	 * @param file the YAML file
	 * @param name the setting
	 *
	 * @return true when there was a line to take out
	 *
	 * @throws IOException when the file cannot be read or written
	 */
	public static boolean remove( Path file, String name ) throws IOException {
		List<String>	lines	= read( file );
		Span			span	= span( lines );
		if ( !span.found() || span.flow() ) {
			return false;
		}
		int at = child( lines, span, name );
		if ( at < 0 ) {
			return false;
		}
		lines.remove( at );
		Span after = span( lines );
		if ( after.found() && after.last() == after.start() ) {
			lines.remove( after.start() );
		}
		write( file, lines );
		return true;
	}

	/**
	 * Finds the {@code tui:} block
	 *
	 * @param lines the lines of the file
	 *
	 * @return where the block is
	 */
	private static Span span( List<String> lines ) {
		int start = -1;
		for ( int i = 0; i < lines.size(); i++ ) {
			if ( BLOCK.matcher( lines.get( i ) ).matches() ) {
				start = i;
				break;
			}
			if ( FLOW.matcher( lines.get( i ) ).matches() ) {
				return new Span( true, true, i, i, "  " );
			}
		}
		if ( start < 0 ) {
			return new Span( false, false, -1, -1, "  " );
		}
		int		last		= start;
		String	indent		= "  ";
		boolean	firstChild	= true;
		for ( int i = start + 1; i < lines.size(); i++ ) {
			String line = lines.get( i );
			if ( line.isBlank() ) {
				continue;
			}
			boolean indented = Character.isWhitespace( line.charAt( 0 ) );
			if ( !indented && !line.startsWith( "#" ) ) {
				break;
			}
			if ( firstChild && indented && !line.strip().startsWith( "#" ) ) {
				indent		= line.substring( 0, line.length() - line.stripLeading().length() );
				firstChild	= false;
			}
			last = i;
		}
		return new Span( true, false, start, last, indent );
	}

	/**
	 * @param lines the lines of the file
	 * @param span  the block
	 * @param name  the setting
	 *
	 * @return the index of the line that holds the setting directly under {@code tui:}, or -1
	 */
	private static int child( List<String> lines, Span span, String name ) {
		String prefix = span.indent() + name + ":";
		for ( int i = span.start() + 1; i <= span.last(); i++ ) {
			if ( lines.get( i ).startsWith( prefix ) ) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * @param file the YAML file
	 *
	 * @return its lines, none when it does not exist
	 *
	 * @throws IOException when it cannot be read
	 */
	private static List<String> read( Path file ) throws IOException {
		if ( !Files.exists( file ) ) {
			return new ArrayList<>();
		}
		String			text	= Files.readString( file, StandardCharsets.UTF_8 ).replace( "\r", "" );
		List<String>	lines	= new ArrayList<>( List.of( text.split( "\n", -1 ) ) );
		if ( !lines.isEmpty() && lines.get( lines.size() - 1 ).isEmpty() ) {
			lines.remove( lines.size() - 1 );
		}
		return lines;
	}

	/**
	 * Writes the lines, making the folder when it is not there
	 *
	 * @param file  the YAML file
	 * @param lines the lines
	 *
	 * @throws IOException when it cannot be written
	 */
	private static void write( Path file, List<String> lines ) throws IOException {
		if ( file.getParent() != null ) {
			Files.createDirectories( file.getParent() );
		}
		Files.writeString( file, String.join( "\n", lines ) + "\n", StandardCharsets.UTF_8 );
	}

}
