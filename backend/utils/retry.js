function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const status = error?.response?.status;

  if (status === 429) {
    return true;
  }

  if (status >= 500 && status <= 599) {
    return true;
  }

  const retryableCodes = new Set([
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EAI_AGAIN'
  ]);

  return retryableCodes.has(error?.code);
}

async function withRetry(
  operation,
  {
    maxAttempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 1000,
    jitterRatio = 0.2,
    onRetry = () => {},
    sleepFn = sleep,
    randomFn = Math.random
  } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      const shouldRetry =
        attempt < maxAttempts &&
        isRetryableError(error);

      if (!shouldRetry) {
        throw error;
      }

      const exponentialDelay = Math.min(
        maxDelayMs,
        baseDelayMs * (2 ** (attempt - 1))
      );

      const jitter =
        exponentialDelay *
        jitterRatio *
        randomFn();

      const delayMs = Math.round(
        exponentialDelay + jitter
      );

      onRetry({
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        status: error?.response?.status ?? null,
        code: error?.code ?? null
      });

      await sleepFn(delayMs);
    }
  }

  throw lastError;
}

module.exports = {
  withRetry,
  isRetryableError
};
