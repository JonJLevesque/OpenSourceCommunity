/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer subject lines for descriptive commits
    'header-max-length': [1, 'always', 120],
    // Scope is optional but must be lowercase if provided
    'scope-case': [2, 'always', 'lower-case'],
    // Types we allow
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, whitespace (no logic change)
        'refactor', // Code change that's neither fix nor feature
        'perf',     // Performance improvement
        'test',     // Adding or fixing tests
        'chore',    // Build process, tooling, deps
        'ci',       // CI configuration
        'revert',   // Revert a previous commit
        'wip',      // Work in progress (discouraged on main)
      ],
    ],
  },
}
