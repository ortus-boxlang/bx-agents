# BxAgents Contributing Guide

Hola amigo! I'm really excited that you are interested in contributing to our BoxLang Module.
Before submitting your contribution, please make sure to take a moment and read through the following guidelines:

-   [Code Of Conduct](#code-of-conduct)
-   [Bug Reporting](#bug-reporting)
-   [Support Questions](#support-questions)
-   [Pull Request Guidelines](#pull-request-guidelines)
-   [Security Vulnerabilities](#security-vulnerabilities)
-   [Development Setup](#development-setup)
-   [Language Compatiblity](#language-compatiblity)
-   [Coding Styles \& Formatting](#coding-styles--formatting)
-   [Financial Contributions](#financial-contributions)
-   [Contributors](#contributors)

## Code Of Conduct

This project is open source, and as such, the maintainers give their free time to build and maintain the source code held within. They make the code freely available in the hope that it will be of use to other developers and/or businesses. Please be considerate towards maintainers when raising issues or presenting pull requests. **We all follow the Golden Rule: Do to others as you want them to do to you.**

-   As contributors and maintainers of this project, we pledge to respect all people who contribute through reporting issues, posting feature requests, updating documentation, submitting pull requests or patches, and other activities.
-   Participants will be tolerant of opposing views.
-   Examples of unacceptable behavior by participants include the use of sexual language or imagery, derogatory comments or personal attacks, trolling, public or private harassment, insults, or other unprofessional conduct.
-   Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned with this Code of Conduct. Project maintainers who do not follow the Code of Conduct may be removed from the project team.
-   When interpreting the words and actions of others, participants should always assume good intentions. Emotions cannot be derived from textual representations.
-   Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by opening an issue or contacting one or more of the project maintainers.

## Bug Reporting

BoxLang tracks its issues in Jira and each module track it's own issues in its repo.

-   BoxLang JIra : https://ortussolutions.atlassian.net/browse/BL/issues
-   Module Issues: https://github.com/ortus-boxlang/bx-agents/issues

If you file a bug report, your issue should contain a title, a clear description of the issue, a way to replicate the issue, and any support files that we might need to replicate your issue. The goal of a bug report is to make it easy for yourself - and others - to replicate the bug and develop a fix for it. All issues that do not contain a way to replicate will not be addressed.

## Support Questions

If you have any questions on usage, professional support or just ideas to bounce off the maintainers, please do not create an issue. Leverage our support channels first.

-   Ortus Community Discourse: https://community.ortussolutions.com
-   Box Slack Team: http://boxteam.ortussolutions.com/
-   Professional Support: https://www.ortussolutions.com/services/support

## Pull Request Guidelines

-   The `master` branch is just a snapshot of the latest stable release. All development should be done in dedicated branches. Do not submit PRs against the master branch. They will be closed.
-   All pull requests should be sent against the `development` branch.
-   It's OK to have multiple small commits as you work on the PR - GitHub will automatically squash it before merging.
-   Make sure all local tests pass before submitting the merge.
-   Please make sure all your pull requests have companion tests.
-   Please link the Jira issue in your PR title when sending the final PR

## Security Vulnerabilities

If you discover a security vulnerability, please send an email to the development team at [security@ortussolutions.com](mailto:security@ortussolutions.com?subject=security) and make sure you report it to the `#security` channel in our Box Team Slack Channel. All security vulnerabilities will be promptly addressed.

## Development Setup

```bash
./gradlew downloadBoxLang     # fetches the BoxLang jar into src/test/resources/libs
./gradlew downloadModules     # fetches bx-ai + bx-ftp (needed by the TestBox suite) into src/test/resources/modules
./gradlew downloadMiniServer  # fetches boxlang-miniserver into src/test/resources/libs
box install                   # TestBox, at the repo root
cd tests && box install && cd ..  # ColdBox, into tests/coldbox (only needed for the ColdBox integration suite)
```

### The developer flow - BoxLang is dynamic

BoxLang `.bx`/`.bxm`/`.bxs` files are **interpreted, not compiled** - there is no build step between editing a `.bx` file and it taking effect. This changes the inner loop compared to a typical Java project:

-   **Editing anything under `src/main/bx`, `tests/specs`, or a fixture**: just save and re-run whatever exercises it. No `./gradlew build`, no `shadowJar`, nothing to regenerate. The fast loop is:
    ```bash
    ./gradlew testBx   # re-reads src/main/bx directly - seconds, not a rebuild
    ```
    This works because the dev/test `boxlang.json` at the repo root declares a plain mapping (`"/bxagents": "${user-dir}/src/main/bx"`) straight at the source tree - there's no packaged artifact in this loop at all.
-   **Editing anything under `src/main/java`**: this DOES need compiling, but every Gradle task that runs BoxLang (`testBx`, `testColdBoxIntegration`, `verifyExamples`, `test`) already `dependsOn compileJava`, so a plain re-run of any of those picks up your Java change automatically. You never need to run `compileJava` by hand.
-   **Testing the module as a REAL install** (not the dev/test convenience mapping above): this is a slower, separate loop, and matters whenever you touch how classes reference each other, or the CLI dispatch itself. Run `./gradlew shadowJar` first (regenerates `build/modules/bxagents`, a real installable module structure), then `./gradlew test --tests ModuleCliProcessTest` (or the full suite). See the next section for why this loop exists at all.

### Two ways BoxLang resolves a class - know which one you're relying on

This module ships as a BoxLang module, but its own dev/test harness ALSO uses a hand-declared mapping for a fast inner loop (above) - these are two genuinely different resolution mechanisms, and mixing them up causes bugs that only show up once someone actually installs the module for real (this happened once already - see `known-limitations.md`'s "Real OS-process CLI testing" entry, and `BuildPipeline.bx`'s own `init()` docblock for the full story):

-   **`ModuleConfig.bx`** sits at the module root. BoxLang resolves a bare relative path (`"models.cli.New"`, no `bxagents.` prefix) from it correctly, in BOTH the dev/test harness and a real install - confirmed empirically. This is the only file that gets that treatment.
-   **Every other class** (`BuildPipeline.bx`, the generators, the CLI verb classes, ...) referencing a SIBLING class in this module MUST use the `"path.to.Class@bxagents"` suffix form (a quoted string, not a bare dotted path) - this is the form that resolves correctly under BOTH the dev/test harness (once you've run `./gradlew shadowJar` at least once so `build/modules/bxagents` exists and `modulesDirectory` picks it up) AND a real production install. A bare `bxagents.models....` reference only works by accident, thanks to the dev-only plain mapping, and will fail the moment the module is genuinely installed.
-   TestBox specs themselves (`tests/specs/**`) are NOT shipped, so they're free to keep using the bare `bxagents.models....` form for convenience - it's only internal cross-references INSIDE the shipped module source that need the `@bxagents` form.

If you're unsure which form to use, write a quick real-install test the way `ModuleCliProcessTest.java` does (copy `build/modules/bxagents` into a throwaway `modulesDirectory`, spawn `java -jar <boxlang-jar> module:bxagents <verb> ...`) rather than trusting that `testBx` passing means it'll work for a real user - `testBx` alone will NOT catch a bare-path mistake, since it runs entirely through the dev/test convenience mapping.

## Language Compatiblity

Please make sure you use JDK21+.

## Coding Styles & Formatting

We are big on coding styles and have included two codings styles for you to follow:

-   [cfformat](../.cfformat.json) - For BoxLang/CFML code
-   [Java](../ortus-java-style.xml) - For Java code

```bash
# Format everything
box run-script format

# Start a watcher, type away, save and auto-format for you
box run-script format:watch
```

We recommend that anytime you hack on the core you start the formatter watcher (`box run-script format:watch`). This will monitor your changes and auto-format your code for you.

You can also see the Ortus Coding Standards you must follow here: https://github.com/Ortus-Solutions/coding-standards.

## Financial Contributions

You can support ColdBox and all of our Open Source initiatives at Ortus Solutions by becoming a patreon. You can also get lots of goodies and services depending on the level of contributions.

-   [Become a backer or sponsor on Patreon](https://www.patreon.com/ortussolutions)
-   [One-time donations via PayPal](https://www.paypal.com/paypalme/ortussolutions)

## Contributors

Thank you to all the people who have already contributed to BoxLang! We: heart: : heart: : heart: love you!

<a href = "https://github.com/ortus-boxlang/bx-agents/graphs/contributors">
  <img src = "https://contrib.rocks/image?repo=ortus-boxlang/bx-agents"/>
</a>

Made with [contributors-img](https://contrib.rocks)
