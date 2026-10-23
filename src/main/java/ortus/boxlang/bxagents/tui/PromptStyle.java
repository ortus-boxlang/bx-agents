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

import java.util.List;

/**
 * One look for the message box: the bars, the borders and where the hints and widgets sit. A style turns a
 * {@link PromptState} into rows and does nothing else. To add one, extend {@link AbstractPromptStyle} and register
 * it with {@link PromptStyles#register}.
 */
public interface PromptStyle {

	/** @return the name used in {@code Agent.yaml} and {@code /prompt}, lower case, such as {@code bars} */
	String name();

	/** @return one line saying what it looks like, for the wizard and {@code /prompt} */
	String description();

	/**
	 * @param state what to draw
	 * @param theme the palette
	 *
	 * @return the rows of the prompt from its top edge to its hint line
	 */
	List<Row> rows( PromptState state, Theme theme );
}
