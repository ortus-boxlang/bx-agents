/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
package ortus.boxlang.bxagents.util;

import static com.google.common.truth.Truth.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName( "LoopbackCallback: catches the browser's redirect after a sign in" )
class LoopbackCallbackTest {

	private final HttpClient http = HttpClient.newHttpClient();

	/**
	 * @param address The address to call
	 *
	 * @return The answer
	 */
	private HttpResponse<String> call( String address ) throws Exception {
		return this.http.send( HttpRequest.newBuilder( URI.create( address ) ).build(), HttpResponse.BodyHandlers.ofString() );
	}

	/**
	 * listens on the loopback address and hands over the query, decoded
	 */
	@Test
	@DisplayName( "listens on the loopback address and hands over the query, decoded" )
	void handsOverTheQuery() throws Exception {
		try ( LoopbackCallback listener = LoopbackCallback.start( 0, "/callback", "<p>ok</p>", "<p>no</p>" ) ) {
			assertThat( listener.redirectUri() ).startsWith( "http://127.0.0.1:" );
			assertThat( listener.redirectUri() ).endsWith( "/callback" );

			HttpResponse<String> answer = call( listener.redirectUri() + "?code=a%2Fb&state=s1&iss=https%3A%2F%2Fauth.example.com" );

			assertThat( answer.statusCode() ).isEqualTo( 200 );
			assertThat( answer.body() ).isEqualTo( "<p>ok</p>" );
			Map<String, String> query = listener.await( 5 );
			assertThat( query.get( "code" ) ).isEqualTo( "a/b" );
			assertThat( query.get( "state" ) ).isEqualTo( "s1" );
			assertThat( query.get( "iss" ) ).isEqualTo( "https://auth.example.com" );
		}
	}

	/**
	 * shows the failure page for an error and still hands the query over
	 */
	@Test
	@DisplayName( "shows the failure page for an error and still hands the query over" )
	void errorPage() throws Exception {
		try ( LoopbackCallback listener = LoopbackCallback.start( 0, "/callback", "<p>ok</p>", "<p>no</p>" ) ) {
			HttpResponse<String> answer = call( listener.redirectUri() + "?error=access_denied&state=s1" );

			assertThat( answer.statusCode() ).isEqualTo( 400 );
			assertThat( answer.body() ).isEqualTo( "<p>no</p>" );
			assertThat( listener.await( 5 ).get( "error" ) ).isEqualTo( "access_denied" );
		}
	}

	/**
	 * answers 404 for another path and keeps waiting
	 */
	@Test
	@DisplayName( "answers 404 for another path and keeps waiting" )
	void otherPath() throws Exception {
		try ( LoopbackCallback listener = LoopbackCallback.start( 0, "/callback", "ok", "no" ) ) {
			HttpResponse<String> other = call( "http://127.0.0.1:" + listener.port() + "/favicon.ico" );

			assertThat( other.statusCode() ).isEqualTo( 404 );
			assertThrows( TimeoutException.class, () -> listener.await( 1 ) );
		}
	}

	/**
	 * stops listening when closed
	 */
	@Test
	@DisplayName( "stops listening when closed" )
	void stops() throws Exception {
		LoopbackCallback	listener	= LoopbackCallback.start( 0, "/callback", "ok", "no" );
		int					port		= listener.port();
		listener.close();

		assertThrows( java.io.IOException.class, () -> call( "http://127.0.0.1:" + port + "/callback" ) );
	}

	/**
	 * takes the port it is asked for
	 */
	@Test
	@DisplayName( "takes the port it is asked for" )
	void askedPort() throws Exception {
		int free;
		try ( java.net.ServerSocket probe = new java.net.ServerSocket( 0 ) ) {
			free = probe.getLocalPort();
		}
		try ( LoopbackCallback listener = LoopbackCallback.start( free, "/cb", "ok", "no" ) ) {
			assertThat( listener.redirectUri() ).isEqualTo( "http://127.0.0.1:" + free + "/cb" );
		}
	}

}
