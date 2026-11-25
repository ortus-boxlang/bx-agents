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

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Common executable discovery and process startup for the CLI launchers.
 * Subclasses keep responsibility for the command line and process-specific
 * environment they need.
 */
public abstract class BaseLauncher {

	/**
	 * Represents the different ways a process can handle its input and output streams.
	 * PIPE: The process uses standard pipes for input and output.
	 * INHERIT: The process inherits the parent's IO streams.
	 * MERGED_OUTPUT: The process merges its error stream into the output stream.
	 */
	protected enum ProcessIO {
		PIPE,
		INHERIT,
		MERGED_OUTPUT
	}

	/**
	 * Searches {@code PATH} for an executable with the given base name.
	 *
	 * @param pathEnv        Folders to search, joined the way the platform joins PATH
	 * @param executableName Executable name without the Windows {@code .exe} suffix
	 *
	 * @return The absolute path to the executable, or {@code null} if not found
	 */
	protected static String findExecutableOnPath( String pathEnv, String executableName ) {
		if ( pathEnv == null || pathEnv.isBlank() ) {
			return null;
		}

		boolean	isWindows	= System.getProperty( "os.name", "" ).toLowerCase().contains( "win" );
		String	fileName	= isWindows ? executableName + ".exe" : executableName;

		for ( String dir : pathEnv.split( File.pathSeparator ) ) {
			if ( dir.isBlank() ) {
				continue;
			}
			Path candidate = Path.of( dir, fileName );
			if ( Files.isExecutable( candidate ) && !Files.isDirectory( candidate ) ) {
				return candidate.toAbsolutePath().toString();
			}
		}

		return null;
	}

	/**
	 * Starts a process after applying the launchers' shared environment,
	 * working-directory, and IO handling.
	 */
	protected static Process startProcess(
	    List<String> command,
	    Map<String, String> environment,
	    String workingDirectory,
	    ProcessIO processIO,
	    String failureMessage ) {
		try {
			ProcessBuilder builder = new ProcessBuilder( command );
			builder.environment().putAll( environment );
			if ( workingDirectory != null && !workingDirectory.isBlank() ) {
				builder.directory( new File( workingDirectory ) );
			}
			switch ( processIO ) {
				case INHERIT -> builder.inheritIO();
				case MERGED_OUTPUT -> {
					builder.redirectErrorStream( true );
					builder.redirectOutput( ProcessBuilder.Redirect.INHERIT );
				}
				case PIPE -> {
				}
			}
			return builder.start();
		} catch ( IOException e ) {
			throw new RuntimeException( failureMessage, e );
		}
	}

}
