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

import java.nio.file.Path;

import ortus.boxlang.runtime.context.IBoxContext;
import ortus.boxlang.runtime.interop.DynamicObject;
import ortus.boxlang.runtime.runnables.IBoxRunnable;
import ortus.boxlang.runtime.runnables.RunnableLoader;
import ortus.boxlang.runtime.util.ResolvedFilePath;

/**
 * Instantiates a BoxLang class (`.bx` file) from an arbitrary, absolute filesystem
 * path that is NOT under any registered BoxLang mapping - e.g. a user's project
 * `Agent.bx`, or a discovered `tools/*.bx`/`skills/*.bx` file, at build time.
 * <p>
 * BX Agents' own build pipeline runs against project directories chosen by the
 * user at build time, which have no reason to live under this module's own
 * classpath/mappings, so the normal `new`/`createObject( "component", ... )`
 * dotted-path resolution can't reach them. This uses {@link RunnableLoader}
 * directly, the same primitive the BoxLang runtime itself uses internally for
 * lazy class compilation, so no mapping registration is required.
 */
public class DynamicClassLoader {

	/**
	 * Instantiate a BoxLang class from an absolute `.bx` file path, using its
	 * no-argument pseudo-constructor.
	 *
	 * @param absolutePath The absolute filesystem path to the `.bx` file
	 * @param context      The current BoxLang execution context
	 *
	 * @return The instantiated class, ready to be invoked from BoxLang code
	 */
	@SuppressWarnings( "unchecked" )
	public static Object instantiate( String absolutePath, IBoxContext context ) {
		ResolvedFilePath			resolvedFilePath	= ResolvedFilePath.of( Path.of( absolutePath ) );
		Class<IBoxRunnable>			clazz				= ( Class<IBoxRunnable> ) RunnableLoader.getInstance().loadClass( resolvedFilePath, context );

		return DynamicObject.of( clazz ).invokeConstructor( context ).getTargetInstance();
	}

}
