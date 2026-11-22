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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import ortus.boxlang.bxagents.tui.TuiSettings.Layer;

@DisplayName( "TuiSettings" )
class TuiSettingsTest {

	/**
	 * A layer of settings
	 *
	 * @param name  Where they came from
	 * @param pairs Alternating setting names and values
	 *
	 * @return The layer
	 */
	private static Layer layer( String name, Object... pairs ) {
		Map<String, Object> values = new LinkedHashMap<>();
		for ( int i = 0; i < pairs.length; i += 2 ) {
			values.put( ( String ) pairs[ i ], pairs[ i + 1 ] );
		}
		return new Layer( name, values );
	}

	@Test
	@DisplayName( "with nothing set every setting has its default, from the default" )
	void defaults() {
		TuiSettings.Resolved resolved = TuiSettings.defaults();
		assertThat( resolved.bool( "fullscreen" ) ).isTrue();
		assertThat( resolved.get( "header" ) ).isEqualTo( "full" );
		assertThat( resolved.integer( "menuRows" ) ).isEqualTo( 8 );
		assertThat( resolved.source( "theme" ) ).isEqualTo( "default" );
		for ( TuiSettings.Setting s : TuiSettings.ALL ) {
			assertThat( TuiSettings.normalize( s, s.def() ) ).isEqualTo( s.def() );
		}
	}

	@Test
	@DisplayName( "a later layer wins over an earlier one, and each value remembers where it came from" )
	void layers() {
		TuiSettings.Resolved resolved = TuiSettings.resolve( List.of( layer( "Agent.yml", "fullscreen", false, "header", "compact" ),
		    layer( "your file", "fullscreen", true, "spacing", "compact" ), layer( "this agent", "fullscreen", false ) ) );
		assertThat( resolved.bool( "fullscreen" ) ).isFalse();
		assertThat( resolved.source( "fullscreen" ) ).isEqualTo( "this agent" );
		assertThat( resolved.get( "header" ) ).isEqualTo( "compact" );
		assertThat( resolved.source( "header" ) ).isEqualTo( "Agent.yml" );
		assertThat( resolved.get( "spacing" ) ).isEqualTo( "compact" );
		assertThat( resolved.source( "spacing" ) ).isEqualTo( "your file" );
		assertThat( resolved.get( "theme" ) ).isEqualTo( "auto" );
	}

	@Test
	@DisplayName( "a value the setting does not take is passed over, so the layer below it still counts" )
	void invalidValuesArePassedOver() {
		TuiSettings.Resolved resolved = TuiSettings
		    .resolve( List.of( layer( "your file", "theme", "dark", "menuRows", 12 ), layer( "this agent", "theme", "neon", "menuRows", 99, "nonsense", 1 ) ) );
		assertThat( resolved.get( "theme" ) ).isEqualTo( "dark" );
		assertThat( resolved.integer( "menuRows" ) ).isEqualTo( 12 );
		assertThat( resolved.source( "menuRows" ) ).isEqualTo( "your file" );
	}

	@Test
	@DisplayName( "true and false are read as the words people write: yes, no, on, off, in any case, and numbers within their range" )
	void normalizing() {
		TuiSettings.Setting fullscreen = TuiSettings.find( "FullScreen" );
		assertThat( TuiSettings.normalize( fullscreen, "Yes" ) ).isEqualTo( "true" );
		assertThat( TuiSettings.normalize( fullscreen, "OFF" ) ).isEqualTo( "false" );
		assertThat( TuiSettings.normalize( fullscreen, Boolean.FALSE ) ).isEqualTo( "false" );
		assertThat( TuiSettings.normalize( fullscreen, "maybe" ) ).isNull();
		TuiSettings.Setting rows = TuiSettings.find( "menuRows" );
		assertThat( TuiSettings.normalize( rows, 3 ) ).isEqualTo( "3" );
		assertThat( TuiSettings.normalize( rows, 2 ) ).isNull();
		assertThat( TuiSettings.normalize( rows, 21 ) ).isNull();
		assertThat( TuiSettings.normalize( rows, "many" ) ).isNull();
		assertThat( TuiSettings.normalize( rows, null ) ).isNull();
	}

	@Test
	@DisplayName( "problems names an unknown setting and a value out of range, and leaves the message box's prompt and widgets to its own check" )
	void problems() {
		Map<String, Object> block = new LinkedHashMap<>();
		block.put( "fullscreen", "sometimes" );
		block.put( "colour", "red" );
		block.put( "prompt", "box" );
		block.put( "widgets", Map.of() );
		block.put( "menuRows", 6 );
		List<String> problems = TuiSettings.problems( block, "Agent.yml" );
		assertThat( problems ).hasSize( 2 );
		assertThat( problems.get( 0 ) ).contains( "Agent.yml: tui.fullscreen 'sometimes' is not valid. Use one of: true, false" );
		assertThat( problems.get( 1 ) ).contains( "tui has no setting 'colour'" );
		assertThat( problems.get( 1 ) ).contains( "prompt, widgets" );
		assertThat( TuiSettings.problems( Map.of(), "x" ) ).isEmpty();
	}

	@Test
	@DisplayName( "a caller with plain maps, such as BoxLang structs, resolves the same way" )
	void resolvingMaps() {
		Map<String, Object> low = new LinkedHashMap<>();
		low.put( "name", "your file" );
		low.put( "values", Map.of( "animations", false ) );
		Map<String, Object> high = new LinkedHashMap<>();
		high.put( "NAME", "this agent" );
		high.put( "VALUES", Map.of( "Animations", true ) );
		TuiSettings.Resolved resolved = TuiSettings.resolveMaps( List.of( low, high ) );
		assertThat( resolved.bool( "animations" ) ).isTrue();
		assertThat( resolved.source( "animations" ) ).isEqualTo( "this agent" );
	}

	@Test
	@DisplayName( "every setting has a name that is unique, a sentence of what it does, and values it lists" )
	void registry() {
		assertThat( TuiSettings.ALL.stream().map( TuiSettings.Setting::name ).distinct().count() ).isEqualTo( TuiSettings.ALL.size() );
		for ( TuiSettings.Setting s : TuiSettings.ALL ) {
			assertThat( s.does() ).isNotEmpty();
			assertThat( s.allowed() ).isNotEmpty();
			assertThat( TuiSettings.LOOK ).doesNotContain( s.name() );
		}
	}

}
