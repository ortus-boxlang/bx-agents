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
 * One small fact shown in the prompt: the folder you are in, the clock, the agent's name. To add one, extend
 * {@link AbstractWidget} and register it with {@link Widgets#register}.
 */
public interface Widget {

	/** @return the name used in {@code Agent.yaml} and {@code /prompt}, lower case, such as {@code folder} */
	String name();

	/** @return what it shows, in a few words, for the wizard and {@code /prompt} */
	String description();

	/** @return a sample of its text, for the wizard and {@code /prompt} */
	String example();

	/**
	 * @param context what the screen knows
	 *
	 * @return the text, or an empty string when there is nothing to show, which hides the widget
	 */
	String text( WidgetContext context );
}
