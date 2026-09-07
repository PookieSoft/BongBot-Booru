# BongBot-Booru

A Discord bot for finding images on Safebooru or Gelbooru. It replaces BongBot's Google image commands from [issue #82](https://github.com/PookieSoft/BongBot/issues/82).

## Commands

| Command                                           | Search                                |
| ------------------------------------------------- | ------------------------------------- |
| `/clown`                                          | Omaru Polka (`omaru_polka`)           |
| `/fox`                                            | Shirakami Fubuki (`shirakami_fubuki`) |
| `/booru search tag_1:shirakami_fubuki tag_2:solo` | Tags from the selected board          |

`/booru search` accepts up to five tags, one per field (`tag_1` through `tag_5`). The first is required. Each field accepts up to 100 characters and offers autocomplete suggestions. Tags can contain letters, numbers, underscores, parentheses, periods, hyphens, and wildcards. A leading minus excludes a tag. Rating overrides and other search operators are rejected.

The bot uses Safebooru for searches and autocomplete by default. Safebooru needs no credentials. Set `IMAGE_PROVIDER=gelbooru` to use Gelbooru for every command and channel.

Gelbooru searches add `rating:general` and discard posts with any other rating. Set `GELBOORU_SFW=false` to accept general, sensitive, questionable, and explicit posts. Filtering relies on the board's tags; it cannot guarantee that every image suits every audience. Safebooru uses its own board content without an extra rating filter.

When `IMAGE_PROVIDER` is unset, `GELBOORU_SFW=false` selects Gelbooru; all other values select Safebooru. An explicit `IMAGE_PROVIDER` overrides that choice and must be exactly `safebooru` or `gelbooru`, or startup fails. The comparisons for `GELBOORU_SFW` and `ALLOW_AI_IMAGES` ignore surrounding whitespace and letter case.

Both providers add `-ai-generated` to searches unless `ALLOW_AI_IMAGES=true`. Each request fetches up to 100 matching posts and picks a random valid image from that response. It prefers a valid sample image when one is available. The bot accepts JPEG, PNG, GIF, and WebP URLs over HTTPS on the selected board's host or a subdomain, with no credentials or non-default port. Videos are skipped.

Replies attach the image and link to its post with the title "View on Safebooru" or "View on Gelbooru". Attachment names follow the board and image extension, such as `safebooru-image.png`. If no valid images remain or a request fails, the bot replies with an explanation. An empty Safebooru search response counts as no results.

## Quick start with Docker

### Prerequisites

- Docker installed on your system.
- A Discord bot token.

### Running the bot

1. Clone the repository:

    ```bash
    git clone https://github.com/PookieSoft/BongBot-Booru.git
    cd BongBot-Booru
    ```

2. Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` and set your Discord bot token. The example uses Safebooru, which needs no board credentials:

    ```env
    DISCORD_API_KEY=your_discord_bot_token_here
    IMAGE_PROVIDER=safebooru
    ```

3. Run the pre-built development image:

    ```bash
    docker run --rm --env-file .env --volume ./logs:/app/logs mirasi/bongbot-booru:latest
    ```

The container runs as the `node` user, which needs write access to the mounted logs directory.

## Environment configuration

| Variable             | Required or optional                                           | Purpose and default                                                                                                           |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_API_KEY`    | Required                                                       | Discord bot token.                                                                                                            |
| `DISCORD_CHANNEL_ID` | Optional                                                       | Channel for the deployment card. Core logs an error if omitted.                                                               |
| `IMAGE_PROVIDER`     | Optional                                                       | `safebooru` or `gelbooru`. Defaults to Safebooru unless `GELBOORU_SFW=false`.                                                 |
| `GELBOORU_SFW`       | Optional                                                       | Defaults to `true`; `false` disables Gelbooru rating filtering. Also selects the board when `IMAGE_PROVIDER` is unset.        |
| `GELBOORU_API_KEY`   | Optional; required with `GELBOORU_USER_ID` when using Gelbooru | Gelbooru API key. Ignored when using Safebooru.                                                                               |
| `GELBOORU_USER_ID`   | Optional; required with `GELBOORU_API_KEY` when using Gelbooru | Positive integer Gelbooru user ID. Ignored when using Safebooru.                                                              |
| `ALLOW_AI_IMAGES`    | Optional                                                       | Defaults to `false`; searches exclude the `ai-generated` tag unless set to `true` (ignoring case and surrounding whitespace). |

Edit `.env` and set `DISCORD_API_KEY` before starting the bot. The copied example explicitly selects Safebooru; change `IMAGE_PROVIDER` to use Gelbooru.

Gelbooru may require authentication or throttle requests, according to its [API documentation](https://gelbooru.com/index.php?page=wiki&s=view&id=18780). You can find your API key and user ID in your account options.

Invite the bot with the `bot` and `applications.commands` scopes. Grant it View Channel, Send Messages, Embed Links, and Attach Files. Enable the Message Content gateway intent in the Discord developer portal, since Core's shared startup requests it.

Core registers global slash commands and can post a deployment card. Use a separate bot application from the main BongBot: registration replaces the application's command list.

## Local development

Use Node.js 24 or later. With dependencies installed and `.env` configured, build and run the bot:

```sh
npm run typecheck
npm test
npm run build
node --env-file=.env --enable-source-maps dist/standalone.js
```

## Structure

`src/index.ts` exports commands, providers, factories, and HTTP helpers for composite bots. `src/standalone.ts` creates the dependencies and starts the bot through BongBot-Core's `basicStart`. Core validates configuration, handles logging, registers commands, and sends command responses. The standalone entry point routes autocomplete interactions separately because Core's handler skips them.

`src/commands/buildCommands.ts` registers the commands through Core's `commandBuilder`. The `/booru` master routes to its search subcommand; `/clown` and `/fox` share `ImageCommand`.

The standalone entry point creates one Core `Caller` and wraps it in `RetryingCaller` before passing it to `createProvider` and `HttpImageDownloader`. The wrapper makes up to three attempts when a request throws a `TypeError`, which covers fetch failures that receive no response. Other errors pass through immediately. The provider and downloader are required arguments to `buildCommands`.

Each provider derives its allowed image host from a fixed API endpoint and validates image URLs through `src/providers/post_validation.ts`. Users cannot supply server URLs. `HttpImageDownloader` expects a URL already validated by the provider; it checks the downloaded response's content type, fetches the bytes, and names the attachment.

To use another board, implement `ImageProvider` and pass it to `buildCommands` with a downloader. Composite bots can also construct `Gelbooru` or `Safebooru` directly with a caller and options, or use the exported `createGelbooru` and `createSafebooru` factories. `GelbooruOptions.sfw` defaults to `true`. Network dependencies use narrow types such as `Pick<Caller, 'get'>` and `Pick<HttpImageDownloader, 'download'>`, so tests can supply object literals.

## Tests and dependencies

`npm test` runs Vitest once with V8 coverage and requires 100% coverage of statements, branches, functions, and lines. Coverage excludes `src/index.ts` and `src/providers/image_provider.ts`, which contain only re-exports and interfaces. TypeScript checks both, and command tests import through the public index.

The test run writes `coverage/lcov.info`, `coverage/coverage-summary.json`, and `test-results/junit.xml`. Use `npm run test:watch` during development. To run one file without coverage thresholds, use `npx vitest run tests/providers/gelbooru.test.ts`. Running it through `npm test -- tests/providers/gelbooru.test.ts` still applies the full coverage requirements.

Provider tests use fake HTTP clients and controlled random values to check searches, autocomplete, malformed responses, and rejected images. Command and startup tests use fake providers and downloaders without logging in to Discord. Separate tests cover downloads, retry limits, and error messages.

[Vitest](https://vitest.dev/guide/) runs the TypeScript tests; `npm run typecheck` checks source and test types separately. `npm run build` bundles the code with esbuild and emits TypeScript declarations. Runtime dependencies are BongBot-Core and Discord.js. Queries use `URLSearchParams`; the bot needs no database.
