// Registers the server-only shim loader before tsx processes imports.
// Usage: node --import ./scripts/register.mjs --import tsx scripts/test-bristol-brief.ts
import { register } from "node:module";
register("./loader.mjs", import.meta.url);
