const {
  applyCourseSearch
} = require("../utils/courseSearch");

describe("course search Korean term boundaries", () => {
  test("does not match 대구 inside 해운대구", () => {
    const courses = [
      {
        sourceId: "daegu-1",
        titleKo: "컴퓨터 기초",
        locationKo: "대구평생교육원"
      },
      {
        sourceId: "busan-1",
        titleKo: "탁구교실",
        locationKo:
          "부산 해운대구 선수촌로 85"
      }
    ];

    const results =
      applyCourseSearch(
        courses,
        {
          query: "대구"
        }
      );

    expect(
      results.map(
        (course) =>
          course.sourceId
      )
    ).toEqual([
      "daegu-1"
    ]);
  });

  test("still matches a Korean term at the beginning of a field", () => {
    const results =
      applyCourseSearch(
        [
          {
            sourceId: "daegu-1",
            titleKo:
              "대구 시민을 위한 AI 강좌",
            locationKo:
              "평생교육원"
          }
        ],
        {
          query: "대구"
        }
      );

    expect(results)
      .toHaveLength(1);
  });

  test("still supports ordinary substring search for non-Korean queries", () => {
    const results =
      applyCourseSearch(
        [
          {
            sourceId: "course-1",
            titleKo:
              "Python Programming Basics",
            locationKo:
              "Learning Center"
          }
        ],
        {
          query: "Python"
        }
      );

    expect(results)
      .toHaveLength(1);
  });
});

