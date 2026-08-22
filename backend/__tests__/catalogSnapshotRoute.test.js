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
  "TestCourses";

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
      "doit-snapshot-route-"
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
          "대구 컴퓨터 기초",
        location:
          "대구 평생학습관",
        status: "unknown",
        target: "성인"
      },
      {
        sourceId: "busan-1",
        source:
          "busan-public-data",
        region: "Busan",
        countryCode: "KR",
        language: "ko",
        title:
          "부산 코딩 기초",
        location:
          "부산 평생학습관",
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
      "DynamoDB must not be read in snapshot mode"
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
  "catalog snapshot HTTP route",
  () => {
    afterAll(() => {
      delete process.env
        .CATALOG_READ_MODE;

      delete process.env
        .CATALOG_SNAPSHOT_PATH;

      fs.rmSync(
        snapshotDirectory,
        {
          recursive: true,
          force: true
        }
      );
    });

    test(
      "serves catalog search from snapshot without DynamoDB reads",
      async () => {
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
              sourceId:
                "daegu-1",

              region:
                "Daegu",

              titleKo:
                "대구 컴퓨터 기초"
            })
          ]);

        expect(mockDynamoSend)
          .not
          .toHaveBeenCalled();
      }
    );
  }
);
