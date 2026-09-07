// TODO: move this into bongbot-core, most likely into the logging handler. buildErrorHelper already
// holds both halves, passing the message to the embed and the error to LOGGER, so it could walk the
// cause chain itself and every bot would get the detail without copying this file.
/**
 * Builds an error safe to put in front of a user, keeping the real failure on its stack.
 *
 * @param message Text shown in the Discord embed.
 * @param cause   The failure to record, walked to the end of its cause chain.
 * @returns An error to throw.
 */
export function userFacingError(message: string, cause: unknown): Error {
    const failure = new Error(message);
    failure.stack = `${failure.stack}\nCaused by: ${describeCause(cause)}`;
    return failure;
}

function describeCause(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const detail = `${error.stack}`;
    return error.cause ? `${detail}\nCaused by: ${describeCause(error.cause)}` : detail;
}
