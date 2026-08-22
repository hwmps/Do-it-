function positiveNumber(
  value,
  fallback
) {
  const parsed =
    Number(value);

  return (
    Number.isFinite(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
}

function createCacheKey({
  limit,
  startKey
}) {
  return JSON.stringify({
    limit:
      limit ?? null,

    startKey:
      startKey ?? null
  });
}

class CachedCourseRepository {
  constructor({
    repository,
    ttlMs = 300000,
    maxEntries = 200,
    now = Date.now
  }) {
    if (
      !repository ||
      typeof repository.listPage !==
        "function"
    ) {
      throw new TypeError(
        "repository with listPage() is required"
      );
    }

    if (typeof now !== "function") {
      throw new TypeError(
        "now must be a function"
      );
    }

    this.repository =
      repository;

    this.ttlMs =
      positiveNumber(
        ttlMs,
        300000
      );

    this.maxEntries =
      Math.floor(
        positiveNumber(
          maxEntries,
          200
        )
      );

    this.now = now;

    this.cache =
      new Map();

    this.inFlight =
      new Map();
  }

  async listPage({
    limit = 50,
    startKey
  } = {}) {
    const key =
      createCacheKey({
        limit,
        startKey
      });

    const currentTime =
      this.now();

    const cached =
      this.cache.get(key);

    if (
      cached &&
      cached.expiresAt >
        currentTime
    ) {
      return cached.value;
    }

    if (cached) {
      this.cache.delete(key);
    }

    const existingRequest =
      this.inFlight.get(key);

    if (existingRequest) {
      return existingRequest;
    }

    const pendingRequest =
      Promise.resolve()
        .then(() =>
          this.repository.listPage({
            limit,
            startKey
          })
        )
        .then((value) => {
          this.cache.set(
            key,
            {
              value,
              expiresAt:
                this.now() +
                this.ttlMs
            }
          );

          this.evictOldEntries();

          return value;
        })
        .finally(() => {
          this.inFlight.delete(key);
        });

    this.inFlight.set(
      key,
      pendingRequest
    );

    return pendingRequest;
  }

  evictOldEntries() {
    while (
      this.cache.size >
      this.maxEntries
    ) {
      const oldestKey =
        this.cache.keys()
          .next()
          .value;

      this.cache.delete(
        oldestKey
      );
    }
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }
}

module.exports = {
  CachedCourseRepository
};
