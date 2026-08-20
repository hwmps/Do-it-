const { normalizeCourse } = require("../domain/normalizeCourse");

describe("normalizeCourse", () => {
  test("normalizes the current Busan course API schema", () => {
    const result = normalizeCourse({
      lctreNm: "줌바댄스",
      adres: "부산 부산진구 동평로406번길 38",
      adresLa: "35.1721429382",
      adresLo: "129.0687244213",
      lctreBeginDttm: "2026-01-02",
      lctreEndDttm: "2026-12-31",
      progrsSttusNm: "접수중",
      resveGroupNm: "부산진구 양정1동 주민자치회"
    });

    expect(result).toEqual(expect.objectContaining({
      source: "busan-public-data",
      titleKo: "줌바댄스",
      locationKo: "부산 부산진구 동평로406번길 38",
      period: "2026-01-02 ~ 2026-12-31",
      status: "접수중",
      target: "전체",
      lat: 35.1721429382,
      lng: 129.0687244213,
      coordinateSource: "upstream",
      reservationGroupKo: "부산진구 양정1동 주민자치회"
    }));
  });

  test("does not fabricate missing coordinates", () => {
    const result = normalizeCourse({
      lctreNm: "Python 기초",
      adres: "부산광역시"
    });

    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.coordinateSource).toBe("unknown");
  });

  test("keeps sourceId stable when mutable fields change", () => {
    const first = normalizeCourse({
      lctreNm: "Python 기초",
      adres: "부산 교육센터",
      lctreBeginDttm: "2026-09-01",
      lctreEndDttm: "2026-11-30",
      progrsSttusNm: "접수중"
    });

    const second = normalizeCourse({
      lctreNm: "Python 기초",
      adres: "부산 교육센터",
      lctreBeginDttm: "2026-09-01",
      lctreEndDttm: "2026-12-15",
      progrsSttusNm: "마감"
    });

    expect(first.sourceId).toBe(second.sourceId);
  });

  test("rejects a record without a lecture name", () => {
    expect(() => normalizeCourse({
      adres: "부산광역시"
    })).toThrow("title");
  });
});
