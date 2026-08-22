const {
  CatalogSearchService
} = require("../services/catalogSearchService");

describe("CatalogSearchService result accumulation", () => {
  test("collects matching courses across multiple DynamoDB pages", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "daegu-1",
              source: "daegu-lifelong-learning",
              title: "대구 첫 번째 강좌",
              location: "대구 평생학습관"
            },
            {
              sourceId: "busan-1",
              source: "busan-public-data",
              titleKo: "부산 강좌",
              locationKo: "부산 남구"
            }
          ],
          nextKey: {
            sourceId: "page-1-end"
          }
        })
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "daegu-2",
              source: "daegu-lifelong-learning",
              title: "대구 두 번째 강좌",
              location: "대구 교육센터"
            }
          ],
          nextKey: undefined
        })
    };

    const service =
      new CatalogSearchService({
        repository,
        maxSearchPages: 10
      });

    const result =
      await service.searchPage({
        query: "대구",
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(2);

    expect(
      result.items.map(
        (course) => course.sourceId
      )
    ).toEqual([
      "daegu-1",
      "daegu-2"
    ]);

    expect(result.nextKey)
      .toBeUndefined();
  });
});
