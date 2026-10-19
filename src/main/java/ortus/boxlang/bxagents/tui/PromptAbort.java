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

/**
 * Thrown out of a prompt when the user leaves it: Esc goes back one step,
 * Ctrl+C cancels the wizard. The message is the stable token the BoxLang
 * wizard matches on ("wizard:back" or "wizard:cancel"), since a Java
 * exception reaches BoxLang as a plain error with only its message to go on.
 */
public final class PromptAbort extends RuntimeException {

	private static final long	serialVersionUID	= 1L;

	public static final String	BACK				= "wizard:back";
	public static final String	CANCEL				= "wizard:cancel";

	public PromptAbort( String kind ) {
		super( kind, null, false, false );
	}

	/** @return true when the user asked to go back a step */
	public boolean isBack() {
		return BACK.equals( getMessage() );
	}

}
