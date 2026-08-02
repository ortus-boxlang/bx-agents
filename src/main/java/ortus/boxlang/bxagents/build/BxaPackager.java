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
package ortus.boxlang.bxagents.build;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Packages a generated ColdBox app directory (`.build/app/`) into a
 * deterministic, portable `.bxa` (zip) artifact, plus a sibling `.sha256`
 * checksum file - Build Pipeline Phase 6 (M11).
 * <p>
 * Determinism (byte-identical output for byte-identical input, run to run):
 * entries are added in a fixed (sorted, relative-path) order, and every
 * entry's timestamp/CRC/size are set explicitly rather than left to
 * filesystem mtimes, which would otherwise vary between builds.
 * <p>
 * Dotfiles and `.env`/`.env.*` files are hard-excluded here regardless of
 * `.bxaignore` (belt-and-suspenders against a project accidentally shipping
 * secrets) - `.bxaignore` (simple one-glob-per-line, `#`-comments, blank
 * lines ignored) adds further project-specific exclusions on top.
 */
public class BxaPackager {

	private static final long				FIXED_ENTRY_TIME	= 0L;

	/**
	 * Packages {@code appDir} into {@code distDir/baseName.bxa}, writing a
	 * sibling {@code distDir/baseName.bxa.sha256} containing the hex SHA-256
	 * digest of the zip's bytes.
	 *
	 * @param appDir     Absolute path to the generated app directory to package
	 * @param distDir    Absolute path to the output directory (created if missing)
	 * @param baseName   The artifact's base file name, e.g. "my-agent-1.0.0" (no extension)
	 * @param ignorePatterns Additional glob patterns (from `.bxaignore`) to exclude, relative to appDir
	 *
	 * @return The absolute path to the written `.bxa` file
	 */
	public static Path pack( String appDir, String distDir, String baseName, List<String> ignorePatterns ) {
		try {
			Path appPath	= Path.of( appDir );
			Path distPath	= Path.of( distDir );
			Files.createDirectories( distPath );

			Path bxaPath	= distPath.resolve( baseName + ".bxa" );
			byte[] zipBytes	= buildZipBytes( appPath, ignorePatterns );
			Files.write( bxaPath, zipBytes );

			String digest	= sha256Hex( zipBytes );
			Path shaPath	= distPath.resolve( baseName + ".bxa.sha256" );
			Files.writeString( shaPath, digest + "  " + baseName + ".bxa" + System.lineSeparator(), StandardCharsets.UTF_8 );

			return bxaPath;
		} catch ( IOException e ) {
			throw new RuntimeException( "Failed to package [" + appDir + "] into [" + distDir + "]", e );
		}
	}

	/**
	 * Computes the hex SHA-256 digest of a `.bxa` file already on disk -
	 * exposed separately so callers can independently verify a `.sha256`
	 * file without re-packaging.
	 */
	public static String sha256Hex( byte[] bytes ) {
		try {
			MessageDigest	digest	= MessageDigest.getInstance( "SHA-256" );
			byte[]			hash	= digest.digest( bytes );
			StringBuilder	sb		= new StringBuilder( hash.length * 2 );
			for ( byte b : hash ) {
				sb.append( String.format( "%02x", b ) );
			}
			return sb.toString();
		} catch ( NoSuchAlgorithmException e ) {
			// SHA-256 is guaranteed available on every JVM - unreachable in practice
			throw new RuntimeException( e );
		}
	}

	private static byte[] buildZipBytes( Path appPath, List<String> ignorePatterns ) throws IOException {
		List<Pattern> compiledIgnores = new ArrayList<>();
		for ( String glob : ignorePatterns ) {
			compiledIgnores.add( globToPattern( glob ) );
		}

		List<Path> files = new ArrayList<>();
		try ( var walk = Files.walk( appPath ) ) {
			walk.filter( Files::isRegularFile ).forEach( files::add );
		}

		List<String> relativePaths = new ArrayList<>();
		for ( Path file : files ) {
			relativePaths.add( toRelativeUnixPath( appPath, file ) );
		}
		relativePaths.sort( Comparator.naturalOrder() );

		java.io.ByteArrayOutputStream byteStream = new java.io.ByteArrayOutputStream();
		try ( ZipOutputStream zip = new ZipOutputStream( byteStream, StandardCharsets.UTF_8 ) ) {
			for ( String relativePath : relativePaths ) {
				if ( isExcluded( relativePath, compiledIgnores ) ) {
					continue;
				}

				byte[] content = Files.readAllBytes( appPath.resolve( relativePath ) );
				writeEntry( zip, relativePath, content );
			}
		}

		return byteStream.toByteArray();
	}

	private static void writeEntry( ZipOutputStream zip, String relativePath, byte[] content ) throws IOException {
		ZipEntry entry = new ZipEntry( relativePath );
		entry.setTime( FIXED_ENTRY_TIME );
		entry.setMethod( ZipEntry.STORED );
		entry.setSize( content.length );
		entry.setCompressedSize( content.length );
		CRC32 crc = new CRC32();
		crc.update( content );
		entry.setCrc( crc.getValue() );

		zip.putNextEntry( entry );
		zip.write( content );
		zip.closeEntry();
	}

	/**
	 * Hard-excludes dotfiles/`.env`* regardless of `.bxaignore`, then applies
	 * any additional project-declared ignore globs.
	 */
	private static boolean isExcluded( String relativePath, List<Pattern> ignorePatterns ) {
		for ( String segment : relativePath.split( "/" ) ) {
			if ( segment.startsWith( "." ) ) {
				return true;
			}
		}

		for ( Pattern pattern : ignorePatterns ) {
			if ( pattern.matcher( relativePath ).matches() ) {
				return true;
			}
		}

		return false;
	}

	private static String toRelativeUnixPath( Path root, Path file ) {
		return root.relativize( file ).toString().replace( '\\', '/' );
	}

	/**
	 * Translates a simple glob (`*` = any run of characters, `?` = one
	 * character, everything else literal) into a regex Pattern matched
	 * against a `/`-separated relative path.
	 */
	private static Pattern globToPattern( String glob ) {
		StringBuilder regex = new StringBuilder();
		for ( char c : glob.toCharArray() ) {
			switch ( c ) {
				case '*' -> regex.append( ".*" );
				case '?' -> regex.append( "." );
				case '.' -> regex.append( "\\." );
				default -> {
					if ( "\\^$|()[]{}+".indexOf( c ) >= 0 ) {
						regex.append( '\\' );
					}
					regex.append( c );
				}
			}
		}
		return Pattern.compile( regex.toString() );
	}

}
