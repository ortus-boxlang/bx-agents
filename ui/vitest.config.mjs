/**
 * Unit tests of the web app's scripts (tests/unit). The browser tests are Playwright's (tests/e2e).
 */
import { defineConfig } from "vitest/config";

export default defineConfig( { test: { include: [ "tests/unit/**/*.test.js" ] } } );
