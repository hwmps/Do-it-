process.env.JWT_SECRET = "test-jwt-secret";
process.env.AWS_REGION = "ap-northeast-2";
process.env.AWS_DYNAMODB_TABLE_COURSES = "TestCourses";
process.env.AWS_DYNAMODB_TABLE_FAVORITES = "TestFavorites";
process.env.PUBLIC_DATA_API_KEY = "test-public-key";

const mockDynamoSend = jest.fn();

jest.mock("@aws-sdk/lib-dynamodb", () => {
  const actual =
    jest.requireActual(
      "@aws-sdk/lib-dynamodb"
    );

  return {
    ...actual,

    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: mockDynamoSend
      }))
    }
  };
});

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContent: jest.fn()
    }
  }))
}));

const request =
  require("supertest");

const app =
  require("../server");

describe("catalog search repository cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockDynamoSend.mockResolvedValue({
      Items: [
        {
          sourceId: "course-1",
          source: "daegu-lifelong-learning",
          region: "Daegu",
          title: "컴퓨터 기초",
          location: "대구 평생학습관"
        }
      ],
      LastEvaluatedKey:
        undefined
    });
  });

  test("reuses the same DynamoDB page for repeated catalog requests", async () => {
    const first =
      await request(app)
        .get(
          "/api/v1/catalog/search?limit=1"
        );

    const second =
      await request(app)
        .get(
          "/api/v1/catalog/search?limit=1"
        );

    expect(first.status)
      .toBe(200);

    expect(second.status)
      .toBe(200);

    expect(first.body.data)
      .toEqual(second.body.data);

    expect(mockDynamoSend)
      .toHaveBeenCalledTimes(1);
  });
});
