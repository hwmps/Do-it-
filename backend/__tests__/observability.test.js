const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../observability/logger', () => ({
  logger: mockLogger
}));

const mockMetrics = {
  addMetric: jest.fn(),
  addMetadata: jest.fn(),
  publishStoredMetrics: jest.fn()
};

jest.mock('../observability/metrics', () => ({
  metrics: mockMetrics,
  MetricUnit: {
    Count: 'Count',
    Milliseconds: 'Milliseconds'
  }
}));

const express = require('express');
const request = require('supertest');
const {
  requestObservability
} = require('../middleware/requestObservability');

describe('Request Observability', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use(requestObservability);

    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.post('/secure', (req, res) => {
      req.user = {
        sub: 'test-user-123',
        email: 'private@example.com'
      };

      res.json({ status: 'ok' });
    });
  });

  test('every response includes X-Request-Id', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);

    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  test('response request ID matches structured log correlation ID', async () => {
    const response = await request(app)
      .get('/health');

    const requestId = response.headers['x-request-id'];

    const completedLogCall =
      mockLogger.info.mock.calls.find(
        ([message, data]) =>
          message === 'HTTP request completed' &&
          data?.event === 'http.request.completed'
      );

    expect(completedLogCall).toBeDefined();

    const [, logData] = completedLogCall;

    expect(logData.correlationId).toBe(requestId);
    expect(logData.statusCode).toBe(200);
    expect(logData.method).toBe('GET');
    expect(logData.path).toBe('/health');
    expect(logData.durationMs).toEqual(expect.any(Number));
  });

  test('logs do not contain authentication tokens or private request data', async () => {
    const secretToken = 'super-secret-jwt-token';
    const privateEmail = 'private@example.com';
    const privatePassword = 'do-not-log-this-password';

    await request(app)
      .post('/secure')
      .set('Authorization', `Bearer ${secretToken}`)
      .send({
        email: privateEmail,
        password: privatePassword
      });

    const serializedLogs = JSON.stringify({
      info: mockLogger.info.mock.calls,
      warn: mockLogger.warn.mock.calls,
      error: mockLogger.error.mock.calls
    });

    expect(serializedLogs).not.toContain(secretToken);
    expect(serializedLogs).not.toContain(privateEmail);
    expect(serializedLogs).not.toContain(privatePassword);
    expect(serializedLogs).not.toContain('Authorization');
  });
});

describe('Request Metrics', () => {
  test('emits request count, latency, and error metrics', async () => {
    jest.clearAllMocks();

    const app = express();
    app.use(requestObservability);

    app.get('/metrics-test', (req, res) => {
      res.status(503).json({ status: 'fail' });
    });

    await request(app).get('/metrics-test');

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      'RequestCount',
      'Count',
      1
    );

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      'RequestLatency',
      'Milliseconds',
      expect.any(Number)
    );

    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      'ServerErrorCount',
      'Count',
      1
    );

    expect(mockMetrics.publishStoredMetrics)
      .toHaveBeenCalledTimes(1);
  });
});
