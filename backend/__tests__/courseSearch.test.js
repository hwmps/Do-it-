const {
  applyCourseSearch
} = require("../utils/courseSearch");

describe("applyCourseSearch", () => {
  const courses = [
    {
      id: 1,
      titleKo: "파이썬 코딩 기초",
      locationKo: "해운대 평생학습관",
      status: "접수중",
      target: "성인",
      lat: 35.1631,
      lng: 129.1636
    },
    {
      id: 2,
      titleKo: "웹개발 기초",
      locationKo: "부산진구 청소년센터",
      status: "마감",
      target: "청소년",
      lat: 35.1601,
      lng: 129.0578
    },
    {
      id: 3,
      titleKo: "AI 데이터 분석",
      locationKo: "금정구 평생학습관",
      status: "접수중",
      target: "성인",
      lat: 35.2429,
      lng: 129.0924
    }
  ];

  test("filters by title or location query", () => {
    expect(
      applyCourseSearch(courses, {
        query: "해운대"
      }).map((course) => course.id)
    ).toEqual([1]);
  });

  test("filters by status and target", () => {
    expect(
      applyCourseSearch(courses, {
        status: "접수중",
        target: "성인"
      }).map((course) => course.id)
    ).toEqual([1, 3]);
  });

  test("combines text and categorical filters", () => {
    expect(
      applyCourseSearch(courses, {
        query: "AI",
        status: "접수중",
        target: "성인"
      }).map((course) => course.id)
    ).toEqual([3]);
  });

  test("applies nearby filtering and distance ranking", () => {
    const results = applyCourseSearch(courses, {
      nearbyRequested: true,
      lat: 35.1631,
      lng: 129.1636,
      radiusKm: 20
    });

    expect(results[0].id).toBe(1);
    expect(results[0].distanceKm).toBe(0);
    expect(
      results.every((course) =>
        Number.isFinite(course.distanceKm)
      )
    ).toBe(true);
  });

  test("does not mutate the original array", () => {
    applyCourseSearch(courses, {
      status: "접수중"
    });

    expect(courses).toHaveLength(3);
    expect(courses[0].distanceKm).toBeUndefined();
  });
});
