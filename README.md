# BongBot-Booru

![Build Status](https://img.shields.io/github/actions/workflow/status/Mirasii/BongBot-Booru/deploy.yml?label=Production%20Deploy&logo=github)
![Coverage](https://codecov.io/gh/Mirasii/BongBot-Booru/branch/main/graph/badge.svg)
![License](https://img.shields.io/github/license/Mirasii/BongBot-Booru?v=2)
![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen?logo=node.js)

Welcome to BongBot-Booru! 🤖

BongBot-Booru is a microservice in the BongBot ecosystem, providing Booru image board integration features via a Discord bot. It leverages slash commands for searching and browsing images from Booru-compatible image boards.

## Quick Start with Docker

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- A Discord Bot Token (see [Discord Developer Portal](https://discord.com/developers/applications))

### Running the Bot

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mirasii/BongBot-Booru.git
   cd BongBot-Booru
   ```

2. **Configure environment variables**:
   Copy the example environment file and update it with your credentials:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Discord bot token and other API keys:
   ```env
   DISCORD_API_KEY=your_discord_bot_token_here
   DISCORD_CHANNEL_ID=your_channel_id_here
   ```

3. **Run with Docker**:
   ```bash
   # Build and run the container
   docker build . -t bongbot-booru
   docker run --env-file .env bongbot-booru
   ```

   Or use the pre-built image:
   ```bash
   # Dev Build
   docker run --env-file .env mirasi/bongbot-booru-develop:latest
   ```
   ```bash
   # Release Build
   docker run --env-file .env mirasi/bongbot-booru:latest
   ```
   **It is recommended you use docker for local development.**

## Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_API_KEY` | ✅ | Your Discord bot token |
| `DISCORD_CHANNEL_ID` | ❌ | Default channel ID for info card on bot launch |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## Testing

The bot includes comprehensive test coverage using Jest:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/commands/example.test.ts
```

## License

This project is open source and available under the [MIT License](LICENSE).
