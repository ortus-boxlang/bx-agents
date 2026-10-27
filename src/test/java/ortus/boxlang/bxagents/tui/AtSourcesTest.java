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
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName( "AtSources: extension sources in the @ menu" )
class AtSourcesTest {

	@Test
	@DisplayName( "offers a source's name with its colon, ahead of files" )
	void offersNames() {
		AtSources sources = new AtSources( List.of( "jira", "notion" ), ( name, query ) -> List.of() );
		assertThat( sources.matches( "ji", List.of( "src/jig.bx" ), 6 ) ).containsExactly( "jira:", "src/jig.bx" ).inOrder();
		assertThat( sources.matches( "", List.of( "a.txt" ), 6 ) ).containsExactly( "jira:", "notion:", "a.txt" ).inOrder();
	}

	@Test
	@DisplayName( "asks the source for values after the colon, and quotes one with a space" )
	void suggestsValues() {
		AtSources sources = new AtSources( List.of( "jira" ), ( name, query ) -> List.of( query + "-1", query + " two" ) );
		assertThat( sources.matches( "JIRA:AB", List.of(), 6 ) ).containsExactly( "jira:AB-1", "jira:\"AB two\"" ).inOrder();
	}

	@Test
	@DisplayName( "falls back to files when the word before the colon is not a source" )
	void unknownName() {
		AtSources sources = new AtSources( List.of( "jira" ), ( name, query ) -> List.of( "x" ) );
		assertThat( sources.matches( "c:\\dir", List.of( "c:\\dir\\a.txt" ), 6 ) ).containsExactly( "c:\\dir\\a.txt" );
	}

	@Test
	@DisplayName( "keeps the last answer while the same thing is typed, and gives none when the extension throws" )
	void cachesAndSurvives() {
		AtomicInteger	asked	= new AtomicInteger();
		AtSources		sources	= new AtSources( List.of( "jira" ), ( name, query ) -> {
									asked.incrementAndGet();
									if ( query.equals( "boom" ) ) {
										throw new IllegalStateException( "nope" );
									}
									return List.of( "A" );
								} );
		sources.matches( "jira:x", List.of(), 6 );
		sources.matches( "jira:x", List.of(), 6 );
		sources.matches( "jira:x", List.of(), 6 );
		assertThat( asked.get() ).isEqualTo( 1 );
		assertThat( sources.matches( "jira:boom", List.of(), 6 ) ).isEmpty();
	}

}
