// CJS shim: intercepts require("server-only") so scripts can import
// app/lib/ modules outside the Next.js runtime.
// Usage: node --require ./scripts/shim-server-only.cjs ...
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    // Return this file — it exports nothing harmful
    return __filename;
  }
  return origResolve.call(this, request, parent, isMain, options);
};
