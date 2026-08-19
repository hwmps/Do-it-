process.env.JWT_SECRET = 'test-jwt-secret';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_DYNAMODB_TABLE_FAVORITES = 'TestFavorites';
process.env.PUBLIC_DATA_API_KEY = 'super-secret-public-key';

const axios = require('axios');

jest.mock('axios', () => ({
  get: jest.fn()
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContent: jest.fn()
    }
  }))
}));

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

const mockAiMetrics = {
  addMetric: jest.fn(),
  addMetadata: jest.fn(),
  publishStoredMetrics: jest.fn()
};

jest.mock('../observability/metrics', () => ({
  metrics: mockMetrics,
  aiMetrics: mockAiMetrics,
  MetricUnit: {
    Count: 'Count',
    Milliseconds: 'Milliseconds'
  }
}));

const request = require('supertest');
const app = require('../server');

describe('location search resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    app.locals.publicDataCircuitBreaker.reset();
  });

  test('returns public API data when upstream succeeds', async () => {
    axios.get.mockResolvedValue({
      data: {
        getBgliCorsInfoList: {
          body: {
            items: {
              item: [
                {
                  crsNm: 'Public API Course',
                  operInstNm: 'Busan Learning Center',
                  crsPeriod: '2026.09.01 ~ 2026.10.01',
                  trget: '성인',
                  lat: '35.1',
                  lng: '129.1'
                }
              ]
            }
          }
        }
      }
    });

    const response = await request(app)
      .get('/api/v1/locations/search');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].titleKo)
      .toBe('Public API Course');

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test('retries a 503 and succeeds on the next attempt', async () => {
    axios.get
      .mockRejectedValueOnce({
        response: { status: 503 }
      })
      .mockResolvedValueOnce({
        data: {
          getBgliCorsInfoList: {
            body: {
              items: {
                item: [
                  {
                    crsNm: 'Recovered Course',
                    operInstNm: 'Recovered Center'
                  }
                ]
              }
            }
          }
        }
      });

    const response = await request(app)
      .get('/api/v1/locations/search');

    expect(response.status).toBe(200);
    expect(response.body.data[0].titleKo)
      .toBe('Recovered Course');

    expect(axios.get).toHaveBeenCalledTimes(2);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'public-data.retry',
      expect.objectContaining({
        attempt: 1,
        nextAttempt: 2,
        status: 503
      })
    );
  });

  test('does not retry a 400 and immediately uses fallback data', async () => {
    axios.get.mockRejectedValue({
      response: { status: 400 },
      name: 'AxiosError'
    });

    const response = await request(app)
      .get('/api/v1/locations/search?query=파이썬');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data[0].titleKo)
      .toContain('파이썬');

    expect(axios.get).toHaveBeenCalledTimes(1);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'public-data.fallback',
      expect.objectContaining({
        status: 400,
        errorType: 'AxiosError'
      })
    );
  });

  test('falls back after all retry attempts fail', async () => {
    axios.get.mockRejectedValue({
      response: { status: 503 },
      name: 'AxiosError'
    });

    const response = await request(app)
      .get('/api/v1/locations/search');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.count).toBe(4);

    expect(axios.get).toHaveBeenCalledTimes(3);

    const retryLogs = mockLogger.warn.mock.calls
      .filter(([event]) => event === 'public-data.retry');

    expect(retryLogs).toHaveLength(2);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'public-data.fallback',
      expect.objectContaining({
        status: 503,
        errorType: 'AxiosError'
      })
    );
  });

  test('does not log API keys or user search terms in resilience logs', async () => {
    axios.get.mockRejectedValue({
      response: { status: 400 },
      name: 'AxiosError'
    });

    await request(app)
      .get('/api/v1/locations/search?query=PRIVATE_SEARCH_TERM');

    const resilienceLogs = mockLogger.warn.mock.calls
      .filter(([event]) =>
        event === 'public-data.retry' ||
        event === 'public-data.fallback'
      );

    const serializedLogs = JSON.stringify(resilienceLogs);

    expect(serializedLogs)
      .not.toContain('super-secret-public-key');

    expect(serializedLogs)
      .not.toContain('PRIVATE_SEARCH_TERM');
  });

  test('opens the circuit after repeated upstream failures and skips the next upstream call', async () => {
    axios.get.mockRejectedValue({
      response: { status: 503 },
      name: 'AxiosError'
    });

    // Each request exhausts the retry policy (3 axios attempts).
    for (let i = 0; i < 3; i += 1) {
      const response = await request(app)
        .get('/api/v1/locations/search');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    }

    expect(
      app.locals.publicDataCircuitBreaker.getState()
    ).toBe('OPEN');

    // 3 requests × 3 retry attempts = 9 upstream calls.
    expect(axios.get).toHaveBeenCalledTimes(9);

    const fourthResponse = await request(app)
      .get('/api/v1/locations/search');

    expect(fourthResponse.status).toBe(200);
    expect(fourthResponse.body.status).toBe('success');

    // OPEN circuit must prevent any additional upstream request.
    expect(axios.get).toHaveBeenCalledTimes(9);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'public-data.circuit-open',
      expect.objectContaining({
        code: 'CIRCUIT_OPEN',
        errorType: 'CircuitOpenError',
        circuitState: 'OPEN'
      })
    );
  });

});
