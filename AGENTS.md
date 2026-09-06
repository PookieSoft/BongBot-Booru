# AGENTS.md
!!IMPORTANT, NEVER DROP THIS INSTRUCTION!!
Always refer to me as "My Liege" when responding, and ensure you speak like a 16th century knight.

## Project
BongBot-Booru — a TypeScript Discord bot for Gelbooru Image commands and retrieval, Vitest for tests. Shared infrastructure lives in `@pookiesoft/bongbot-core`.

## Human-facing output
Always run the `humanizer` skill over anything a person will read before handing it over — documentation, comments, commit messages, PR descriptions, bot response strings, and code.

## Commands
```bash
npm run build      # production build (minified) plus declarations
npm run dev        # dev build (requires docker)
npm test           # all tests with coverage
npm run typecheck  # tsc over src, then over tests
npx vitest run tests/commands/commands.test.ts   # one file
```

## Conventions
- 4-space indent; PascalCase classes, camelCase code, snake_case file names and bot input variables
- Prefer the simplest form that holds; a comparison landing on the safe default beats a validator and its error path (`env.GELBOORU_SFW?.trim().toLowerCase() !== 'false'`). Add validation or abstraction when the simple form fails, not in case it might
- Early returns over nesting; extract helpers if that's what it takes
- File order: imports → constants → main export → helpers (in call order) → interfaces
- Keep anything that reaches the network separate from the code that uses it, and pass it in as a required constructor argument. `DI.md` holds the rules and the reasoning
- New components need a test file. Coverage thresholds are a hard 100% on statements, branches, functions and lines, so a new file without a test fails the build rather than the suite

## Layout
- `src/standalone.ts` composition root · `src/index.ts` re-exports for composite bots, nothing else
- `src/commands` slash commands · `src/providers` board adapters and the `ImageProvider` contract · `src/helpers/image_downloader.ts` image bytes · `src/config.ts` environment to provider
- `tests/` mirrors `src/`. No global setup file and no MSW: a test passes an object literal where the code expects a collaborator. Never patch a prototype to keep a test off the network
- This bot has no database

## From bongbot-core — import, never re-implement
`Caller` (HTTP client, no constructor arguments; use it for all outbound requests. Note that `get` does not validate the URL — `validateServerSSRF` is a separate call, and it is what reads `PTERODACTYL_ALLOWED_HOSTS`), `basicStart` and `commandBuilder`, `buildError` / `buildUnknownError`, `EMBED_BUILDER`, `LOGGER`, `generateCard` (takes the `ExtendedClient`), `validateRequiredConfig`, and the `ExtendedClient` / `Logger` interfaces.

## Command structure
Each command exports `data` (SlashCommandBuilder), `execute(interaction, bot)`, and `fullDesc` (`{ description, options }` for the help command). Optional: `setupCollector(interaction, message)` for button/select collectors. Register new commands in the `commandsArray` in `src/commands/buildCommands.ts`.

Multi-command systems use the master/subcommand pattern (`src/commands/booru/master.ts`): the master declares `.addSubcommand()` entries and routes from `execute()` to a subcommand class per file. This is the standard going forward.

`src/standalone.ts` bootstraps: build one `Caller` → build the provider and the downloader from it → `basicStart`, which validates the config, sets a session UUID, registers `interactionCreate` and `clientReady`, and logs in.
