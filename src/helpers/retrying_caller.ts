import type { Caller } from '@pookiesoft/bongbot-core';

const ATTEMPTS = 3;

// TODO: bake this into Core's Caller, most likely as a retry-attempts parameter on get that defaults
// to 0, so every bot can ask for it and none inherits it unasked. This wrapper then goes away and
// standalone.ts passes the count instead.
/**
 * Gelbooru resets about one connection in five from a datacentre address, so a lone attempt
 * fails often enough to be seen. Only a failure that produced no response is worth repeating:
 * fetch rejects with a TypeError when nothing came back, whilst Core throws a plain Error for
 * a status it did receive, and repeating a 401 or a 429 helps nobody.
 */
export class RetryingCaller implements Pick<Caller, 'get'> {
    constructor(private readonly caller: Pick<Caller, 'get'>) {}

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
