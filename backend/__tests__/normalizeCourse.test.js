const {
  normalizeCourse
} = require("../domain/normalizeCourse");

describe("normalizeCourse", () => {
  test("normalizes a public-data course into the canonical schema", () => {
    const result = normalizeCourse({
      crsNm: "AI 데이터 분석",
      operInstNm: "부산 평생학습관",
      crsPeriod: "2026.09.01 ~ 2026.11.30",
      trget: "성인",
      lat: "35.1795",
      lng: "129.0756"
    });

    expect(result).toEqual(
      expect.objectContaining({
        source: "busan-public-data",
        titleKo: "AI 데이터 분석",
        locationKo: "부산 평생학습관",
        period: "2026.09.01 ~ 2026.11.30",
        target: "성인",
        lat: 35.1795,
        lng: 129.0756,
        coordinateSource: "upstream"
      })
    );
  });

  test("does not fabricate coordinates when upstream coordinates are missing", () => {
    const result = normalizeCourse({
      crsNm: "Python 기초",
      operInstNm: "부산 교육센터"
    });

    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.coordinateSource).toBe("unknown");
  });

  test("produces a stable sourceId for the same source record", () => {
    const raw = {
      crsNm: "Python 기초",
      operInstNm: "부산 교육센터",
      crsPeriod: "2026.09.01 ~ 2026.11.30"
    };

    const first = normalizeCourse(raw);
    const second = normalizeCourse(raw);

    expect(first.sourceId).toBe(second.sourceId);
  });

  test("rejects records without a usable title", () => {
    expect(() =>
      normalizeCourse({
        operInstNm: "부산 교육센터"
      })
    ).toThrow("title");
  });
});
