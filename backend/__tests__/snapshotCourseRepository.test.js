const {
  SnapshotCourseRepository
} = require(
  "../repositories/snapshotCourseRepository"
);

describe("SnapshotCourseRepository", () => {
  const courses = [
    {
      sourceId: "course-1",
      title: "Course 1"
    },
    {
      sourceId: "course-2",
      title: "Course 2"
    },
    {
      sourceId: "course-3",
      title: "Course 3"
    },
    {
      sourceId: "course-4",
      title: "Course 4"
    }
  ];

  test("returns the first page without DynamoDB", async () => {
    const repository =
      new SnapshotCourseRepository({
        courses
      });

    const result =
      await repository.listPage({
        limit: 2
      });

    expect(result.items)
      .toEqual([
        courses[0],
        courses[1]
      ]);

    expect(result.nextKey)
      .toEqual({
        sourceId: "course-2"
      });
  });

  test("continues from the supplied startKey", async () => {
    const repository =
      new SnapshotCourseRepository({
        courses
      });

    const result =
      await repository.listPage({
        limit: 2,
        startKey: {
          sourceId: "course-2"
        }
      });

    expect(result.items)
      .toEqual([
        courses[2],
        courses[3]
      ]);

    expect(result.nextKey)
      .toBeUndefined();
  });

  test("caps the page size at 100", async () => {
    const manyCourses =
      Array.from(
        { length: 150 },
        (_, index) => ({
          sourceId:
            `course-${index}`,
          title:
            `Course ${index}`
        })
      );

    const repository =
      new SnapshotCourseRepository({
        courses: manyCourses
      });

    const result =
      await repository.listPage({
        limit: 500
      });

    expect(result.items)
      .toHaveLength(100);

    expect(result.nextKey)
      .toEqual({
        sourceId: "course-99"
      });
  });

  test("rejects duplicate sourceIds", () => {
    expect(() =>
      new SnapshotCourseRepository({
        courses: [
          {
            sourceId: "same-id"
          },
          {
            sourceId: "same-id"
          }
        ]
      })
    ).toThrow(
      "duplicate sourceId"
    );
  });

  test("requires an array of courses", () => {
    expect(() =>
      new SnapshotCourseRepository({
        courses: null
      })
    ).toThrow(
      "courses must be an array"
    );
  });
});
