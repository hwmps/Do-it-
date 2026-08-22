const {
  presentCatalogCourse
} = require("../utils/catalogCoursePresenter");

describe("catalog course presenter", () => {
  test("converts a canonical Daegu course into the existing search response shape", () => {
    const result =
      presentCatalogCourse({
        sourceId: "daegu-1",
        sourceRecordId: "LEARNING_1",
        source: "daegu-lifelong-learning",
        countryCode: "KR",
        region: "Daegu",
        language: "ko",

        title: "컴퓨터 기초",
        location: "대구 평생학습관",

        startAt: "2026-08-12",
        endAt: "2026-09-04",

        status: "unknown",
        target: "성인",

        lat: null,
        lng: null,
        coordinateSource: "unknown"
      });

    expect(result).toEqual(
      expect.objectContaining({
        id: "daegu-1",
        sourceId: "daegu-1",
        source: "daegu-lifelong-learning",
        region: "Daegu",

        titleKo: "컴퓨터 기초",
        locationKo: "대구 평생학습관",

        period:
          "2026-08-12 ~ 2026-09-04",

        status: "unknown",
        target: "성인",

        lat: null,
        lng: null,
        coordinateSource: "unknown"
      })
    );
  });

  test("keeps existing legacy Busan catalog records compatible", () => {
    const result =
      presentCatalogCourse({
        sourceId: "busan-1",
        source: "busan-public-data",

        titleKo: "부산 파이썬 기초",
        titleEn: "Python Basics",

        locationKo: "부산 평생학습관",
        locationEn:
          "Busan Lifelong Learning Center",

        period:
          "2026.09.01 ~ 2026.11.30",

        status: "접수중",
        target: "성인",

        lat: 35.17,
        lng: 129.07,
        coordinateSource: "upstream"
      });

    expect(result).toEqual(
      expect.objectContaining({
        id: "busan-1",
        sourceId: "busan-1",

        titleKo: "부산 파이썬 기초",
        titleEn: "Python Basics",

        locationKo: "부산 평생학습관",
        locationEn:
          "Busan Lifelong Learning Center",

        period:
          "2026.09.01 ~ 2026.11.30",

        status: "접수중",
        target: "성인",

        lat: 35.17,
        lng: 129.07
      })
    );
  });

  test("builds a period safely when only one canonical date exists", () => {
    expect(
      presentCatalogCourse({
        sourceId: "course-1",
        source: "test-source",
        title: "테스트 강좌",
        startAt: "2026-10-01"
      }).period
    ).toBe("2026-10-01");

    expect(
      presentCatalogCourse({
        sourceId: "course-2",
        source: "test-source",
        title: "테스트 강좌",
        endAt: "2026-10-31"
      }).period
    ).toBe("2026-10-31");
  });
});
