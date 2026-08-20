const {
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");

const {
  CourseRepository
} = require("../repositories/courseRepository");

describe("CourseRepository", () => {
  test("upserts a course using sourceId as the stable key", async () => {
    const client = {
      send: jest.fn().mockResolvedValue({})
    };

    const repository = new CourseRepository({
      client,
      tableName: "TestCourses"
    });

    const course = {
      source: "busan-public-data",
      sourceId: "stable-course-id",
      titleKo: "AI 데이터 분석",
      locationKo: "부산 평생학습관",
      status: "접수중",
      target: "성인",
      lat: 35.1795,
      lng: 129.0756,
      coordinateSource: "upstream"
    };

    await repository.upsert(course, {
      now: "2026-08-20T00:00:00.000Z"
    });

    expect(client.send).toHaveBeenCalledTimes(1);

    const command =
      client.send.mock.calls[0][0];

    expect(command).toBeInstanceOf(UpdateCommand);

    expect(command.input.TableName)
      .toBe("TestCourses");

    expect(command.input.Key)
      .toEqual({
        sourceId: "stable-course-id"
      });
  });

  test("uses the same DynamoDB key when the same source record is ingested again", async () => {
    const client = {
      send: jest.fn().mockResolvedValue({})
    };

    const repository = new CourseRepository({
      client,
      tableName: "TestCourses"
    });

    const course = {
      source: "busan-public-data",
      sourceId: "stable-course-id",
      titleKo: "Python 기초"
    };

    await repository.upsert(course, {
      now: "2026-08-20T00:00:00.000Z"
    });

    await repository.upsert(course, {
      now: "2026-08-21T00:00:00.000Z"
    });

    const first =
      client.send.mock.calls[0][0];

    const second =
      client.send.mock.calls[1][0];

    expect(first.input.Key)
      .toEqual(second.input.Key);
  });

  test("requires a table name", () => {
    expect(() =>
      new CourseRepository({
        client: { send: jest.fn() }
      })
    ).toThrow("tableName");
  });

  test("rejects a course without sourceId", async () => {
    const repository = new CourseRepository({
      client: { send: jest.fn() },
      tableName: "TestCourses"
    });

    await expect(
      repository.upsert({
        titleKo: "Invalid Course"
      })
    ).rejects.toThrow("sourceId");
  });
});
