import { expect, it, vi } from 'vitest';
import { RetryingCaller } from '../../src/helpers/retrying_caller.js';

const reset = () => new TypeError('fetch failed', { cause: new Error('read ECONNRESET') });

it('passes every argument through and returns the first answer', async () => {
    const get = vi.fn().mockResolvedValue({ post: [] });
    const caller = new RetryingCaller({ get });
    await expect(caller.get('https://gelbooru.com', '/index.php', 'tags=solo', { A: 'b' }, 'binary')).resolves.toEqual({
        post: [],
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('https://gelbooru.com', '/index.php', 'tags=solo', { A: 'b' }, 'binary');
});

it('repeats a request that got no response', async () => {
    const get = vi.fn().mockRejectedValueOnce(reset()).mockRejectedValueOnce(reset()).mockResolvedValue({ post: [] });
    await expect(new RetryingCaller({ get }).get('https://gelbooru.com')).resolves.toEqual({ post: [] });
    expect(get).toHaveBeenCalledTimes(3);
});

it('gives up once the attempts are spent', async () => {
    const get = vi.fn().mockRejectedValue(reset());
    await expect(new RetryingCaller({ get }).get('https://gelbooru.com')).rejects.toThrow('fetch failed');
    expect(get).toHaveBeenCalledTimes(3);
});

it('does not repeat a request the server answered', async () => {
    const get = vi.fn().mockRejectedValue(new Error('Network response was not ok: 429 Too Many Requests'));
    await expect(new RetryingCaller({ get }).get('https://gelbooru.com')).rejects.toThrow('429');
    expect(get).toHaveBeenCalledTimes(1);
});
