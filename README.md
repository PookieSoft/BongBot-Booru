# BongBot-Booru

A standalone Discord bot that searches Safebooru or Gelbooru, replacing BongBot's Google image commands from [issue #82](https://github.com/PookieSoft/BongBot/issues/82).

## Commands

| Command                                    | Search                                |
| ------------------------------------------ | ------------------------------------- |
| `/clown`                                   | Omaru Polka (`omaru_polka`)           |
| `/fox`                                     | Shirakami Fubuki (`shirakami_fubuki`) |
| `/booru search tags:shirakami_fubuki solo` | Tags from the selected board          |

The bot defaults to Safebooru for searches and autocomplete. Set `IMAGE_PROVIDER=safebooru` to choose it explicitly. Safebooru needs no credentials, and this provider never contacts Gelbooru.

Set `IMAGE_PROVIDER=gelbooru` to use Gelbooru for searches and autocomplete. Gelbooru defaults to `GELBOORU_SFW=true`: it adds `rating:general` to searches and filters returned posts to that rating. Set `GELBOORU_SFW=false` to allow all four ratings, including explicit content. The provider applies to every command and channel. Any other `IMAGE_PROVIDER` value stops startup with an error. Gelbooru rating filters depend on correct tagging and cannot guarantee that every image suits every audience.

`GELBOORU_SFW` controls the Gelbooru rating filter. When `IMAGE_PROVIDER` is unset, the legacy value `false` selects Gelbooru; every other value selects Safebooru. This comparison ignores surrounding whitespace and letter case. An explicit `IMAGE_PROVIDER` takes precedence for board selection; `GELBOORU_SFW` still controls filtering when Gelbooru is selected. Existing SFW deployments therefore use Safebooru instead of filtered Gelbooru.

Tags support underscores, parentheses, wildcards, and a leading minus to exclude a tag. The bot rejects rating overrides and other search operators. Both providers exclude `ai-generated` unless `ALLOW_AI_IMAGES=true`. Image URLs must use HTTPS and belong to the selected board's host or a subdomain. The bot skips videos.

For each request, the bot picks a random valid image from the first 100 matching posts. Images elsewhere on the board are outside that sample. If no images match or the board fails to respond, the bot returns a message explaining the problem. Safebooru's empty JSON response counts as no results.

Safebooru responses use the title "View on Safebooru", link to the post on safebooru.org, and name PNG attachments `safebooru-image.png`.

## Setup

Use Node.js 24 or later. As in BongBot-Quote and BongBot-Ptero, `.npmrc` directs the `@pookiesoft` scope to GitHub Packages and reads its token from `NODE_AUTH_TOKEN`. Export that variable in your shell with a token that has `read:packages` access to BongBot-Core. Keep the token out of Git.

```sh
npm ci
cp .env.example .env
npm run typecheck
npm test
npm run build
node --env-file=.env --enable-source-maps dist/standalone.js
```

| Variable             | Requirement                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_API_KEY`    | Required Discord bot token                                                                                                  |
| `DISCORD_CHANNEL_ID` | Optional startup information channel                                                                                        |
| `IMAGE_PROVIDER`     | `safebooru` (default) or `gelbooru`                                                                                         |
| `GELBOORU_SFW`       | Gelbooru only: defaults to `true`; `false` disables rating filtering. Also selects the board when `IMAGE_PROVIDER` is unset |
| `GELBOORU_API_KEY`   | Gelbooru only: optional API key; must be paired with user ID                                                                |
| `GELBOORU_USER_ID`   | Gelbooru only: optional positive numeric user ID; must be paired with API key                                               |
| `ALLOW_AI_IMAGES`    | Defaults to `false`; searches exclude the `ai-generated` tag unless this is exactly `true`                                  |
| `NODE_AUTH_TOKEN`    | GitHub Packages token used during installation and Docker builds                                                            |

Gelbooru may require authentication or throttle requests, according to its [API documentation](https://gelbooru.com/index.php?page=wiki&s=view&id=18780). You can find your API key and user ID in your account options.

Invite the bot with the `bot` and `applications.commands` scopes. Grant it View Channel, Send Messages, Embed Links, and Attach Files. Enable the Message Content gateway intent in the Discord developer portal, since Core's shared startup requests it.

Core registers global slash commands and can post a deployment card. Use a separate bot application from the main BongBot: registration replaces the application's command list.

## Docker

```sh
docker build --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN -t bongbot-booru .
docker run --rm --env-file .env --volume ./logs:/app/logs bongbot-booru
```

The build reads the registry token through a BuildKit secret. The container runs as the `node` user, which needs write access to the mounted logs directory. With Docker installed, `npm run dev` builds and runs the same container.

Export a nonempty `NODE_AUTH_TOKEN` before building. In Bash, you can enter it without displaying it or saving it in shell history:

```bash
read -rsp 'GitHub Packages token: ' NODE_AUTH_TOKEN
echo
export NODE_AUTH_TOKEN
npm run dev
```

The `.env` file passed to `docker run` supplies runtime variables only; it does not supply the build secret. A missing or empty build secret stops the build before `npm ci`.

For GitHub Actions, the shared workflow's `docker/build-push-action` step must explicitly forward a token with access to BongBot-Core:

```yaml
with:
    secrets: |
        NODE_AUTH_TOKEN=${{ secrets.NODE_AUTH_TOKEN }}
```

Use the actual token secret name on the right-hand side. The caller's `secrets: inherit` makes secrets available to the shared workflow, but the Docker build still needs this mapping. See [Docker's build secret documentation](https://docs.docker.com/build/ci/github-actions/secrets/).

## Structure

`src/index.ts` exports the commands and provider interface for composite bots. `src/standalone.ts` starts the bot through BongBot-Core's `basicStart`, following the sibling microservices. Core validates its configuration, handles logging and Discord interactions, and builds startup cards. Commands return response payloads for Core to send; Core also acknowledges the interactions.

`src/commands/buildCommands.ts` registers the commands through Core's `commandBuilder`. The `/booru` master routes to its search subcommand. Both character commands share `ImageCommand`.

`src/standalone.ts` is the only place that builds an HTTP client. It creates one Core `Caller`, hands it to `createProvider` and to `HttpImageDownloader`, and passes the provider and the downloader to `buildCommands`. Both arguments are required, so no command builds its own.

`src/helpers/image_downloader.ts` fetches the image bytes and names the attachment. Commands narrow it to `Pick<HttpImageDownloader, 'download'>`, the same way the provider narrows Core's client, so a test replaces the whole download step with one object literal.

`src/providers/gelbooru.ts` and `src/providers/safebooru.ts` take Core's `Caller` as a constructor argument. In the installed Core package, version 1.7.0, `Caller` itself takes no constructor arguments. Each provider derives its image host from its fixed API endpoint and passes it to the shared validator in `src/providers/post_validation.ts`. Users cannot supply server URLs.

To use another board, implement `ImageProvider` and construct it in place of `createProvider`. A composite bot can import `Gelbooru` or `Safebooru` and pass options straight to the constructor. `GelbooruOptions.sfw` controls Gelbooru rating filtering and defaults to `true`. The factories `createGelbooru` and `createSafebooru` are also exported. The image search code needs no database or additional HTTP client.

## Tests and dependencies

`npm test` runs Vitest once with V8 coverage. The suite requires 100% coverage of statements, branches, functions, and lines in executable application source. It excludes `src/index.ts`, which only re-exports symbols, and `src/providers/image_provider.ts`, which contains interfaces. Neither file has executable statements. TypeScript checks both, and command tests import through the public index.

The shared workflows use `coverage/lcov.info`, `coverage/coverage-summary.json`, and `test-results/junit.xml`. For local development, use `npm run test:watch`. To run one file, use `npm test -- tests/providers/gelbooru.test.ts`; the coverage thresholds still apply.

We chose Vitest because it supports ESM and Jest-style assertions without tying TypeScript upgrades to ts-jest's compatibility range. Vitest transforms TypeScript to run the tests; `npm run typecheck` checks the types separately. The build also uses TypeScript to emit declarations. See the [Vitest guide](https://vitest.dev/guide/).

Provider tests supply a mock HTTP client and a controlled random number generator. They check malformed responses and unsuitable results. Command and startup tests supply a fake provider and downloader; they check routing and calls to Core without logging in to Discord. Downloader tests cover the request headers, the content-type checks and the attachment names. Core's own tests cover its shared behaviour, including HTTP transport and JSON parsing in `Caller`.

The runtime depends on BongBot-Core and Discord.js. Development tools handle TypeScript compilation, esbuild bundling, and Vitest coverage. The bot uses `URLSearchParams` to encode queries and standard JavaScript for validation and random selection.

## License

[MIT](LICENSE).
