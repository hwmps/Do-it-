const {
  ScanCommand
} = require("@aws-sdk/lib-dynamodb");

const {
  CourseRepository
} = require("../repositories/courseRepository");

describe("CourseRepository catalog reads", () => {
  test("reads a bounded page from the course catalog", async () => {
    const client = {
      send: jest.fn()
        .mockResolvedValue({
          Items: [
            {
              sourceId: "course-1",
              source: "busan-public-data",
              title: "부산 Python 기초"
            },
            {
              sourceId: "course-2",
              source: "daegu-lifelong-learning",
              title: "대구 컴퓨터 기초"
            }
          ],
          LastEvaluatedKey: {
            sourceId: "course-2"
          }
        })
    };

    const repository =
      new CourseRepository({
        client,
        tableName: "DoItCourses"
      });

    const result =
      await repository.listPage({
        limit: 50
      });

    expect(
      client.send
    ).toHaveBeenCalledTimes(1);

    const command =
      client.send.mock.calls[0][0];

    expect(command)
      .toBeInstanceOf(ScanCommand);

    expect(command.input)
      .toEqual(
        expect.objectContaining({
          TableName:
            "DoItCourses",
          Limit: 50
        })
      );

    expect(result).toEqual({
      items: [
        {
          sourceId: "course-1",
          source: "busan-public-data",
          title: "부산 Python 기초"
        },
        {
          sourceId: "course-2",
          source: "daegu-lifelong-learning",
          title: "대구 컴퓨터 기초"
        }
      ],
      nextKey: {
        sourceId: "course-2"
      }
    });
  });

  test("continues from an exclusive start key", async () => {
    const client = {
      send: jest.fn()
        .mockResolvedValue({
          Items: [],
          LastEvaluatedKey:
            undefined
        })
    };

    const repository =
      new CourseRepository({
        client,
        tableName:
          "DoItCourses"
      });

    await repository.listPage({
      limit: 25,
      startKey: {
        sourceId:
          "previous-course"
      }
    });

    const command =
      client.send.mock.calls[0][0];

    expect(command.input)
      .toEqual(
        expect.objectContaining({
          TableName:
            "DoItCourses",
          Limit: 25,
          ExclusiveStartKey: {
            sourceId:
              "previous-course"
          }
        })
      );
  });

  test("caps page size to prevent unbounded reads", async () => {
    const client = {
      send: jest.fn()
        .mockResolvedValue({
          Items: []
        })
    };

    const repository =
      new CourseRepository({
        client,
        tableName:
          "DoItCourses"
      });

    await repository.listPage({
      limit: 5000
    });

    const command =
      client.send.mock.calls[0][0];

    expect(command.input.Limit)
      .toBe(100);
  });
});
