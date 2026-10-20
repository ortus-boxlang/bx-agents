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

import static com.google.common.truth.Truth.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The asciicast file: its header, its events, and the cases where bytes do not line up with characters.
 */
@DisplayName( "Cast recorder" )
class CastRecorderTest {

	@TempDir
	Path dir;

	private List<String> lines( Path file ) throws IOException {
		return Files.readAllLines( file, StandardCharsets.UTF_8 );
	}

	private static byte[] bytes( String s ) {
		return s.getBytes( StandardCharsets.UTF_8 );
	}

	@Test
	@DisplayName( "writes a version 2 header with the size and title" )
	void header() throws Exception {
		Path file = dir.resolve( "a.cast" );
		try ( CastRecorder r = new CastRecorder( file, 100, 30, "my demo" ) ) {
			assertThat( r.file() ).isEqualTo( file );
		}
		String header = lines( file ).get( 0 );
		assertThat( header ).startsWith( "{\"version\":2,\"width\":100,\"height\":30,\"timestamp\":" );
		assertThat( header ).contains( "\"title\":\"my demo\"" );
	}

	@Test
	@DisplayName( "writes output and resize events with rising times" )
	void events() throws Exception {
		Path file = dir.resolve( "b.cast" );
		try ( CastRecorder r = new CastRecorder( file, 80, 24, "" ) ) {
			byte[] hi = bytes( "hi" );
			r.output( hi, 0, hi.length );
			r.resize( 120, 40 );
			r.output( "text" );
			assertThat( r.events() ).isEqualTo( 3 );
		}
		List<String> all = lines( file );
		assertThat( all ).hasSize( 4 );
		assertThat( all.get( 1 ) ).containsMatch( "^\\[\\d+\\.\\d{4},\"o\",\"hi\"\\]$" );
		assertThat( all.get( 2 ) ).containsMatch( "^\\[\\d+\\.\\d{4},\"r\",\"120x40\"\\]$" );
		assertThat( all.get( 3 ) ).containsMatch( "^\\[\\d+\\.\\d{4},\"o\",\"text\"\\]$" );
	}

	@Test
	@DisplayName( "escapes quotes, backslashes and control characters" )
	void escapes() throws Exception {
		Path file = dir.resolve( "c.cast" );
		try ( CastRecorder r = new CastRecorder( file, 80, 24, "" ) ) {
			r.output( "a\"b\\c\r\n\t\u001b[0m" );
		}
		assertThat( lines( file ).get( 1 ) ).endsWith( ",\"o\",\"a\\\"b\\\\c\\r\\n\\t\\u001b[0m\"]" );
	}

	@Test
	@DisplayName( "keeps a character whole when its bytes arrive in two writes" )
	void splitCharacter() throws Exception {
		Path	file	= dir.resolve( "d.cast" );
		byte[]	pound	= bytes( "£" );
		try ( CastRecorder r = new CastRecorder( file, 80, 24, "" ) ) {
			r.output( pound, 0, 1 );
			r.output( pound, 1, 1 );
		}
		List<String> all = lines( file );
		assertThat( all ).hasSize( 2 );
		assertThat( all.get( 1 ) ).endsWith( ",\"o\",\"£\"]" );
	}

	@Test
	@DisplayName( "records a line feed as the carriage return and line feed the screen received" )
	void newlines() throws Exception {
		Path file = dir.resolve( "f.cast" );
		try ( CastRecorder r = new CastRecorder( file, 80, 24, "" ) ) {
			r.output( "a\nb\r\nc" );
			r.output( "d\r" );
			r.output( "\ne" );
		}
		List<String> all = lines( file );
		assertThat( all.get( 1 ) ).endsWith( ",\"o\",\"a\\r\\nb\\r\\nc\"]" );
		assertThat( all.get( 3 ) ).endsWith( ",\"o\",\"\\ne\"]" );
	}

	@Test
	@DisplayName( "creates the folder and stops writing after close" )
	void closes() throws Exception {
		Path			file	= dir.resolve( "nested/deeper/e.cast" );
		CastRecorder	r		= new CastRecorder( file, 80, 24, "" );
		r.output( "one" );
		r.close();
		r.output( "two" );
		r.close();
		assertThat( lines( file ) ).hasSize( 2 );
		assertThat( r.error() ).isNull();
	}

}
