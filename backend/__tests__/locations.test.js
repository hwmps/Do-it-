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

const mockPublicDataMetrics = {
  addMetric: jest.fn(),
  addMetadata: jest.fn(),
  publishStoredMetrics: jest.fn()
};

jest.mock('../observability/metrics', () => ({
  metrics: mockMetrics,
  aiMetrics: mockAiMetrics,
  publicDataMetrics: mockPublicDataMetrics,
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
        getCrsTrnngInfo: {
          body: {
            items: {
              item: [
                {
                  lctreNm: 'Public API Course',
                  adres: 'Busan Learning Center',
                  crsPeriod: '2026.09.01 ~ 2026.10.01',
                  trget: '성인',
                  adresLa: '35.1',
                  adresLo: '129.1'
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
          getCrsTrnngInfo: {
            body: {
              items: {
                item: [
                  {
                    lctreNm: 'Recovered Course',
                    adres: 'Recovered Center'
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

    expect(mockPublicDataMetrics.addMetric)
      .toHaveBeenCalledWith(
        'PublicDataRetryCount',
        'Count',
        1
      );

    expect(
      mockPublicDataMetrics.addMetric.mock.calls
        .filter(([name]) => name === 'PublicDataRetryCount')
    ).toHaveLength(1);
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

    expect(mockPublicDataMetrics.addMetric)
      .toHaveBeenCalledWith(
        'PublicDataFallbackCount',
        'Count',
        1
      );

    expect(
      mockPublicDataMetrics.addMetric.mock.calls
        .filter(([name]) => name === 'PublicDataRetryCount')
    ).toHaveLength(0);
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

    const circuitOpenMetrics =
      mockPublicDataMetrics.addMetric.mock.calls
        .filter(
          ([name]) =>
            name === 'PublicDataCircuitBreakerOpenCount'
        );

    expect(circuitOpenMetrics).toHaveLength(1);

    const fallbackMetrics =
      mockPublicDataMetrics.addMetric.mock.calls
        .filter(
          ([name]) =>
            name === 'PublicDataFallbackCount'
        );

    // 3 failed requests + 1 request blocked by the OPEN circuit.
    expect(fallbackMetrics).toHaveLength(4);
  });


  test("filters and sorts courses by distance for a nearby query", async () => {
    axios.get.mockResolvedValue({
      data: {
        getCrsTrnngInfo: {
          body: {
            items: {
              item: [
                { lctreNm: "Closest Course", adres: "Center A", adresLa: "35.1795", adresLo: "129.0756" },
                { lctreNm: "Nearby Course", adres: "Center B", adresLa: "35.2000", adresLo: "129.0900" },
                { lctreNm: "Far Course", adres: "Center C", adresLa: "35.3000", adresLo: "129.2000" }
              ]
            }
          }
        }
      }
    });

    const response = await request(app)
      .get("/api/v1/locations/search?lat=35.1795&lng=129.0756&radiusKm=5");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);

    expect(
      response.body.data.map((course) => course.titleKo)
    ).toEqual(["Closest Course", "Nearby Course"]);

    expect(response.body.data[0].distanceKm)
      .toEqual(expect.any(Number));

    expect(response.body.data[0].distanceKm)
      .toBeLessThan(response.body.data[1].distanceKm);
  });

  test("rejects an incomplete nearby query before calling upstream", async () => {
    const response = await request(app)
      .get("/api/v1/locations/search?lat=35.1795");

    expect(response.status).toBe(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: "error",
        code: "INVALID_GEO_QUERY"
      })
    );

    expect(axios.get).not.toHaveBeenCalled();
  });


  test("applies query and status filters when upstream succeeds", async () => {
    axios.get.mockResolvedValue({
      data: {
        getCrsTrnngInfo: {
          body: {
            items: {
              item: [
                {
                  lctreNm: "AI Open Course",
                  adres: "Center A",
                  progrsSttusNm: "접수중",
                  adresLa: "35.16",
                  adresLo: "129.07"
                },
                {
                  lctreNm: "AI Closed Course",
                  adres: "Center B",
                  progrsSttusNm: "마감",
                  adresLa: "35.17",
                  adresLo: "129.08"
                },
                {
                  lctreNm: "Python Open Course",
                  adres: "Center C",
                  progrsSttusNm: "접수중",
                  adresLa: "35.18",
                  adresLo: "129.09"
                }
              ]
            }
          }
        }
      }
    });

    const response = await request(app)
      .get("/api/v1/locations/search?query=AI&status=접수중");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].titleKo)
      .toBe("AI Open Course");

    const closedResponse = await request(app)
      .get("/api/v1/locations/search?query=AI&status=마감");

    expect(closedResponse.status).toBe(200);
    expect(closedResponse.body.count).toBe(1);
    expect(closedResponse.body.data[0].titleKo)
      .toBe("AI Closed Course");
  });

  test("preserves the same search semantics when fallback data is used", async () => {
    axios.get.mockRejectedValue({
      response: { status: 400 },
      name: "AxiosError"
    });

    const response = await request(app)
      .get("/api/v1/locations/search?query=파이썬&status=접수중&target=중장년");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].titleKo)
      .toContain("파이썬");
    expect(response.body.data[0].status)
      .toBe("접수중");
    expect(response.body.data[0].target)
      .toBe("중장년");
  });

});
