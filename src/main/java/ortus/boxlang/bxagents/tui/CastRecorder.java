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

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/**
 * Writes what a terminal showed as an asciicast v2 file, which asciinema plays and agg turns into a GIF.
 * <p>
 * The file is one JSON header line, then one JSON line per event: <code>[seconds, "o", text]</code> for output
 * and <code>[seconds, "r", "COLSxROWS"]</code> for a resize. Only output is kept, never keystrokes, so
 * nothing is recorded that the screen did not show.
 * <p>
 * The terminal driver turns each bare line feed into a carriage return plus line feed on its way to the screen,
 * and the program never sees that, so it is done here: the file holds what the screen received, which is what
 * a player expects.
 * <p>
 * A recording problem (a full disk, say) must never end the chat, so a failed write stops the recording and is
 * reported by {@link #error()} instead of being thrown.
 */
public final class CastRecorder implements AutoCloseable {

	private final Path				file;
	private final BufferedWriter	out;
	private final long				started		= System.nanoTime();
	private final CharsetDecoder	decoder		= StandardCharsets.UTF_8.newDecoder().onMalformedInput( CodingErrorAction.REPLACE )
	    .onUnmappableCharacter( CodingErrorAction.REPLACE );
	private byte[]					leftover	= new byte[ 0 ];
	private boolean					afterCr;
	private long					events;
	private String					error;
	private boolean					closed;

	/**
	 * @param file  where the recording goes; its folder is created when missing
	 * @param cols  the terminal's width now
	 * @param rows  the terminal's height now
	 * @param title shown by players, may be empty
	 *
	 * @throws IOException when the file cannot be created
	 */
	public CastRecorder( Path file, int cols, int rows, String title ) throws IOException {
		this.file = file;
		Path parent = file.toAbsolutePath().getParent();
		if ( parent != null ) {
			Files.createDirectories( parent );
		}
		this.out = Files.newBufferedWriter( file, StandardCharsets.UTF_8 );
		StringBuilder header = new StringBuilder( "{\"version\":2,\"width\":" ).append( cols ).append( ",\"height\":" ).append( rows )
		    .append( ",\"timestamp\":" ).append( System.currentTimeMillis() / 1000 );
		if ( title != null && !title.isEmpty() ) {
			header.append( ",\"title\":" ).append( quote( title ) );
		}
		String term = System.getenv( "TERM" );
		if ( term != null && !term.isEmpty() ) {
			header.append( ",\"env\":{\"TERM\":" ).append( quote( term ) ).append( '}' );
		}
		header.append( '}' );
		write( header.toString() );
	}

	/**
	 * Records output. Bytes may split a character across two calls; the rest waits for the next one.
	 */
	public synchronized void output( byte[] bytes, int off, int len ) {
		if ( closed || error != null || len <= 0 ) {
			return;
		}
		byte[] all = new byte[ leftover.length + len ];
		System.arraycopy( leftover, 0, all, 0, leftover.length );
		System.arraycopy( bytes, off, all, leftover.length, len );
		ByteBuffer	in		= ByteBuffer.wrap( all );
		CharBuffer	chars	= CharBuffer.allocate( all.length + 1 );
		decoder.decode( in, chars, false );
		leftover = new byte[ in.remaining() ];
		in.get( leftover );
		chars.flip();
		if ( chars.hasRemaining() ) {
			event( "o", quote( translateNewlines( chars.toString() ) ) );
		}
	}

	/**
	 * Records text that did not go through the terminal's own stream.
	 */
	public synchronized void output( String text ) {
		if ( closed || error != null || text.isEmpty() ) {
			return;
		}
		event( "o", quote( translateNewlines( text ) ) );
	}

	/**
	 * Records a window size change.
	 */
	public synchronized void resize( int cols, int rows ) {
		if ( closed || error != null ) {
			return;
		}
		event( "r", quote( cols + "x" + rows ) );
	}

	/**
	 * @return the file being written
	 */
	public Path file() {
		return file;
	}

	/**
	 * @return how many events were written, not counting the header
	 */
	public synchronized long events() {
		return events;
	}

	/**
	 * @return what went wrong, or null while the recording is healthy
	 */
	public synchronized String error() {
		return error;
	}

	@Override
	public synchronized void close() {
		if ( closed ) {
			return;
		}
		closed = true;
		try {
			out.close();
		} catch ( IOException e ) {
			if ( error == null ) {
				error = e.getMessage();
			}
		}
	}

	/** a line feed not already preceded by a carriage return gets one; a pair split across two writes stays a pair */
	private String translateNewlines( String text ) {
		StringBuilder b = new StringBuilder( text.length() + 8 );
		for ( int i = 0; i < text.length(); i++ ) {
			char c = text.charAt( i );
			if ( c == '\n' && !afterCr ) {
				b.append( '\r' );
			}
			b.append( c );
			afterCr = c == '\r';
		}
		return b.toString();
	}

	private void event( String type, String data ) {
		double seconds = ( System.nanoTime() - started ) / 1_000_000_000.0;
		write( "[" + String.format( Locale.ROOT, "%.4f", seconds ) + ",\"" + type + "\"," + data + "]" );
		events++;
	}

	private void write( String line ) {
		try {
			out.write( line );
			out.write( '\n' );
			out.flush();
		} catch ( IOException e ) {
			error = e.getMessage() == null ? e.toString() : e.getMessage();
		}
	}

	static String quote( String s ) {
		StringBuilder b = new StringBuilder( s.length() + 2 ).append( '"' );
		for ( int i = 0; i < s.length(); i++ ) {
			char c = s.charAt( i );
			switch ( c ) {
				case '"' -> b.append( "\\\"" );
				case '\\' -> b.append( "\\\\" );
				case '\n' -> b.append( "\\n" );
				case '\r' -> b.append( "\\r" );
				case '\t' -> b.append( "\\t" );
				default -> {
					if ( c < 0x20 ) {
						b.append( String.format( "\\u%04x", ( int ) c ) );
					} else {
						b.append( c );
					}
				}
			}
		}
		return b.append( '"' ).toString();
	}

}
