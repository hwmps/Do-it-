const {
  BusanCourseSource
} = require("../sources/busanCourseSource");

describe("BusanCourseSource", () => {
  test("fetches raw records through the Busan public data client", async () => {
    const publicDataClient = {
      fetchPage: jest.fn()
        .mockResolvedValue([
          { lctreNm: "Python 기초" }
        ])
    };

    const registry = {
      normalize: jest.fn()
    };

    const source = new BusanCourseSource({
      publicDataClient,
      registry
    });

    const records =
      await source.fetchPage({
        pageNo: 2,
        numOfRows: 50
      });

    expect(publicDataClient.fetchPage)
      .toHaveBeenCalledWith({
        pageNo: 2,
        numOfRows: 50
      });

    expect(records).toEqual([
      { lctreNm: "Python 기초" }
    ]);
  });

  test("normalizes records through the source registry", () => {
    const publicDataClient = {
      fetchPage: jest.fn()
    };

    const canonical = {
      source: "busan-public-data",
      sourceId: "course-1",
      countryCode: "KR",
      language: "ko",
      title: "Python 기초"
    };

    const registry = {
      normalize: jest.fn()
        .mockReturnValue(canonical)
    };

    const source = new BusanCourseSource({
      publicDataClient,
      registry
    });

    const raw = {
      lctreNm: "Python 기초"
    };

    const result =
      source.normalize(raw);

    expect(registry.normalize)
      .toHaveBeenCalledWith(
        "busan",
        raw
      );

    expect(result)
      .toBe(canonical);
  });

  test("requires a client with fetchPage", () => {
    expect(() =>
      new BusanCourseSource({
        publicDataClient: {},
        registry: {
          normalize: jest.fn()
        }
      })
    ).toThrow("fetchPage");
  });

  test("requires a registry with normalize", () => {
    expect(() =>
      new BusanCourseSource({
        publicDataClient: {
          fetchPage: jest.fn()
        },
        registry: {}
      })
    ).toThrow("normalize");
  });
});
