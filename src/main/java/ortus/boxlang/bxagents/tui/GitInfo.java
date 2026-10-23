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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * The branch of a folder for the {@code git} widget, found by asking the {@code git} program and remembered for a few
 * seconds, so redrawing the prompt never waits on it. Empty when the folder is not a repository or git is missing.
 */
final class GitInfo {

	private static final long					KEEP_MS	= 5000;

	private record Found( String text, long at ) {
	}

	private static final Map<Path, Found> CACHE = new ConcurrentHashMap<>();

	private GitInfo() {
	}

	/**
	 * @param folder a folder
	 *
	 * @return {@code main}, or {@code main*} when the working tree has changes; empty when there is no branch to show
	 */
	static String describe( Path folder ) {
		Found known = CACHE.get( folder );
		if ( known != null && System.currentTimeMillis() - known.at < KEEP_MS ) {
			return known.text;
		}
		String text = ask( folder );
		CACHE.put( folder, new Found( text, System.currentTimeMillis() ) );
		return text;
	}

	private static String ask( Path folder ) {
		String branch = run( folder, "rev-parse", "--abbrev-ref", "HEAD" );
		if ( branch.isEmpty() ) {
			return "";
		}
		return run( folder, "status", "--porcelain" ).isEmpty() ? branch : branch + "*";
	}

	private static String run( Path folder, String... args ) {
		String[] command = new String[ args.length + 1 ];
		command[ 0 ] = "git";
		System.arraycopy( args, 0, command, 1, args.length );
		try {
			Process p = new ProcessBuilder( command ).directory( folder.toFile() ).redirectErrorStream( false ).start();
			p.getErrorStream().close();
			String out = new String( p.getInputStream().readAllBytes(), StandardCharsets.UTF_8 ).strip();
			if ( !p.waitFor( 800, TimeUnit.MILLISECONDS ) ) {
				p.destroyForcibly();
				return "";
			}
			return p.exitValue() == 0 ? out : "";
		} catch ( IOException | InterruptedException e ) {
			if ( e instanceof InterruptedException ) {
				Thread.currentThread().interrupt();
			}
			return "";
		}
	}
}
