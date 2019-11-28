// The possible reasons.
const REASON_CLIENT = 400;
const REASON_SERVER = 500;

/**
 * A custom Error that includes information about why it was thrown.
 * Useful for identifying if the error was caused by the server or
 * client.
 */
class JobError extends Error {
    constructor(message, reason, originalError) {
        this.message = message;
        this.reason = reason;
        this.originalError = originalError;
    }
}

module.exports = {
    ...JobError,
    REASON_CLIENT,
    REASON_SERVER
}