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

import static com.google.common.truth.Truth.assertWithMessage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName( "The settings table of the terminal UI guide" )
class TuiSettingsDocsTest {

	@Test
	@DisplayName( "has a row for every setting of the registry, with the values it takes and its default first, so the guide cannot drift from the code" )
	void everySettingIsDocumented() throws IOException {
		List<String> lines = Files.readAllLines( Path.of( "docs", "guides", "terminal-ui.md" ) );
		for ( TuiSettings.Setting s : TuiSettings.ALL ) {
			String row = lines.stream().filter( l -> l.startsWith( "| `" + s.name() + "` |" ) ).findFirst().orElse( null );
			assertWithMessage( "the guide has no row for the setting " + s.name() ).that( row ).isNotNull();
			String values = row.split( "\\|" )[ 2 ];
			switch ( s.kind() ) {
				case INT :
					assertWithMessage( s.name() ).that( values ).contains( "`" + s.def() + "` (" + s.min() + " to " + s.max() + ")" );
					break;
				case BOOL :
					assertWithMessage( s.name() ).that( values.strip() )
					    .isEqualTo( "`" + s.def() + "`, `" + ( "true".equals( s.def() ) ? "false" : "true" ) + "`" );
					break;
				default :
					String expected = String.join( ", ", s.choices().stream().map( c -> "`" + c + "`" ).toList() );
					assertWithMessage( s.name() ).that( values.strip() ).isEqualTo( expected );
					break;
			}
		}
	}

}
