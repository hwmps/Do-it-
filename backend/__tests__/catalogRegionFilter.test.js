const {
  CatalogSearchService
} = require("../services/catalogSearchService");

describe("CatalogSearchService region filtering", () => {
  function createRepository() {
    return {
      listPage: jest.fn()
        .mockResolvedValue({
          items: [
            {
              sourceId: "busan-1",
              source: "busan-public-data",
              titleKo: "부산 파이썬 기초",
              locationKo: "부산 평생학습관",
              status: "접수중",
              target: "성인"
            },
            {
              sourceId: "daegu-1",
              source: "daegu-lifelong-learning",
              region: "Daegu",
              title: "대구 컴퓨터 기초",
              location: "대구 평생학습관",
              status: "unknown",
              target: "성인"
            }
          ],
          nextKey: undefined
        })
    };
  }

  test("returns only Daegu courses for region=Daegu", async () => {
    const service =
      new CatalogSearchService({
        repository:
          createRepository()
      });

    const result =
      await service.searchPage({
        region: "Daegu",
        limit: 50
      });

    expect(
      result.items.map(
        (course) =>
          course.sourceId
      )
    ).toEqual([
      "daegu-1"
    ]);
  });

  test("treats legacy Busan records as region=Busan", async () => {
    const service =
      new CatalogSearchService({
        repository:
          createRepository()
      });

    const result =
      await service.searchPage({
        region: "Busan",
        limit: 50
      });

    expect(
      result.items.map(
        (course) =>
          course.sourceId
      )
    ).toEqual([
      "busan-1"
    ]);

    expect(
      result.items[0].region
    ).toBe("Busan");
  });
});
