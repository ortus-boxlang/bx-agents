// What the generated web UI gets as globals: marked, DOMPurify and hljs (core plus the languages below).
// BoxLang and CFML are not here: their word lists live in ortus.boxlang.bxagents.tui.Grammars.words()
// and WebUiGenerator turns them into a grammar when it writes the page.
import { marked } from "marked"
import DOMPurify from "dompurify"
import hljs from "highlight.js/lib/core"

import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import diff from "highlight.js/lib/languages/diff"
import dockerfile from "highlight.js/lib/languages/dockerfile"
import go from "highlight.js/lib/languages/go"
import ini from "highlight.js/lib/languages/ini"
import java from "highlight.js/lib/languages/java"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import kotlin from "highlight.js/lib/languages/kotlin"
import markdown from "highlight.js/lib/languages/markdown"
import properties from "highlight.js/lib/languages/properties"
import python from "highlight.js/lib/languages/python"
import rust from "highlight.js/lib/languages/rust"
import shell from "highlight.js/lib/languages/shell"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"

const languages = { bash, css, diff, dockerfile, go, ini, java, javascript, json, kotlin, markdown, properties, python, rust, shell, sql, typescript, xml, yaml }
for ( const [ name, definition ] of Object.entries( languages ) ) {
	hljs.registerLanguage( name, definition )
}
hljs.registerAliases( [ "toml" ], { languageName: "ini" } )
hljs.registerAliases( [ "html", "svg" ], { languageName: "xml" } )

globalThis.marked = marked
globalThis.DOMPurify = DOMPurify
globalThis.hljs = hljs
