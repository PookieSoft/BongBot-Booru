# CLAUDE.md

# Project: BongBot-Booru

## Project Description
A Discord Bot built on NodeJS in TypeScript for Booru image board integration. Shared infrastructure (helpers, loggers, config, responses) lives in the `bongbot-core` package.

## Tech Stack:
- Bot: TypeScript
- Testing: jest, ts-jest
- Core Library: bongbot-core

## Code Conventions
- 4-space indentation
- PascalCase for class declarations
- snake_case preferred for file names and bot input variables
- camelCase for code variables and functions
- Functional components with Object-Orientated design where appropriate for code re-usabilities, e.g. separating database interactions from implementation for re-usability.
- Early return statements should be used to prevent nesting, e.g. instead of `if (condition) { ...logic }`, do `if (condition) { return; } ...logic`. Create helper functions if necessary to facilitate this.
- Files should be structured according to the following design implementation:
    - import statements
    - constant declarations
    - "main" function/export
    - helper functions, in the order that they appear
    - interface declarations

## Project Structure
- /src - Main source code
    - /commands - Slash commands
    - /helpers - Booru-specific helpers
    - /services - Booru-specific services
- tests - Test Files
- data - Data files (data folder is in gitignore and shouldn't be committed)

## Shared Code (bongbot-core)
The following are imported from `bongbot-core` and should NOT be duplicated locally:
- `Caller` - HTTP client wrapper with SSRF protection
- `buildError`, `buildUnknownError` - Standardized error response formatting
- `EMBED_BUILDER` - Discord embed construction utilities
- `LOGGER` - Logging service (DefaultLogger + FileLogger)
- `generateCard` - GitHub info card embed generator
- `validateRequiredConfig` - Config validation utility
- `ExtendedClient`, `Logger` - TypeScript interfaces

## Important Notes
- API calls should use `Caller` from `bongbot-core`
- New components should have an accompanying test file and aim for 100% coverage
- Dependency Injection should be used to reduce individual complexity
- `Caller` constructor accepts `allowedHosts: string[]` - pass from environment config
- `generateCard` accepts `{ repoOwner, repoName }` options

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Build for production (minified)
npm run build

# Build for dev (requires docker)
npm run dev

# Run all tests with coverage
npm test

# Run a single test file
NODE_OPTIONS=--experimental-vm-modules npx jest tests/commands/ping.test.ts

# Run tests matching a pattern
NODE_OPTIONS=--experimental-vm-modules npx jest --testNamePattern="should return"
```

### Entry Point and Bot Lifecycle

`src/index.ts` bootstraps the bot:
1. Validates required config via `validateRequiredConfig()`
2. Initializes logging with a session UUID
3. Builds commands via `buildCommands()` which populates `bot.commands` Collection
4. Registers event handlers: `interactionCreate` (slash commands), `clientReady` (startup)
5. Calls `bot.login(token)`

### Command Structure

Commands follow a consistent pattern with required exports:
- `data`: SlashCommandBuilder definition
- `execute(interaction, bot)`: Main handler for slash commands
- `fullDesc`: Object with `description` and `options` for the help command

Optional command methods:
- `setupCollector(interaction, message)`: For commands needing button/select menu collectors

Commands are registered in `src/commands/buildCommands.ts` - add new commands to the `commandsArray`.

### Subcommand Pattern

Complex features use a master command with subcommands:
- Master file defines the SlashCommandBuilder with `.addSubcommand()`
- Each subcommand is a separate class in its own file
- Master's `execute()` routes to subcommand handlers via switch statement
This is the standard structure for when multiple commands interact with a system.

### Testing Setup

Tests use Jest with ESM support and MSW for HTTP mocking:
- `tests/setup.ts`: Global MSW server lifecycle (listen/reset/close)
- `tests/mocks/server.ts`: MSW server instance
- `tests/mocks/handlers.ts`: Default HTTP handlers

For tests requiring custom handlers, import `setupServer` from `msw/node` and create a local server. Use `jest.useFakeTimers()` for time-dependent tests.
