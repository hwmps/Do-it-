const fs =
  require("fs");

const os =
  require("os");

const path =
  require("path");

process.env.JWT_SECRET =
  "test-jwt-secret";

process.env.AWS_REGION =
  "ap-northeast-2";

process.env.AWS_DYNAMODB_TABLE_COURSES =
  "";

process.env.AWS_DYNAMODB_TABLE_FAVORITES =
  "TestFavorites";

process.env.PUBLIC_DATA_API_KEY =
  "test-public-key";

process.env.CATALOG_READ_MODE =
  "snapshot";

const snapshotDirectory =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "doit-snapshot-no-dynamo-"
    )
  );

const snapshotPath =
  path.join(
    snapshotDirectory,
    "catalog.json"
  );

fs.writeFileSync(
  snapshotPath,
  JSON.stringify({
    schemaVersion: 1,

    generatedAt:
      "2026-08-22T12:00:00.000Z",

    courses: [
      {
        sourceId: "daegu-1",
        source:
          "daegu-lifelong-learning",
        region: "Daegu",
        countryCode: "KR",
        language: "ko",
        title:
          "대구 데이터 분석",
        location:
          "대구 평생학습관",
        status: "unknown",
        target: "성인"
      }
    ]
  }),
  "utf8"
);

process.env.CATALOG_SNAPSHOT_PATH =
  snapshotPath;

const mockDynamoSend =
  jest.fn(() => {
    throw new Error(
      "DynamoDB must not be used"
    );
  });

jest.mock(
  "@aws-sdk/lib-dynamodb",
  () => {
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
  }
);

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContent:
        jest.fn()
    }
  }))
}));

const request =
  require("supertest");

const app =
  require("../server");

describe(
  "catalog snapshot without DynamoDB table",
  () => {
    afterAll(() => {
      delete process.env
        .CATALOG_READ_MODE;

      delete process.env
        .CATALOG_SNAPSHOT_PATH;

      delete process.env
        .AWS_DYNAMODB_TABLE_COURSES;

      fs.rmSync(
        snapshotDirectory,
        {
          recursive: true,
          force: true
        }
      );
    });

    test(
      "serves catalog search without a DynamoDB course table",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/v1/catalog/search?region=Daegu&limit=50"
            );

        expect(response.status)
          .toBe(200);

        expect(response.body.count)
          .toBe(1);

        expect(response.body.data[0])
          .toEqual(
            expect.objectContaining({
              sourceId:
                "daegu-1",

              region:
                "Daegu",

              titleKo:
                "대구 데이터 분석"
            })
          );

        expect(mockDynamoSend)
          .not
          .toHaveBeenCalled();
      }
    );
  }
);

