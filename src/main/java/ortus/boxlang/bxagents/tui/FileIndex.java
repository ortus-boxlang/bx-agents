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
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * The files under a folder, for the message box's {@code @} menu: a flat, sorted list of paths relative to the
 * folder, found by walking it (not too deep, not too many, and not the folders nobody means to mention: version
 * control, dependencies, build output, hidden folders). It holds no terminal state, so it tests on its own.
 */
final class FileIndex {

	static final int			MAX_FILES	= 5000;
	static final int			MAX_DEPTH	= 6;
	private static final Set<String>	SKIPPED	= Set.of( "node_modules", "build", "dist", "target", "out", "__pycache__", "venv" );

	private final Path			root;
	private List<String>		files		= List.of();

	FileIndex( Path root ) {
		this.root = root;
	}

	/** Walks the folder again, so files made since the last look are found. */
	void refresh() {
		List<String> found = new ArrayList<>();
		try {
			Files.walkFileTree( root, java.util.EnumSet.noneOf( java.nio.file.FileVisitOption.class ), MAX_DEPTH, new SimpleFileVisitor<>() {

				@Override
				public FileVisitResult preVisitDirectory( Path dir, BasicFileAttributes attrs ) {
					if ( dir.equals( root ) ) {
						return FileVisitResult.CONTINUE;
					}
					String name = dir.getFileName().toString();
					return name.startsWith( "." ) || SKIPPED.contains( name ) ? FileVisitResult.SKIP_SUBTREE : FileVisitResult.CONTINUE;
				}

				@Override
				public FileVisitResult visitFile( Path file, BasicFileAttributes attrs ) {
					if ( attrs.isRegularFile() && !file.getFileName().toString().startsWith( "." ) ) {
						found.add( root.relativize( file ).toString().replace( '\\', '/' ) );
					}
					return found.size() >= MAX_FILES ? FileVisitResult.TERMINATE : FileVisitResult.CONTINUE;
				}

				@Override
				public FileVisitResult visitFileFailed( Path file, IOException e ) {
					return FileVisitResult.CONTINUE;
				}
			} );
		} catch ( IOException e ) {
			// a folder that cannot be read has no files to offer
		}
		found.sort( String::compareTo );
		files = found;
	}

	/**
	 * @param query what was typed after the {@code @}; empty lists the first files
	 * @param max   the most to return
	 *
	 * @return paths containing the query, ignoring case: file names that start with it first, then paths that start with it, then the rest, shorter first
	 */
	List<String> match( String query, int max ) {
		String		q		= query.toLowerCase( Locale.ROOT );
		List<String>	named	= new ArrayList<>();
		List<String>	rooted	= new ArrayList<>();
		List<String>	other	= new ArrayList<>();
		for ( String f : files ) {
			String	lower	= f.toLowerCase( Locale.ROOT );
			String	name	= lower.substring( lower.lastIndexOf( '/' ) + 1 );
			if ( q.isEmpty() || name.startsWith( q ) ) {
				named.add( f );
			} else if ( lower.startsWith( q ) ) {
				rooted.add( f );
			} else if ( lower.contains( q ) ) {
				other.add( f );
			}
		}
		List<String> out = new ArrayList<>();
		for ( List<String> group : List.of( named, rooted, other ) ) {
			group.sort( ( a, b ) -> a.length() != b.length() ? Integer.compare( a.length(), b.length() ) : a.compareTo( b ) );
			out.addAll( group );
		}
		return out.size() > max ? out.subList( 0, max ) : out;
	}
}
