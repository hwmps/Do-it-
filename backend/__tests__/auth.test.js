process.env.JWT_SECRET = 'test-jwt-secret';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_DYNAMODB_TABLE_FAVORITES = 'TestFavorites';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

describe('Authentication API', () => {
  test('GET /api/v1/auth/me without token returns 401', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me');

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      status: 'fail',
      message: '인증 토큰이 필요합니다.'
    });
  });

  test('GET /api/v1/auth/me with valid JWT returns current user', async () => {
    const token = jwt.sign(
      {
        email: 'test@example.com'
      },
      process.env.JWT_SECRET,
      {
        subject: 'test-user-123',
        expiresIn: '1h',
        issuer: 'do-it-api'
      }
    );

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: 'success',
      user: {
        id: 'test-user-123',
        email: 'test@example.com'
      }
    });
  });
});
