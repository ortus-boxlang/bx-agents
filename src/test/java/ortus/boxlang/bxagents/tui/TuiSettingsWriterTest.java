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
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName( "TuiSettingsWriter" )
class TuiSettingsWriterTest {

	/**
	 * A scratch folder, removed after each test
	 */
	@TempDir
	Path dir;

	/**
	 * Write a file
	 *
	 * @param name  the file name
	 * @param lines the lines, joined with a line break
	 *
	 * @return the path
	 *
	 * @throws IOException when it cannot be written
	 */
	private Path file( String name, String... lines ) throws IOException {
		Path file = dir.resolve( name );
		Files.writeString( file, String.join( "\n", lines ) + "\n" );
		return file;
	}

	@Test
	@DisplayName( "a file that is not there is made, with its folder, holding the tui block" )
	void makesTheFile() throws IOException {
		Path file = dir.resolve( "home" ).resolve( "agent" ).resolve( "Agent.yml" );
		TuiSettingsWriter.set( file, "fullscreen", "false" );
		assertThat( Files.readString( file ) ).isEqualTo( "tui:\n  fullscreen: false\n" );
	}

	@Test
	@DisplayName( "a file with other sections gets the block at the end, and nothing else changes" )
	void appendsTheBlock() throws IOException {
		Path file = file( "Agent.yml", "chat:", "  shell: false   # no shell", "extensions:", "  disable: [ roll ]" );
		TuiSettingsWriter.set( file, "header", "compact" );
		assertThat( Files.readString( file ) ).isEqualTo( "chat:\n  shell: false   # no shell\nextensions:\n  disable: [ roll ]\n\ntui:\n  header: compact\n" );
	}

	@Test
	@DisplayName( "a setting that is there changes its value and keeps the comment on its line, and the others stay" )
	void changesInPlace() throws IOException {
		Path file = file( "s.yml", "# mine", "tui:", "  fullscreen: true   # I like it", "  header: full", "chat:", "  shell: true" );
		TuiSettingsWriter.set( file, "fullscreen", "false" );
		assertThat( Files.readString( file ) ).isEqualTo( "# mine\ntui:\n  fullscreen: false   # I like it\n  header: full\nchat:\n  shell: true\n" );
	}

	@Test
	@DisplayName( "a setting that is not there is added at the end of the block, with the indent the block has, before the next section" )
	void addsToTheBlock() throws IOException {
		Path file = file( "s.yml", "tui:", "    prompt: box", "    widgets:", "      top: [ agent ]", "", "chat:", "  shell: true" );
		TuiSettingsWriter.set( file, "spacing", "compact" );
		assertThat( Files.readString( file ) )
		    .isEqualTo( "tui:\n    prompt: box\n    widgets:\n      top: [ agent ]\n    spacing: compact\n\nchat:\n  shell: true\n" );
	}

	@Test
	@DisplayName( "a setting under widgets is not mistaken for the setting of the same name directly under tui" )
	void onlyDirectChildren() throws IOException {
		Path file = file( "s.yml", "tui:", "  widgets:", "    top: [ a ]", "  top: x" );
		assertThat( TuiSettingsWriter.remove( file, "bottom" ) ).isFalse();
		TuiSettingsWriter.set( file, "top", "y" );
		assertThat( Files.readString( file ) ).isEqualTo( "tui:\n  widgets:\n    top: [ a ]\n  top: y\n" );
	}

	@Test
	@DisplayName( "removing a setting takes its line out, and the tui line too when nothing is left under it" )
	void removes() throws IOException {
		Path file = file( "s.yml", "chat:", "  shell: true", "tui:", "  fullscreen: false", "  header: compact" );
		assertThat( TuiSettingsWriter.remove( file, "fullscreen" ) ).isTrue();
		assertThat( Files.readString( file ) ).isEqualTo( "chat:\n  shell: true\ntui:\n  header: compact\n" );
		assertThat( TuiSettingsWriter.remove( file, "header" ) ).isTrue();
		assertThat( Files.readString( file ) ).isEqualTo( "chat:\n  shell: true\n" );
		assertThat( TuiSettingsWriter.remove( file, "header" ) ).isFalse();
		assertThat( TuiSettingsWriter.remove( dir.resolve( "none.yml" ), "header" ) ).isFalse();
	}

	@Test
	@DisplayName( "a tui block written on one line is refused with a reason, and the file is left alone" )
	void refusesFlowStyle() throws IOException {
		Path	file	= file( "s.yml", "tui: { fullscreen: false }" );
		var		e		= assertThrows( IOException.class, () -> TuiSettingsWriter.set( file, "header", "compact" ) );
		assertThat( e.getMessage() ).contains( "on one line" );
		assertThat( Files.readString( file ) ).isEqualTo( "tui: { fullscreen: false }\n" );
	}

	@Test
	@DisplayName( "a setting with an empty value is given one" )
	void emptyValue() throws IOException {
		Path file = file( "s.yml", "tui:", "  header:" );
		TuiSettingsWriter.set( file, "header", "hidden" );
		assertThat( Files.readString( file ) ).isEqualTo( "tui:\n  header: hidden\n" );
	}

}
