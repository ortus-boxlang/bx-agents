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

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName( "Logo and Theme" )
class LogoTest {

	@Test
	@DisplayName( "the name has a row for each line of the drawing, every row as wide as the drawing, and only full blocks and spaces, like the runtime's banner" )
	void shape() {
		List<Row> rows = Logo.rows( Theme.detect( null, "xterm-256color", "truecolor" ) );
		assertThat( rows ).hasSize( Logo.height() );
		for ( Row r : rows ) {
			assertThat( r.width() ).isEqualTo( Logo.width() );
			assertThat( r.plainText().chars().allMatch( c -> c == ' ' || c == '█' ) ).isTrue();
		}
		assertThat( Logo.height() ).isEqualTo( 5 );
		assertThat( Logo.width() ).isAtMost( 72 );
	}

	@Test
	@DisplayName( "the light theme uses darker colours than the dark one, and auto goes by COLORFGBG" )
	void themes() {
		Theme	dark	= Theme.detect( null, "xterm", "truecolor", "dark", null );
		Theme	light	= Theme.detect( null, "xterm", "truecolor", "light", null );
		assertThat( light.accent ).isNotEqualTo( dark.accent );
		assertThat( Theme.detect( null, "xterm", "truecolor", "auto", "0;15" ).accent ).isEqualTo( light.accent );
		assertThat( Theme.detect( null, "xterm", "truecolor", "auto", "15;0" ).accent ).isEqualTo( dark.accent );
		assertThat( Theme.detect( null, "xterm", "truecolor", "auto", null ).accent ).isEqualTo( dark.accent );
		assertThat( Theme.detect( "1", "xterm", "truecolor", "light", null ).hasColor() ).isFalse();
	}

	@Test
	@DisplayName( "the gradient goes from the accent to the ok colour where there is true colour, and is one of the two where there is less" )
	void gradient() {
		Theme truecolor = Theme.detect( null, "xterm", "truecolor", "dark", null );
		assertThat( truecolor.gradient( 0 ) ).isEqualTo( truecolor.accent );
		assertThat( truecolor.gradient( 1 ) ).isEqualTo( truecolor.ok );
		assertThat( truecolor.gradient( 0.5 ) ).isNotEqualTo( truecolor.accent );
		Theme basic = Theme.detect( null, "xterm", null, "dark", null );
		assertThat( basic.gradient( 0.2 ) ).isEqualTo( basic.accent );
		assertThat( basic.gradient( 0.8 ) ).isEqualTo( basic.ok );
	}

}
