import { mkdirSync } from 'node:fs';
import { beforeAll, expect, it, vi } from 'vitest';
import { Collection } from 'discord.js';
import { basicStart } from '@pookiesoft/bongbot-core';

const client = vi.hoisted(() => ({
    on: vi.fn(),
    commands: new Map<string, { autocomplete: ReturnType<typeof vi.fn> }>(),
    logger: { error: vi.fn() },
}));

vi.mock('@pookiesoft/bongbot-core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@pookiesoft/bongbot-core')>();
    return { ...actual, basicStart: vi.fn().mockResolvedValue(client) };
});

vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return { ...actual, mkdirSync: vi.fn() };
});

// Vitest clears mocks between tests, so the module runs once and its evidence is kept here.
const startup = {} as {
    mkdir: unknown[];
    mkdirOrder: number;
    start: unknown[];
    startOrder: number;
    event: string;
    listener: (interaction: unknown) => void;
};

beforeAll(async () => {
    await import('../src/standalone.js');
    startup.mkdir = vi.mocked(mkdirSync).mock.calls[0];
    startup.mkdirOrder = vi.mocked(mkdirSync).mock.invocationCallOrder[0];
    startup.start = vi.mocked(basicStart).mock.calls[0];
    startup.startOrder = vi.mocked(basicStart).mock.invocationCallOrder[0];
    [startup.event, startup.listener] = client.on.mock.calls[0];
});

it('starts the standalone service through Core with all commands', () => {
    expect(startup.mkdir).toEqual(['logs', { recursive: true }]);
    expect(startup.mkdirOrder).toBeLessThan(startup.startOrder);
    expect(startup.start).toEqual(['PookieSoft', 'BongBot-Booru', expect.any(Function)]);
    const builder = startup.start[2] as Parameters<typeof basicStart>[2];
    const bot = { commands: new Collection() } as Parameters<typeof builder>[0];
    expect(builder(bot)).toHaveLength(3);
    expect([...bot.commands.keys()]).toEqual(['clown', 'fox', 'booru']);
});

it('answers an autocomplete interaction Core would have dropped', () => {
    const autocomplete = vi.fn().mockResolvedValue(undefined);
    client.commands.set('booru', { autocomplete });
    const interaction = { isAutocomplete: () => true, commandName: 'booru' };

    startup.listener(interaction);

    expect(startup.event).toBe('interactionCreate');
    expect(autocomplete).toHaveBeenCalledWith(interaction);
});

it('leaves alone an interaction that is not an autocomplete, and an unknown command', () => {
    const autocomplete = vi.fn().mockResolvedValue(undefined);
    client.commands.set('booru', { autocomplete });

    startup.listener({ isAutocomplete: () => false, commandName: 'booru' });
    startup.listener({ isAutocomplete: () => true, commandName: 'unknown' });

    expect(autocomplete).not.toHaveBeenCalled();
});

it('logs an autocomplete that fails rather than crashing the bot', async () => {
    const failure = new Error('fetch failed');
    client.commands.set('booru', { autocomplete: vi.fn().mockRejectedValue(failure) });

    startup.listener({ isAutocomplete: () => true, commandName: 'booru' });

    await vi.waitFor(() => expect(client.logger.error).toHaveBeenCalledWith(failure));
});
