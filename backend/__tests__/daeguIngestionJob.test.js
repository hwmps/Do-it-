const {
  runDaeguIngestionJob
} = require("../jobs/ingestDaeguCourses");

describe("Daegu production ingestion job", () => {
  test("refuses DynamoDB writes unless explicitly enabled", async () => {
    const dynamoDb = {
      send: jest.fn()
    };

    await expect(
      runDaeguIngestionJob({
        env: {
          DAEGU_PUBLIC_DATA_API_KEY:
            "test-key",
          AWS_DYNAMODB_TABLE_COURSES:
            "DoItCourses",
          AWS_REGION:
            "ap-northeast-2"
        },
        dynamoDb,
        log: jest.fn()
      })
    ).rejects.toThrow(
      "ALLOW_DYNAMODB_WRITE=true"
    );

    expect(
      dynamoDb.send
    ).not.toHaveBeenCalled();
  });

  test("allows ingestion when DynamoDB writes are explicitly enabled", async () => {
    const firstPageXml = `
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL_SERVICE</resultMsg>
        </header>
        <body>
          <items>
            <item>
              <lec_id>LEARNING_TEST_1</lec_id>
              <lec_title>컴퓨터 기초</lec_title>
              <impl_start_dt>2026.08.12</impl_start_dt>
              <impl_finish_dt>2026.09.04</impl_finish_dt>
              <impl_place>대구 테스트 센터</impl_place>
            </item>
          </items>
        </body>
      </response>
    `;

    const emptyPageXml = `
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL_SERVICE</resultMsg>
        </header>
        <body>
          <items></items>
        </body>
      </response>
    `;

    const httpClient = {
      get: jest.fn()
        .mockResolvedValueOnce({
          data: firstPageXml
        })
        .mockResolvedValueOnce({
          data: emptyPageXml
        })
    };

    const dynamoDb = {
      send: jest.fn()
        .mockResolvedValue({})
    };

    const summary =
      await runDaeguIngestionJob({
        env: {
          DAEGU_PUBLIC_DATA_API_KEY:
            "test-key",
          AWS_DYNAMODB_TABLE_COURSES:
            "DoItCourses",
          AWS_REGION:
            "ap-northeast-2",
          ALLOW_DYNAMODB_WRITE:
            "true",
          COURSE_INGESTION_PAGE_SIZE:
            "50",
          COURSE_INGESTION_MAX_PAGES:
            "10"
        },
        httpClient,
        dynamoDb,
        log: jest.fn()
      });

    expect(
      dynamoDb.send
    ).toHaveBeenCalledTimes(1);

    expect(summary).toEqual(
      expect.objectContaining({
        received: 1,
        normalized: 1,
        unique: 1,
        upserted: 1,
        invalid: 0,
        failed: 0
      })
    );
  });
});
