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

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import com.sun.net.httpserver.HttpServer;

/**
 * Catches the one redirect a provider sends the browser to after a person signs in, for a terminal that has no public
 * address (<code>bxAgents connect</code>, the chat's <code>/connect</code>).
 *
 * It listens on <code>127.0.0.1</code> only, on a free port (or the one you ask for), answers the first request to its
 * path with a small page, hands the query to whoever is waiting, and stops. Requests to any other path get a 404 and do
 * not end the wait. Providers that follow RFC 8252 accept any port on the loopback address; for one that does not, ask
 * for the port you registered.
 *
 * <pre>
 * try ( LoopbackCallback listener = LoopbackCallback.start( 0, "/callback", okPage, failPage ) ) {
 *     String redirectUri = listener.redirectUri();
 *     Map&lt;String, String&gt; query = listener.await( 300 );
 * }
 * </pre>
 */
public final class LoopbackCallback implements AutoCloseable {

	private final HttpServer								server;
	private final String									path;
	private final CompletableFuture<Map<String, String>>	received	= new CompletableFuture<>();

	private LoopbackCallback( HttpServer server, String path ) {
		this.server	= server;
		this.path	= path;
	}

	/**
	 * Starts listening.
	 *
	 * @param port         The port, 0 for any free one
	 * @param path         The path of the callback, such as <code>/callback</code>
	 * @param connected    The page to show when the provider sent the person back with a code
	 * @param notConnected The page to show when it sent them back with an error
	 *
	 * @return The running listener
	 *
	 * @throws IOException when the port cannot be opened
	 */
	public static LoopbackCallback start( int port, String path, String connected, String notConnected ) throws IOException {
		HttpServer			server		= HttpServer.create( new InetSocketAddress( InetAddress.getLoopbackAddress(), port ), 0 );
		LoopbackCallback	listener	= new LoopbackCallback( server, path );
		server.createContext( "/", exchange -> {
			try {
				if ( !exchange.getRequestURI().getPath().equals( path ) ) {
					exchange.sendResponseHeaders( 404, -1 );
					return;
				}
				Map<String, String>	query	= parse( exchange.getRequestURI().getRawQuery() );
				String				page	= query.containsKey( "error" ) ? notConnected : connected;
				byte[]				bytes	= page.getBytes( StandardCharsets.UTF_8 );
				exchange.getResponseHeaders().set( "Content-Type", "text/html; charset=utf-8" );
				exchange.getResponseHeaders().set( "Cache-Control", "no-store" );
				exchange.sendResponseHeaders( query.containsKey( "error" ) ? 400 : 200, bytes.length );
				exchange.getResponseBody().write( bytes );
				listener.received.complete( query );
			} finally {
				exchange.close();
			}
		} );
		server.start();
		return listener;
	}

	/**
	 * @return The address to register as the callback and give to the sign in: http://127.0.0.1:PORT/path
	 */
	public String redirectUri() {
		return "http://127.0.0.1:" + this.server.getAddress().getPort() + this.path;
	}

	/**
	 * @return The port in use
	 */
	public int port() {
		return this.server.getAddress().getPort();
	}

	/**
	 * Waits for the redirect.
	 *
	 * @param seconds How long to wait
	 *
	 * @return The query the provider sent: code, state, iss, or error and error_description
	 *
	 * @throws TimeoutException when nobody came back in time
	 */
	public Map<String, String> await( int seconds ) throws TimeoutException, InterruptedException {
		try {
			return this.received.get( seconds, TimeUnit.SECONDS );
		} catch ( java.util.concurrent.ExecutionException e ) {
			throw new IllegalStateException( e.getCause() );
		}
	}

	/**
	 * Stops listening.
	 */
	@Override
	public void close() {
		this.server.stop( 0 );
	}

	/**
	 * @param raw The raw query string, or null
	 *
	 * @return Its pairs, decoded
	 */
	static Map<String, String> parse( String raw ) {
		Map<String, String> pairs = new LinkedHashMap<>();
		if ( raw == null || raw.isEmpty() ) {
			return pairs;
		}
		for ( String part : raw.split( "&" ) ) {
			int		eq		= part.indexOf( '=' );
			String	name	= URLDecoder.decode( eq < 0 ? part : part.substring( 0, eq ), StandardCharsets.UTF_8 );
			String	value	= eq < 0 ? "" : URLDecoder.decode( part.substring( eq + 1 ), StandardCharsets.UTF_8 );
			pairs.put( name, value );
		}
		return pairs;
	}

}
