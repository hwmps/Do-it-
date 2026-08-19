class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
    this.code = 'CIRCUIT_OPEN';
  }
}

class CircuitBreaker {
  constructor({
    failureThreshold = 3,
    resetTimeoutMs = 30000,
    nowFn = Date.now,
    shouldCountFailure = () => true
  } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.nowFn = nowFn;
    this.shouldCountFailure = shouldCountFailure;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      const elapsed = this.nowFn() - this.openedAt;

      if (elapsed < this.resetTimeoutMs) {
        throw new CircuitOpenError();
      }

      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      if (this.shouldCountFailure(error)) {
        this.recordFailure();
      } else if (this.state === 'HALF_OPEN') {
        this.reset();
      }

      throw error;
    }
  }

  recordFailure() {
    if (this.state === 'HALF_OPEN') {
      this.open();
      return;
    }

    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  open() {
    this.state = 'OPEN';
    this.openedAt = this.nowFn();
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = null;
  }

  getState() {
    return this.state;
  }
}

module.exports = {
  CircuitBreaker,
  CircuitOpenError
};
