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

describe("catalog region route", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockDynamoSend.mockResolvedValue({
      Items: [
        {
          sourceId: "busan-1",
          source: "busan-public-data",
          titleKo: "부산 파이썬 기초",
          locationKo: "부산 평생학습관",
          status: "접수중",
          target: "성인"
        },
        {
          sourceId: "daegu-1",
          source: "daegu-lifelong-learning",
          region: "Daegu",
          title: "대구 컴퓨터 기초",
          location: "대구 평생학습관",
          status: "unknown",
          target: "성인"
        }
      ],
      LastEvaluatedKey:
        undefined
    });
  });

  test("returns only Daegu courses for region=Daegu", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/catalog/search?region=Daegu&limit=50"
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.status)
      .toBe("success");

    expect(response.body.count)
      .toBe(1);

    expect(response.body.data)
      .toEqual([
        expect.objectContaining({
          sourceId: "daegu-1",
          source:
            "daegu-lifelong-learning",
          region: "Daegu",
          titleKo:
            "대구 컴퓨터 기초"
        })
      ]);
  });

  test("returns legacy Busan courses for region=Busan", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/catalog/search?region=Busan&limit=50"
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.count)
      .toBe(1);

    expect(response.body.data)
      .toEqual([
        expect.objectContaining({
          sourceId: "busan-1",
          source:
            "busan-public-data",
          region: "Busan",
          titleKo:
            "부산 파이썬 기초"
        })
      ]);
  });
});
