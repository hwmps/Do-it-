const {
  runCourseIngestionJob
} = require("../jobs/ingestCourses");

describe("course ingestion job", () => {
  test("wires the current Busan API through normalization into DynamoDB", async () => {
    const httpClient = {
      get: jest.fn()
        .mockResolvedValueOnce({
          data: {
            getCrsTrnngInfo: {
              body: {
                items: {
                  item: [{
                    lctreNm: "Python 기초",
                    adres: "부산 교육센터",
                    adresLa: "35.17",
                    adresLo: "129.07",
                    lctreBeginDttm: "2026-09-01",
                    lctreEndDttm: "2026-11-30",
                    progrsSttusNm: "접수중"
                  }]
                }
              }
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            getCrsTrnngInfo: {
              body: {
                items: {
                  item: []
                }
              }
            }
          }
        })
    };

    const dynamoDb = {
      send: jest.fn().mockResolvedValue({
        Attributes: {}
      })
    };

    const log = jest.fn();

    const summary = await runCourseIngestionJob({
      env: {
        PUBLIC_DATA_API_KEY: "test-key",
        AWS_DYNAMODB_TABLE_COURSES: "TestCourses",
        COURSE_INGESTION_PAGE_SIZE: "1",
        COURSE_INGESTION_MAX_PAGES: "5"
      },
      httpClient,
      dynamoDb,
      log
    });

    expect(summary).toEqual({
      pagesFetched: 2,
      pagesIngested: 1,
      received: 1,
      normalized: 1,
      unique: 1,
      duplicates: 0,
      upserted: 1,
      invalid: 0,
      failed: 0
    });

    expect(httpClient.get)
      .toHaveBeenCalledTimes(2);

    expect(dynamoDb.send)
      .toHaveBeenCalledTimes(1);

    const command =
      dynamoDb.send.mock.calls[0][0];

    expect(command.input.TableName)
      .toBe("TestCourses");

    expect(command.input.Key.sourceId)
      .toEqual(expect.any(String));

    const names =
      command.input.ExpressionAttributeNames;

    const values =
      command.input.ExpressionAttributeValues;

    const storedFields = {};

    for (const [placeholder, field] of
      Object.entries(names)) {
      const match =
        placeholder.match(/^#field(\d+)$/);

      if (match) {
        storedFields[field] =
          values[`:value${match[1]}`];
      }
    }

    expect(storedFields).toEqual(
      expect.objectContaining({
        source: "busan-public-data",
        title: "Python 기초",
        location: "부산 교육센터",
        countryCode: "KR",
        region: "Busan",
        language: "ko",
        startAt: "2026-09-01",
        endAt: "2026-11-30",
        status: "접수중",
        lat: 35.17,
        lng: 129.07
      })
    );

    expect(log)
      .toHaveBeenCalledTimes(1);
  });

  test("rejects startup when the course table is not configured", async () => {
    await expect(
      runCourseIngestionJob({
        env: {
          PUBLIC_DATA_API_KEY: "test-key"
        },
        httpClient: {
          get: jest.fn()
        },
        dynamoDb: {
          send: jest.fn()
        },
        log: jest.fn()
      })
    ).rejects.toThrow(
      "AWS_DYNAMODB_TABLE_COURSES"
    );
  });
});
