function createUserRateLimiter({
  limit = 5,
  windowMs = 60_000,
  nowFn = Date.now
} = {}) {
  const users = new Map();

  function reset() {
    users.clear();
  }

  function middleware(req, res, next) {
    const userId = req.user?.sub;

    // This middleware is expected to run after authentication.
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: '인증이 필요합니다.'
      });
    }

    const now = nowFn();
    let entry = users.get(userId);

    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs
      };

      users.set(userId, entry);
    }

    const remainingMs = Math.max(
      0,
      entry.resetAt - now
    );

    if (entry.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(remainingMs / 1000)
      );

      res.set('Retry-After', String(retryAfterSeconds));
      res.set('RateLimit-Limit', String(limit));
      res.set('RateLimit-Remaining', '0');
      res.set(
        'RateLimit-Reset',
        String(Math.ceil(entry.resetAt / 1000))
      );

      return res.status(429).json({
        status: 'fail',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
      });
    }

    entry.count += 1;

    res.set('RateLimit-Limit', String(limit));
    res.set(
      'RateLimit-Remaining',
      String(Math.max(0, limit - entry.count))
    );
    res.set(
      'RateLimit-Reset',
      String(Math.ceil(entry.resetAt / 1000))
    );

    return next();
  }

  middleware.reset = reset;

  return middleware;
}

module.exports = {
  createUserRateLimiter
};
