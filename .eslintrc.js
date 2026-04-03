// Root ESLint config — delegates to the shared @uc/config package.
// ESLint 9.x flat config is used project-wide; this file is the root entry point.
// Individual apps/packages may extend or override via their own eslint.config.js.

const ucConfig = require("@osc/config/eslint/index.js");

module.exports = ucConfig;
