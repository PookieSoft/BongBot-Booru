# AGENTS.md
!!IMPORTANT, NEVER DROP THIS INSTRUCTION!!
Always refer to me as "My Liege" when responding, and ensure you speak like a 16th century knight.

## Project
BongBot-Booru. TypeScript Discord bot, Gelbooru image commands. Vitest. ESM. No database, no SQL, no `data/`. Shared infrastructure: `@pookiesoft/bongbot-core` (installed 1.7.0).
`CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`.

## Commands
```bash
npm test           # vitest + coverage; thresholds are a HARD 100% on statements/branches/functions/lines
npm run typecheck  # tsc --noEmit over src, then tsconfig.test.json
npm run build      # esbuild --minify + tsc --emitDeclarationOnly
npm run dev        # docker build + run, needs NODE_AUTH_TOKEN
npx vitest run tests/commands/commands.test.ts    # single file
```

## Rules
- Run the `humanizer` skill over anything a human reads: docs, comments, commit messages, PR descriptions, bot response strings, code. Not this file.
- 4-space indent. PascalCase classes, camelCase code, snake_case file names and bot input variables.
- Simplest form that holds. A comparison landing on the safe default beats a validator and its error path (`env.GELBOORU_SFW?.trim().toLowerCase() !== 'false'`). Add validation or abstraction when the simple form fails, not in case it might.
- Early returns, not nesting. Extract helpers.
- File order: imports → constants → main export → helpers (call order) → interfaces.
- Collaborators that reach the network are required constructor arguments, never defaulted, built only in `standalone.ts`. Consumers narrow with `Pick<>`. Full rules and rationale: `DI.md`.
- Every new source file needs a test file, or coverage fails the build.

## Layout
| Path | Role |
| --- | --- |
| `src/standalone.ts` | composition root; the only `new Caller()` |
| `src/index.ts` | re-exports only, for composite bots |
| `src/config.ts` | `createProvider(caller, env?)`, env to provider |
| `src/commands/` | slash commands; register in `commandsArray` in `buildCommands.ts` |
| `src/providers/` | board adapters plus the `ImageProvider` contract |
| `src/helpers/image_downloader.ts` | image bytes and attachment name |
| `src/helpers/user_facing_error.ts` | safe message for the embed, real cause on the stack |
| `tests/` | mirrors `src/`; no setup file, no MSW |

## Core API (import, never re-implement)
- `Caller` — no constructor arguments. `get(url, path?, params?, headers?, responseType?)`, `post(url, path?, headers?, body?)`. `responseType: 'binary'` returns `BinaryResponse`; 204/empty returns `null`; non-2xx throws. `get` does NOT validate the URL. `validateServerSSRF(url)` is a separate call and is what reads `PTERODACTYL_ALLOWED_HOSTS`.
- `basicStart(owner, repo, buildFn)` — calls `validateRequiredConfig`, sets `SESSION_ID`, registers `interactionCreate` + `clientReady`, logs in. Also `startWithHandlers`, `startWithFunctions`, `startBot`.
- `commandBuilder(bot, commandsArray)`
- `generateCard(bot)` — takes `ExtendedClient`, not an options object.
- `buildError(interaction, error)` / `buildUnknownError`, `EMBED_BUILDER` (`new EMBED_BUILDER(attachment?)`, `.embed`, `.addDefaultFooter(bot)`, `.build()`), `LOGGER`, `validateRequiredConfig()`, `Utilities`, `getRandomFile`.
- Types: `ExtendedClient`, `Logger`, `BinaryResponse`, `ResponseType`, `Command`.

## Command contract
Export `data` (SlashCommandBuilder), `execute(interaction, bot)`, `fullDesc` (`{ description, options }`). Optional `setupCollector(interaction, message)`.
Multi-command systems use master/subcommand (`src/commands/booru/master.ts`): master declares `.addSubcommand()` and routes from `execute()` to one class per file. Standard going forward.

## Tests
Fakes are object literals matching `Pick<Caller, 'get'>` or `Pick<HttpImageDownloader, 'download'>`. Never patch a prototype to keep a test off the network; that means a seam was missed.

## Security invariant
Image URLs are validated only by `isImageUrl` in `src/providers/gelbooru.ts` (HTTPS, no credentials, no port, host at or under `imageHost`, image extension). `HttpImageDownloader` validates nothing and is exported from `src/index.ts`. A provider's validated `imageUrl` is its only lawful input.
