const {
  validateCanonicalCourse
} = require("../domain/canonicalCourse");

describe("validateCanonicalCourse", () => {
  const validCourse = {
    source: "busan-public-data",
    sourceId: "course-123",
    countryCode: "KR",
    region: "Busan",
    language: "ko",
    title: "Python 기초",
    location: "부산 교육센터",
    startAt: "2026-09-01",
    endAt: "2026-11-30",
    status: "접수중",
    lat: 35.17,
    lng: 129.07,
    coordinateSource: "upstream"
  };

  test("accepts a valid canonical course", () => {
    expect(
      validateCanonicalCourse(validCourse)
    ).toEqual(validCourse);
  });

  test.each([
    "source",
    "sourceId",
    "countryCode",
    "language",
    "title"
  ])("rejects a course missing %s", (field) => {
    const course = {
      ...validCourse
    };

    delete course[field];

    expect(() =>
      validateCanonicalCourse(course)
    ).toThrow(field);
  });

  test("allows unknown coordinates without fabricating values", () => {
    const course = {
      ...validCourse,
      lat: null,
      lng: null,
      coordinateSource: "unknown"
    };

    expect(
      validateCanonicalCourse(course)
    ).toEqual(course);
  });

  test("rejects only one coordinate being present", () => {
    expect(() =>
      validateCanonicalCourse({
        ...validCourse,
        lat: 35.17,
        lng: null
      })
    ).toThrow("coordinates");
  });
});
