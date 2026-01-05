"use strict";
/**
 * Unified Timeout Utility for AI Providers (Phase 5)
 *
 * Provides consistent timeout handling across all AI providers with automatic cleanup.
 *
 * Compliance: AGENT_CONTEXT_ULTIMATE.md - 100% Production Quality
 * - No manual setTimeout/clearTimeout management in provider code
 * - Consistent error messages
 * - Automatic cleanup with finally block
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_REQUEST_TIMEOUT = void 0;
exports.withTimeout = withTimeout;
/**
 * Wraps a promise with a timeout, automatically cleaning up the timer.
 *
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout duration in milliseconds
 * @param providerName - Name of the AI provider (for error messages)
 * @returns The result of the promise if it resolves before timeout
 * @throws Error if the promise doesn't resolve within the timeout period
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   model.generateContent(prompt),
 *   120000,
 *   'Gemini'
 * );
 * ```
 */
async function withTimeout(promise, timeoutMs, providerName) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${providerName} request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    try {
        // Race between the actual promise and the timeout
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        // Always clean up the timeout, whether promise resolved or rejected
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
}
/**
 * Standard AI request timeout (2 minutes)
 *
 * Increased to 120 seconds to allow comprehensive framework analysis
 * and complex reasoning operations.
 */
exports.AI_REQUEST_TIMEOUT = 120000; // 120 seconds (2 minutes)
//# sourceMappingURL=timeout.js.map