const {
  withRetry,
  isRetryableError
} = require('../utils/retry');

describe('retry utility', () => {
  test('retries timeout errors and eventually succeeds', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce({ code: 'ECONNABORTED' })
      .mockResolvedValueOnce('ok');

    const sleepFn = jest.fn().mockResolvedValue();

    const result = await withRetry(operation, {
      sleepFn,
      randomFn: () => 0
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledWith(100);
  });

  test('retries HTTP 503 errors', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce({
        response: { status: 503 }
      })
      .mockResolvedValueOnce('ok');

    const result = await withRetry(operation, {
      sleepFn: jest.fn().mockResolvedValue(),
      randomFn: () => 0
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('does not retry non-retryable HTTP 400 errors', async () => {
    const error = {
      response: { status: 400 }
    };

    const operation = jest
      .fn()
      .mockRejectedValue(error);

    await expect(
      withRetry(operation, {
        sleepFn: jest.fn().mockResolvedValue()
      })
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('stops after maxAttempts', async () => {
    const error = {
      response: { status: 503 }
    };

    const operation = jest
      .fn()
      .mockRejectedValue(error);

    const sleepFn = jest.fn().mockResolvedValue();

    await expect(
      withRetry(operation, {
        maxAttempts: 3,
        sleepFn,
        randomFn: () => 0
      })
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenNthCalledWith(1, 100);
    expect(sleepFn).toHaveBeenNthCalledWith(2, 200);
  });

  test('classifies retryable errors correctly', () => {
    expect(
      isRetryableError({ response: { status: 429 } })
    ).toBe(true);

    expect(
      isRetryableError({ response: { status: 500 } })
    ).toBe(true);

    expect(
      isRetryableError({ code: 'ETIMEDOUT' })
    ).toBe(true);

    expect(
      isRetryableError({ response: { status: 404 } })
    ).toBe(false);
  });
});


describe('isRetryableError', () => {
  test.each([
    [400, false],
    [401, false],
    [404, false],
    [429, true],
    [500, true],
    [503, true]
  ])(
    'treats HTTP status %s as retryable=%s',
    (status, expected) => {
      const error = {
        response: { status }
      };

      expect(isRetryableError(error)).toBe(expected);
    }
  );

  test.each([
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EAI_AGAIN'
  ])(
    'treats network error %s as retryable',
    (code) => {
      const error = { code };

      expect(isRetryableError(error)).toBe(true);
    }
  );
});
