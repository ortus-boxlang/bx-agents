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

import java.nio.file.Path;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The prompt widgets and their registry.
 */
@DisplayName( "Prompt widgets" )
class WidgetsTest {

	private static WidgetContext context() {
		WidgetContext c = new WidgetContext();
		c.agent		= "demo-assistant";
		c.profile	= "fast-model";
		c.session	= "billing questions";
		c.ctx		= "ctx ~253";
		c.user		= "ada";
		c.host		= "devbox";
		c.folder	= Path.of( System.getProperty( "user.home" ), "work", "demo" );
		c.clock		= () -> LocalDateTime.of( 2026, 10, 23, 14, 32, 59 );
		c.git		= folder -> "main*";
		return c;
	}

	private static String text( String name ) {
		return Widgets.get( name ).text( context() );
	}

	@Test
	@DisplayName( "the registry lists the widgets and every one describes itself" )
	void registry() {
		assertThat( Widgets.names() ).containsExactly( "agent", "profile", "folder", "user", "clock", "machine", "git", "date", "session", "elapsed", "ctx" )
		    .inOrder();
		for ( Widget w : Widgets.all() ) {
			assertThat( w.description() ).isNotEmpty();
			assertThat( w.example() ).isNotEmpty();
		}
		assertThat( Widgets.get( "CLOCK" ).name() ).isEqualTo( "clock" );
		assertThat( Widgets.get( "nothing" ) ).isNull();
	}

	@Test
	@DisplayName( "the plain ones show what the context holds" )
	void plain() {
		assertThat( text( "agent" ) ).isEqualTo( "demo-assistant" );
		assertThat( text( "profile" ) ).isEqualTo( "fast-model" );
		assertThat( text( "session" ) ).isEqualTo( "billing questions" );
		assertThat( text( "ctx" ) ).isEqualTo( "ctx ~253" );
		assertThat( text( "user" ) ).isEqualTo( "ada" );
		assertThat( text( "machine" ) ).isEqualTo( "devbox" );
		assertThat( text( "git" ) ).isEqualTo( "main*" );
	}

	@Test
	@DisplayName( "the clock shows hours and minutes, the date the weekday, day and month" )
	void time() {
		assertThat( text( "clock" ) ).isEqualTo( "14:32" );
		assertThat( text( "date" ) ).isEqualTo( "Fri 23 Oct" );
	}

	@Test
	@DisplayName( "the folder writes the home folder as ~" )
	void folder() {
		assertThat( text( "folder" ) ).isEqualTo( "~" + java.io.File.separator + "work" + java.io.File.separator + "demo" );
	}

	@Test
	@DisplayName( "elapsed shows the last turn in seconds, and nothing before there was one" )
	void elapsed() {
		WidgetContext c = context();
		assertThat( Widgets.get( "elapsed" ).text( c ) ).isEmpty();
		c.lastTurnMs = 4200;
		assertThat( Widgets.get( "elapsed" ).text( c ) ).isEqualTo( "last turn 4.2s" );
	}

	@Test
	@DisplayName( "an empty value hides the widget, and a long one is cut with an ellipsis" )
	void clipping() {
		WidgetContext c = context();
		c.agent = "   ";
		assertThat( Widgets.get( "agent" ).text( c ) ).isEmpty();
		c.agent = "a".repeat( 60 );
		assertThat( Widgets.get( "agent" ).text( c ).length() ).isEqualTo( 28 );
		assertThat( Widgets.get( "agent" ).text( c ) ).endsWith( "…" );
	}

	@Test
	@DisplayName( "a registered widget can be used by name" )
	void custom() {
		Widgets.register( AbstractWidget.of( "shout-test", "the agent, loud", "DEMO", c -> c.agent.toUpperCase() ) );
		assertThat( text( "shout-test" ) ).isEqualTo( "DEMO-ASSISTANT" );
	}
}
