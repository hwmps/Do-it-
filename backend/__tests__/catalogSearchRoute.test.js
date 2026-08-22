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

const {
  ScanCommand
} = require("@aws-sdk/lib-dynamodb");

const request =
  require("supertest");

const app =
  require("../server");

describe("catalog search route", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockDynamoSend.mockResolvedValue({
      Items: [
        {
          sourceId: "daegu-1",
          source:
            "daegu-lifelong-learning",
          countryCode: "KR",
          region: "Daegu",
          language: "ko",
          title:
            "대구 컴퓨터 기초",
          location:
            "대구 평생학습관",
          startAt:
            "2026-08-12",
          endAt:
            "2026-09-04",
          status: "unknown",
          target: "성인",
          lat: null,
          lng: null,
          coordinateSource:
            "unknown"
        }
      ],

      LastEvaluatedKey: {
        sourceId:
          "next-course"
      }
    });
  });

  test("serves DynamoDB catalog data through the HTTP API", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/catalog/search?query=대구&limit=1"
        );

    expect(response.status)
      .toBe(200);

    expect(response.body)
      .toEqual(
        expect.objectContaining({
          status: "success",
          count: 1,
          data: [
            expect.objectContaining({
              sourceId:
                "daegu-1",
              source:
                "daegu-lifelong-learning",
              region:
                "Daegu",
              titleKo:
                "대구 컴퓨터 기초",
              locationKo:
                "대구 평생학습관",
              period:
                "2026-08-12 ~ 2026-09-04"
            })
          ],
          nextCursor:
            expect.any(String)
        })
      );

    expect(mockDynamoSend)
      .toHaveBeenCalledTimes(1);

    const command =
      mockDynamoSend
        .mock.calls[0][0];

    expect(command)
      .toBeInstanceOf(
        ScanCommand
      );

    expect(command.input)
      .toEqual(
        expect.objectContaining({
          TableName:
            "TestCourses",
          Limit: 1
        })
      );
  });
});
