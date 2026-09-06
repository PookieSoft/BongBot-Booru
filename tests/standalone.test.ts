import { mkdirSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { Collection } from 'discord.js';
import { basicStart } from '@pookiesoft/bongbot-core';

vi.mock('@pookiesoft/bongbot-core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@pookiesoft/bongbot-core')>();
    return { ...actual, basicStart: vi.fn() };
});

vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return { ...actual, mkdirSync: vi.fn() };
});

it('starts the standalone service through Core with all commands', async () => {
    await import('../src/standalone.js');
    expect(mkdirSync).toHaveBeenCalledWith('logs', { recursive: true });
    expect(vi.mocked(mkdirSync).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(basicStart).mock.invocationCallOrder[0]);
    expect(basicStart).toHaveBeenCalledWith('PookieSoft', 'BongBot-Booru', expect.any(Function));
    const builder = vi.mocked(basicStart).mock.calls[0][2];
    const bot = { commands: new Collection() } as Parameters<typeof builder>[0];
    expect(builder(bot)).toHaveLength(3);
    expect([...bot.commands.keys()]).toEqual(['clown', 'fox', 'booru']);
});
