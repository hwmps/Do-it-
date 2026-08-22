process.env.JWT_SECRET = "test-jwt-secret";
process.env.AWS_REGION = "ap-northeast-2";
process.env.AWS_DYNAMODB_TABLE_COURSES = "TestCourses";
process.env.AWS_DYNAMODB_TABLE_FAVORITES = "TestFavorites";
process.env.PUBLIC_DATA_API_KEY = "test-public-key";

delete process.env.CATALOG_MAX_SEARCH_PAGES;

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

describe("catalog search read budget", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    let page = 0;

    mockDynamoSend.mockImplementation(
      async () => {
        page += 1;

        return {
          Items: [
            {
              sourceId:
                `busan-${page}`,

              source:
                "busan-public-data",

              titleKo:
                "부산 평생교육 과정",

              locationKo:
                "부산 평생학습관"
            }
          ],

          LastEvaluatedKey: {
            sourceId:
              `cursor-${page}`
          }
        };
      }
    );
  });

  test("limits a filtered HTTP search to three DynamoDB pages by default", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/catalog/search?region=Daegu&limit=50"
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.data)
      .toEqual([]);

    expect(response.body.nextCursor)
      .toBeTruthy();

    expect(mockDynamoSend)
      .toHaveBeenCalledTimes(3);
  });
});
