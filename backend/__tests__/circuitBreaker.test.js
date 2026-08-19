const {
  CircuitBreaker,
  CircuitOpenError
} = require('../utils/circuitBreaker');

describe('CircuitBreaker', () => {
  test('starts CLOSED', () => {
    const breaker = new CircuitBreaker();

    expect(breaker.getState()).toBe('CLOSED');
  });

  test('opens after reaching the failure threshold', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3
    });

    const failingOperation = jest
      .fn()
      .mockRejectedValue(new Error('upstream failed'));

    await expect(
      breaker.execute(failingOperation)
    ).rejects.toThrow('upstream failed');

    await expect(
      breaker.execute(failingOperation)
    ).rejects.toThrow('upstream failed');

    expect(breaker.getState()).toBe('CLOSED');

    await expect(
      breaker.execute(failingOperation)
    ).rejects.toThrow('upstream failed');

    expect(breaker.getState()).toBe('OPEN');
  });

  test('rejects immediately while OPEN', async () => {
    let now = 1000;

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      nowFn: () => now
    });

    const failingOperation = jest
      .fn()
      .mockRejectedValue(new Error('upstream failed'));

    await expect(
      breaker.execute(failingOperation)
    ).rejects.toThrow('upstream failed');

    expect(breaker.getState()).toBe('OPEN');

    const blockedOperation = jest.fn();

    await expect(
      breaker.execute(blockedOperation)
    ).rejects.toBeInstanceOf(CircuitOpenError);

    expect(blockedOperation).not.toHaveBeenCalled();
  });

  test('moves to HALF_OPEN after reset timeout and closes on success', async () => {
    let now = 1000;

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      nowFn: () => now
    });

    await expect(
      breaker.execute(() =>
        Promise.reject(new Error('upstream failed'))
      )
    ).rejects.toThrow();

    expect(breaker.getState()).toBe('OPEN');

    now += 30000;

    const result = await breaker.execute(() =>
      Promise.resolve('ok')
    );

    expect(result).toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  test('reopens when HALF_OPEN probe fails', async () => {
    let now = 1000;

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      nowFn: () => now
    });

    await expect(
      breaker.execute(() =>
        Promise.reject(new Error('first failure'))
      )
    ).rejects.toThrow();

    expect(breaker.getState()).toBe('OPEN');

    now += 30000;

    await expect(
      breaker.execute(() =>
        Promise.reject(new Error('probe failed'))
      )
    ).rejects.toThrow('probe failed');

    expect(breaker.getState()).toBe('OPEN');
  });

  test('does not count failures excluded by the classifier', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      shouldCountFailure: (error) => error.status >= 500
    });

    const clientError = new Error('bad request');
    clientError.status = 400;

    await expect(
      breaker.execute(() => Promise.reject(clientError))
    ).rejects.toThrow('bad request');

    expect(breaker.getState()).toBe('CLOSED');
  });


  test('closes when HALF_OPEN probe fails with an excluded error', async () => {
    let now = 1000;

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 30000,
      nowFn: () => now,
      shouldCountFailure: (error) => error.status >= 500
    });

    const serverError = new Error('upstream failed');
    serverError.status = 503;

    await expect(
      breaker.execute(() => Promise.reject(serverError))
    ).rejects.toThrow('upstream failed');

    expect(breaker.getState()).toBe('OPEN');

    now += 30000;

    const clientError = new Error('bad request');
    clientError.status = 400;

    await expect(
      breaker.execute(() => Promise.reject(clientError))
    ).rejects.toThrow('bad request');

    expect(breaker.getState()).toBe('CLOSED');
  });

});
