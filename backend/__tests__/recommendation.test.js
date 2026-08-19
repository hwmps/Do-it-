process.env.JWT_SECRET = 'test-jwt-secret';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_DYNAMODB_TABLE_FAVORITES = 'TestFavorites';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContent: mockGenerateContent
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
const jwt = require('jsonwebtoken');
const app = require('../server');

const authToken = jwt.sign(
  { email: 'test@example.com' },
  process.env.JWT_SECRET,
  {
    subject: 'test-user',
    issuer: 'do-it-api',
    expiresIn: '1h'
  }
);

const withAuth = (req) =>
  req.set('Authorization', `Bearer ${authToken}`);

describe('AI recommendation endpoint', () => {
  const body = {
    userPrompt: 'Is this course good for a beginner?',
    courses: [
      {
        id: 'course-1',
        title: 'Beginner Programming',
        target: 'Adult'
      }
    ],
    lang: 'en'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app.locals.aiRateLimiter.reset();
  });

  test('returns 401 without authentication and does not call Gemini', async () => {
    const response = await request(app)
      .post('/api/v1/recommend/ai')
      .send(body);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('fail');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('returns recommendation when Gemini succeeds', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'This course is suitable for beginners.'
    });

    const response = await withAuth(
      request(app).post('/api/v1/recommend/ai')
    ).send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      recommendation: 'This course is suitable for beginners.'
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.6-flash',
        config: expect.objectContaining({
          httpOptions: {
            timeout: 20000
          }
        })
      })
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Gemini request completed',
      expect.objectContaining({
        event: 'ai.request.completed',
        provider: 'gemini',
        model: 'gemini-3.6-flash'
      })
    );

    expect(mockAiMetrics.addMetric).toHaveBeenCalledWith(
      'AIRequestCount',
      'Count',
      1
    );

    expect(mockAiMetrics.addMetric).toHaveBeenCalledWith(
      'AIRequestLatency',
      'Milliseconds',
      expect.any(Number)
    );

    expect(mockAiMetrics.addMetric).toHaveBeenCalledWith(
      'AIRequestSuccessCount',
      'Count',
      1
    );

    expect(mockAiMetrics.publishStoredMetrics)
      .toHaveBeenCalledTimes(1);
  });

  test('returns 504 when Gemini times out', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('Request timed out')
    );

    const response = await withAuth(
      request(app).post('/api/v1/recommend/ai')
    ).send(body);

    expect(response.status).toBe(504);
    expect(response.body.status).toBe('fail');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Gemini request timed out',
      expect.objectContaining({
        event: 'ai.request.failed',
        timeout: true
      })
    );
  });

  test('returns 502 for non-timeout Gemini failures', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('Gemini upstream failure')
    );

    const response = await withAuth(
      request(app).post('/api/v1/recommend/ai')
    ).send(body);

    expect(response.status).toBe(502);
    expect(response.body.status).toBe('fail');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Gemini request failed',
      expect.objectContaining({
        event: 'ai.request.failed',
        timeout: false
      })
    );
  });

  test('rate limits authenticated users and does not call Gemini after the limit', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Rate limit test response.'
    });

    for (let i = 0; i < 5; i += 1) {
      const response = await withAuth(
        request(app).post('/api/v1/recommend/ai')
      ).send(body);

      expect(response.status).toBe(200);
    }

    const blockedResponse = await withAuth(
      request(app).post('/api/v1/recommend/ai')
    ).send(body);

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.status).toBe('fail');
    expect(blockedResponse.headers['retry-after']).toBeDefined();

    expect(mockGenerateContent).toHaveBeenCalledTimes(5);
  });

});
