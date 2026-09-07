import type { Caller } from '@pookiesoft/bongbot-core';

const ATTEMPTS = 3;

// TODO: bake this into Core's Caller, most likely as a retry-attempts parameter on get that defaults
// to 0, so every bot can ask for it and none inherits it unasked. This wrapper then goes away and
// standalone.ts passes the count instead.
/**
 * A {@link Caller} wrapper that repeats a `get` which produced no response at all.
 */
export class RetryingCaller implements Pick<Caller, 'get'> {
    constructor(private readonly caller: Pick<Caller, 'get'>) {}

    /**
     * @param request Arguments passed straight to the wrapped caller.
     * @returns The wrapped caller's response.
     * @throws {Error} At once for a failure that carried a response, or the last error once the attempts are spent.
     */
    async get(...request: Parameters<Caller['get']>): ReturnType<Caller['get']> {
        for (let attempt = 1; ; attempt++) {
            try {
                return await this.caller.get(...request);
            } catch (error) {
                if (attempt === ATTEMPTS || !(error instanceof TypeError)) throw error;
            }
        }
    }
}
