// CommonJS shim to load node:sqlite without triggering Vite's ESM resolver.
const { DatabaseSync } = require('node:sqlite');
module.exports = { DatabaseSync };
