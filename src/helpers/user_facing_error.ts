// TODO: move this into bongbot-core, most likely into the logging handler. buildErrorHelper already
// holds both halves, passing the message to the embed and the error to LOGGER, so it could walk the
// cause chain itself and every bot would get the detail without copying this file.
/**
 * An error whose message is safe to put in front of a user, carrying the real failure on its stack.
 * Core's error builder shows the message in the embed and gives the logger both, so the upstream
 * status, body and URL stay out of Discord and stay in the log.
 */
export function userFacingError(message: string, cause: unknown): Error {
    const failure = new Error(message);
    failure.stack = `${failure.stack}\nCaused by: ${describeCause(cause)}`;
    return failure;
}

// fetch reports a bare "TypeError: fetch failed" and keeps the reason on its cause, which nests.
function describeCause(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const detail = `${error.stack}`;
    return error.cause ? `${detail}\nCaused by: ${describeCause(error.cause)}` : detail;
}
