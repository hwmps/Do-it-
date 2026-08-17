process.env.JWT_SECRET = 'test-jwt-secret';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_DYNAMODB_TABLE_FAVORITES = 'TestFavorites';

const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb');

  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: mockSend
      }))
    }
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');

const {
  QueryCommand,
  PutCommand,
  DeleteCommand
} = require('@aws-sdk/lib-dynamodb');

const app = require('../server');

const makeToken = () =>
  jwt.sign(
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

describe('Favorites API', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  test('GET /api/v1/favorites returns current user favorites', async () => {
    mockSend.mockResolvedValue({
      Items: [
        { courseId: '1' },
        { courseId: '8' }
      ]
    });

    const response = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: 'success',
      favorites: ['1', '8']
    });

    const command = mockSend.mock.calls[0][0];

    expect(command).toBeInstanceOf(QueryCommand);
    expect(command.input.TableName).toBe('TestFavorites');
    expect(command.input.ExpressionAttributeValues).toEqual({
      ':userId': 'test-user-123'
    });
  });

  test('POST /api/v1/favorites/:courseId stores a favorite', async () => {
    mockSend.mockResolvedValue({});

    const response = await request(app)
      .post('/api/v1/favorites/42')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      status: 'success',
      courseId: '42'
    });

    const command = mockSend.mock.calls[0][0];

    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input.TableName).toBe('TestFavorites');
    expect(command.input.Item).toEqual(
      expect.objectContaining({
        userId: 'test-user-123',
        courseId: '42'
      })
    );
  });

  test('DELETE /api/v1/favorites/:courseId removes a favorite', async () => {
    mockSend.mockResolvedValue({});

    const response = await request(app)
      .delete('/api/v1/favorites/42')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: 'success',
      courseId: '42'
    });

    const command = mockSend.mock.calls[0][0];

    expect(command).toBeInstanceOf(DeleteCommand);
    expect(command.input.TableName).toBe('TestFavorites');
    expect(command.input.Key).toEqual({
      userId: 'test-user-123',
      courseId: '42'
    });
  });
});
