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

    expect(
      Object.values(
        command.input.ExpressionAttributeValues
      )
    ).toContain("Python 기초");

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
