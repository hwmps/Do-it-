const {
  BusanCourseAdapter
} = require("../adapters/busanCourseAdapter");

describe("BusanCourseAdapter", () => {
  test("normalizes Busan API data into the canonical course model", () => {
    const adapter = new BusanCourseAdapter();

    const course = adapter.normalize({
      lctreNm: "줌바댄스",
      adres: "부산 부산진구 동평로406번길 38",
      adresLa: "35.1721429382",
      adresLo: "129.0687244213",
      lctreBeginDttm: "2026-01-02",
      lctreEndDttm: "2026-12-31",
      progrsSttusNm: "접수중",
      resveGroupNm: "부산진구 양정1동 주민자치회"
    });

    expect(course).toEqual(
      expect.objectContaining({
        source: "busan-public-data",
        countryCode: "KR",
        region: "Busan",
        language: "ko",

        title: "줌바댄스",
        location: "부산 부산진구 동평로406번길 38",

        startAt: "2026-01-02",
        endAt: "2026-12-31",
        status: "접수중",

        lat: 35.1721429382,
        lng: 129.0687244213,

        coordinateSource: "upstream",
        reservationGroup:
          "부산진구 양정1동 주민자치회"
      })
    );

    expect(course.sourceId)
      .toEqual(expect.any(String));
  });

  test("keeps sourceId stable when mutable fields change", () => {
    const adapter = new BusanCourseAdapter();

    const first = adapter.normalize({
      lctreNm: "Python 기초",
      adres: "부산 교육센터",
      lctreBeginDttm: "2026-09-01",
      lctreEndDttm: "2026-11-30",
      progrsSttusNm: "접수중"
    });

    const second = adapter.normalize({
      lctreNm: "Python 기초",
      adres: "부산 교육센터",
      lctreBeginDttm: "2026-09-01",
      lctreEndDttm: "2026-12-15",
      progrsSttusNm: "마감"
    });

    expect(first.sourceId)
      .toBe(second.sourceId);
  });

  test("does not fabricate coordinates", () => {
    const adapter = new BusanCourseAdapter();

    const course = adapter.normalize({
      lctreNm: "데이터 분석",
      adres: "부산광역시"
    });

    expect(course.lat).toBeNull();
    expect(course.lng).toBeNull();
    expect(course.coordinateSource)
      .toBe("unknown");
  });

  test("rejects a record without a title", () => {
    const adapter = new BusanCourseAdapter();

    expect(() =>
      adapter.normalize({
        adres: "부산광역시"
      })
    ).toThrow("title");
  });

  test("preserves the legacy sourceId during canonical migration", () => {
    const {
      normalizeCourse
    } = require("../domain/normalizeCourse");

    const adapter = new BusanCourseAdapter();

    const raw = {
      lctreNm: "Python 기초",
      adres: "부산 교육센터",
      lctreBeginDttm: "2026-09-01",
      lctreEndDttm: "2026-11-30",
      progrsSttusNm: "접수중"
    };

    const legacy =
      normalizeCourse(raw);

    const canonical =
      adapter.normalize(raw);

    expect(canonical.sourceId)
      .toBe(legacy.sourceId);
  });

});
