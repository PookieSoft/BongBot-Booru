# Contributing

Use Node.js 24 or later and configure `NODE_AUTH_TOKEN` for GitHub Packages as described in the README.

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Use four spaces, PascalCase class names, camelCase identifiers, and snake_case file names. Keep `buildCommands.ts` as the existing documented registration entry point. Put imports first, then constants, the main export, helpers in call order, and interfaces.

Add unit tests for application code. Inject external dependencies so tests need neither Discord credentials nor live API calls. Keep shared utilities in BongBot-Core and import them here. New command systems should use a master command that routes to subcommand classes.

Keep runtime dependencies small. Explain why a new package is necessary and document changes to the test runner or build tools. Do not commit credentials, logs, generated reports, or database files.
