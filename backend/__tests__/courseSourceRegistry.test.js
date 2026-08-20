const {
  CourseSourceRegistry
} = require("../sources/courseSourceRegistry");

describe("CourseSourceRegistry", () => {
  const canonicalCourse = {
    source: "test-source",
    sourceId: "course-1",
    countryCode: "KR",
    region: "Test",
    language: "ko",
    title: "테스트 강좌",
    location: "테스트 센터",
    startAt: "2026-09-01",
    endAt: "2026-09-30",
    status: "접수중",
    lat: null,
    lng: null,
    coordinateSource: "unknown"
  };

  test("normalizes using the adapter registered for a source", () => {
    const adapter = {
      normalize: jest.fn()
        .mockReturnValue(canonicalCourse)
    };

    const registry =
      new CourseSourceRegistry({
        busan: adapter
      });

    const raw = {
      title: "raw"
    };

    const result =
      registry.normalize("busan", raw);

    expect(adapter.normalize)
      .toHaveBeenCalledWith(raw);

    expect(result)
      .toEqual(canonicalCourse);
  });

  test("rejects an unknown source", () => {
    const registry =
      new CourseSourceRegistry({});

    expect(() =>
      registry.normalize(
        "unknown",
        {}
      )
    ).toThrow("unknown");
  });

  test("rejects an adapter without normalize", () => {
    expect(() =>
      new CourseSourceRegistry({
        broken: {}
      })
    ).toThrow("normalize");
  });

  test("rejects invalid canonical output from an adapter", () => {
    const registry =
      new CourseSourceRegistry({
        broken: {
          normalize: () => ({
            source: "broken"
          })
        }
      });

    expect(() =>
      registry.normalize(
        "broken",
        {}
      )
    ).toThrow("sourceId");
  });
});
