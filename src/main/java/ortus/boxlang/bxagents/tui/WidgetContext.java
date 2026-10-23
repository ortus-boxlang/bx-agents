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

import java.net.InetAddress;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * What the widgets can read: the facts the screen knows and the machine it runs on. A plain holder; the screen
 * updates it and a test fills it by hand.
 */
public final class WidgetContext {

	/** the agent's name */
	public String					agent		= "";
	/** the profile or model in use */
	public String					profile		= "";
	/** the conversation's name */
	public String					session		= "";
	/** the size of the context, as the screen's status line says it */
	public String					ctx			= "";
	/** the folder the chat runs in */
	public Path						folder		= Path.of( System.getProperty( "user.dir", "." ) );
	/** the person using the machine */
	public String					user		= System.getProperty( "user.name", "" );
	/** the machine's name */
	public String					host		= hostName();
	/** how long the last turn took, in milliseconds; negative before there has been one */
	public long						lastTurnMs	= -1;
	/** the current time; replaced in a test */
	public Supplier<LocalDateTime>	clock		= LocalDateTime::now;
	/** the branch of a folder, with a star when it has changes, or empty; replaced in a test */
	public Function<Path, String>	git			= GitInfo::describe;

	private static String hostName() {
		String h = System.getenv( "HOSTNAME" );
		if ( h == null || h.isBlank() ) {
			h = System.getenv( "COMPUTERNAME" );
		}
		if ( h == null || h.isBlank() ) {
			try {
				h = InetAddress.getLocalHost().getHostName();
			} catch ( Exception e ) {
				h = "";
			}
		}
		return h;
	}
}
