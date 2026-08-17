process.env.JWT_SECRET = 'test-jwt-secret';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_DYNAMODB_TABLE_FAVORITES = 'TestFavorites';

const request = require('supertest');
const app = require('../server');

describe('Health endpoint', () => {
  test('GET /api/v1/health returns service health', async () => {
    const response = await request(app)
      .get('/api/v1/health');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'do-it-backend'
    });
  });
});
