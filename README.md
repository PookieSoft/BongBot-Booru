# BongBot-Booru

A standalone Discord bot that searches Gelbooru, replacing BongBot's Google image commands from [issue #82](https://github.com/PookieSoft/BongBot/issues/82).

## Commands

| Command | Search |
| --- | --- |
| `/clown` | Omaru Polka (`omaru_polka`) |
| `/fox` | Shirakami Fubuki (`shirakami_fubuki`) |
| `/booru search tags:shirakami_fubuki solo` | Space-separated Gelbooru tags |

SFW mode is enabled by default. `GELBOORU_SFW=true` requests `rating:general` and rejects posts whose returned rating is anything else. Unset or blank values also enable SFW mode. Set `GELBOORU_SFW=false` and restart the bot to allow all four ratings, including explicit content, across all commands. This setting applies to the whole bot, not individual Discord channels. Invalid values stop startup.

Tags support underscores, parentheses, wildcards, and a leading minus for exclusions. Rating overrides and other search operators are rejected. Only HTTPS image URLs hosted by Gelbooru are embedded; videos are skipped.

[Gelbooru's rating guide](https://gelbooru.com/index.php?page=wiki&s=view&id=2535) defines General as SFW; Sensitive, Questionable, and Explicit are excluded in SFW mode. Ratings depend on correct tagging and do not guarantee that an image is suitable for every audience.

Each request chooses a random eligible image from the first 100 matching posts. This is not a uniform sample of the whole board. Empty results and upstream failures produce a response instead of an empty embed.

## Setup

Use Node.js 24 or later. The `.npmrc` configuration matches BongBot-Quote and BongBot-Ptero: the `@pookiesoft` scope uses GitHub Packages and reads authentication from `NODE_AUTH_TOKEN`. Export `NODE_AUTH_TOKEN` with `read:packages` access to BongBot-Core in the shell; do not commit it.

```sh
npm ci
cp .env.example .env
npm run typecheck
npm test
npm run build
node --env-file=.env --enable-source-maps dist/standalone.js
```

| Variable | Requirement |
| --- | --- |
| `DISCORD_API_KEY` | Required Discord bot token |
| `DISCORD_CHANNEL_ID` | Optional startup information channel |
| `GELBOORU_SFW` | Defaults to `true`; `false` allows all ratings |
| `GELBOORU_API_KEY` | Optional Gelbooru API key; must be paired with user ID |
| `GELBOORU_USER_ID` | Optional positive numeric Gelbooru user ID; must be paired with API key |
| `NODE_AUTH_TOKEN` | GitHub Packages token used during installation and Docker builds |

[Gelbooru's API documentation](https://gelbooru.com/index.php?page=wiki&s=view&id=18780) says authentication may be required and requests may be throttled. Account options provide the API key and user ID.

Invite the bot with the `bot` and `applications.commands` scopes and grant View Channel, Send Messages, Embed Links, and Attach Files. Core's shared startup currently requests the Message Content gateway intent; enable it in the Discord developer portal. Core registers global slash commands and optionally posts its deployment card. Use a separate bot application from the main BongBot because registration replaces that application's command list.

## Docker

```sh
docker build --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN -t bongbot-booru .
docker run --rm --env-file .env --volume ./logs:/app/logs bongbot-booru
```

The build reads the registry token through a BuildKit secret. The runtime image runs as the `node` user; a mounted logs directory must be writable by that user. `npm run dev` builds and runs the same container. Docker is required for that command.

## Structure

`src/index.ts` exports the commands and provider interface for composite bots. `src/standalone.ts` starts this bot through BongBot-Core's `basicStart`, as the sibling microservices do. Core owns configuration validation, logging, Discord interaction handling, and startup cards. Commands return payloads to Core instead of acknowledging interactions themselves.

`src/commands/buildCommands.ts` registers the commands through Core's `commandBuilder`. The `/booru` master routes to its search subcommand. Both character commands share `ImageCommand`.

`src/providers/gelbooru.ts` receives Core's `Caller` through dependency injection. The pinned published Core 1.6.50 exposes a zero-argument `Caller` constructor. All Gelbooru requests use that client and a fixed API endpoint. The bot does not accept server URLs. To use another board, implement `ImageProvider` and pass it to `buildCommands`. No database or additional HTTP client is needed.

## Tests and dependencies

`npm test` runs Vitest once with V8 coverage and requires 100% statements, branches, functions, and lines in application source. Reports include `coverage/lcov.info`, `coverage/coverage-summary.json`, and `test-results/junit.xml` for the shared workflows. Use `npm run test:watch` during development, or `npm test -- tests/providers/gelbooru.test.ts` to select a file. Coverage thresholds still apply when selecting tests.

Vitest replaces the incomplete Jest/ts-jest scaffold. It transforms TypeScript without relying on ts-jest's TypeScript compatibility range and supports ESM and Jest-style assertions. It does not type-check the application; `npm run typecheck` does that separately. The build also emits declarations through TypeScript. See the [Vitest guide](https://vitest.dev/guide/).

Tests inject the provider's HTTP boundary and random number generator, exercise malformed responses and unsuitable results, and verify command routing and startup delegation without logging in to Discord. Shared Core behavior belongs to Core's own tests.

Runtime dependencies are BongBot-Core and Discord.js. Development dependencies provide TypeScript compilation, esbuild bundling, and Vitest coverage. Query encoding uses `URLSearchParams`; simple validation and random selection use standard JavaScript.

## License

[MIT](LICENSE).
