/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain a
 * copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
package ortus.boxlang.bxagents.build;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Starts the local terminal chat in a separate BoxLang CLI process, configured
 * with the built app's runtime config and home.
 */
public class BoxLangCliLauncher extends BaseLauncher {

	/**
	 * Environment variable used to indicate that the chat is running as a child process.
	 */
	private static final String CHAT_CHILD_ENV = "BXAGENTS_INTERNAL_CHAT_CHILD";

	/**
	 * Searches {@code PATH} for the BoxLang CLI executable.
	 *
	 * @return The absolute path to the executable, or {@code null} if not found on PATH
	 */
	public static String findExecutable() {
		return findExecutable( System.getenv( "PATH" ) );
	}

	/**
	 * Searches the given folders for the BoxLang CLI executable.
	 *
	 * @param pathEnv The folders to search, joined the way the platform joins PATH
	 *
	 * @return The absolute path to the executable, or {@code null} if not found
	 */
	public static String findExecutable( String pathEnv ) {
		return findExecutableOnPath( pathEnv, "boxlang" );
	}

	/**
	 * Starts the BoxLang CLI with a module command and the project-specific runtime settings.
	 *
	 * @param executablePath   Absolute path to the BoxLang CLI executable
	 * @param configPath       Absolute path to the runtime's boxlang.json
	 * @param runtimeHome      Absolute path to this project's BoxLang home
	 * @param workingDirectory The folder to start the CLI in
	 * @param arguments        Module command arguments, beginning with the verb
	 * @param environment      Extra variables for the child process; may be empty
	 * @param inheritIO        When true, the child shares this process's stdin/stdout/stderr
	 *
	 * @return The started {@link Process}
	 */
	public static Process launch(
	    String executablePath,
	    String configPath,
	    String runtimeHome,
	    String workingDirectory,
	    List<String> arguments,
	    Map<String, String> environment,
	    boolean inheritIO ) {
		List<String> command = new ArrayList<>();
		command.add( executablePath );
		command.add( "--bx-config" );
		command.add( configPath );
		command.add( "module:bxagents" );
		command.addAll( arguments );

		Map<String, String> childEnvironment = new HashMap<>( environment );
		childEnvironment.put( "BOXLANG_HOME", runtimeHome );
		childEnvironment.put( CHAT_CHILD_ENV, "1" );
		return startProcess(
		    command,
		    childEnvironment,
		    workingDirectory,
		    inheritIO ? ProcessIO.INHERIT : ProcessIO.PIPE,
		    "Failed to launch the BoxLang CLI at [" + executablePath + "] with config [" + configPath + "]"
		);
	}

}
