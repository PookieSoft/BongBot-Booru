import { expect, it } from 'vitest';
import { userFacingError } from '../../src/helpers/user_facing_error.js';

it('shows the given message and keeps the whole cause chain on the stack', () => {
    const root = new Error('getaddrinfo ENOTFOUND gelbooru.com');
    const failure = userFacingError('Gelbooru is unavailable.', new TypeError('fetch failed', { cause: root }));
    expect(failure.message).toBe('Gelbooru is unavailable.');
    expect(failure.stack).toContain('Caused by: TypeError: fetch failed');
    expect(failure.stack).toContain('Caused by: Error: getaddrinfo ENOTFOUND gelbooru.com');
});

it('describes a cause that was never an Error', () => {
    expect(userFacingError('Gelbooru is unavailable.', 'socket hang up').stack).toContain('Caused by: socket hang up');
});
