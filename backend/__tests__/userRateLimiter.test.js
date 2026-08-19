const {
  createUserRateLimiter
} = require('../middleware/userRateLimiter');

function createResponse() {
  const res = {
    headers: {},
    statusCode: 200,
    body: null
  };

  res.set = jest.fn((name, value) => {
    res.headers[name] = value;
    return res;
  });

  res.status = jest.fn((statusCode) => {
    res.statusCode = statusCode;
    return res;
  });

  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });

  return res;
}

function runMiddleware(middleware, userId = 'user-1') {
  const req = {
    user: userId ? { sub: userId } : undefined
  };

  const res = createResponse();
  const next = jest.fn();

  middleware(req, res, next);

  return { res, next };
}

describe('user rate limiter', () => {
  test('allows requests below the configured limit', () => {
    const limiter = createUserRateLimiter({
      limit: 3,
      windowMs: 60_000,
      nowFn: () => 0
    });

    for (let i = 0; i < 3; i += 1) {
      const { res, next } = runMiddleware(limiter);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalledWith(429);
    }
  });

  test('returns 429 after the limit is exceeded', () => {
    const limiter = createUserRateLimiter({
      limit: 2,
      windowMs: 60_000,
      nowFn: () => 0
    });

    runMiddleware(limiter);
    runMiddleware(limiter);

    const { res, next } = runMiddleware(limiter);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'fail'
      })
    );
    expect(res.headers['Retry-After']).toBe('60');
    expect(res.headers['RateLimit-Remaining']).toBe('0');
  });

  test('allows requests again after the window resets', () => {
    let now = 0;

    const limiter = createUserRateLimiter({
      limit: 1,
      windowMs: 60_000,
      nowFn: () => now
    });

    const first = runMiddleware(limiter);
    expect(first.next).toHaveBeenCalledTimes(1);

    const blocked = runMiddleware(limiter);
    expect(blocked.res.status).toHaveBeenCalledWith(429);

    now = 60_000;

    const afterReset = runMiddleware(limiter);

    expect(afterReset.next).toHaveBeenCalledTimes(1);
    expect(afterReset.res.status).not.toHaveBeenCalledWith(429);
  });

  test('tracks each authenticated user independently', () => {
    const limiter = createUserRateLimiter({
      limit: 1,
      windowMs: 60_000,
      nowFn: () => 0
    });

    runMiddleware(limiter, 'user-a');

    const blockedA = runMiddleware(limiter, 'user-a');
    const allowedB = runMiddleware(limiter, 'user-b');

    expect(blockedA.res.status).toHaveBeenCalledWith(429);
    expect(blockedA.next).not.toHaveBeenCalled();

    expect(allowedB.next).toHaveBeenCalledTimes(1);
    expect(allowedB.res.status).not.toHaveBeenCalledWith(429);
  });

  test('rejects requests without an authenticated user', () => {
    const limiter = createUserRateLimiter();

    const { res, next } = runMiddleware(limiter, null);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
