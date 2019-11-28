/**
 * A custom Error that includes information about why it was thrown.
 * Useful for identifying if the error was caused by the server or
 * client.
 */
class JobError extends Error {
    constructor(message, reason, originalError) {
        super(message);

        this.reason = reason;
        this.originalError = originalError;
    }
}

// The possible reasons.
JobError.REASON_CLIENT = 400;
JobError.REASON_SERVER = 500;

module.exports = JobError;