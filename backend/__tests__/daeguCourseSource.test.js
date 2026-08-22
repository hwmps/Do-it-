const {
  DaeguCourseSource
} = require("../sources/daeguCourseSource");

describe("DaeguCourseSource", () => {
  test("fetches raw records through the Daegu public data client", async () => {
    const publicDataClient = {
      fetchPage: jest.fn()
        .mockResolvedValue([
          {
            lec_id: "LEARNING_1",
            lec_title: "컴퓨터 기초"
          }
        ])
    };

    const registry = {
      normalize: jest.fn()
    };

    const source =
      new DaeguCourseSource({
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
      {
        lec_id: "LEARNING_1",
        lec_title: "컴퓨터 기초"
      }
    ]);
  });

  test("normalizes records through the source registry", () => {
    const canonical = {
      source: "daegu-lifelong-learning",
      sourceId: "course-1",
      countryCode: "KR",
      region: "Daegu",
      language: "ko",
      title: "컴퓨터 기초"
    };

    const registry = {
      normalize: jest.fn()
        .mockReturnValue(canonical)
    };

    const source =
      new DaeguCourseSource({
        publicDataClient: {
          fetchPage: jest.fn()
        },
        registry
      });

    const raw = {
      lec_id: "LEARNING_1",
      lec_title: "컴퓨터 기초"
    };

    const result =
      source.normalize(raw);

    expect(registry.normalize)
      .toHaveBeenCalledWith(
        "daegu",
        raw
      );

    expect(result)
      .toBe(canonical);
  });

  test("requires a client with fetchPage", () => {
    expect(() =>
      new DaeguCourseSource({
        publicDataClient: {},
        registry: {
          normalize: jest.fn()
        }
      })
    ).toThrow("fetchPage");
  });

  test("requires a registry with normalize", () => {
    expect(() =>
      new DaeguCourseSource({
        publicDataClient: {
          fetchPage: jest.fn()
        },
        registry: {}
      })
    ).toThrow("normalize");
  });
});
