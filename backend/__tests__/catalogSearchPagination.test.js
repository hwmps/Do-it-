const {
  CatalogSearchService
} = require("../services/catalogSearchService");

describe("CatalogSearchService filtered pagination", () => {
  test("continues reading when the first DynamoDB page has no matching courses", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "busan-1",
              titleKo: "부산 탁구 교실",
              locationKo: "부산 남구"
            }
          ],
          nextKey: {
            sourceId: "busan-1"
          }
        })
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "daegu-1",
              source: "daegu-lifelong-learning",
              region: "Daegu",
              title: "대구 컴퓨터 기초",
              location: "대구 평생학습관"
            }
          ],
          nextKey: undefined
        })
    };

    const service =
      new CatalogSearchService({
        repository
      });

    const result =
      await service.searchPage({
        query: "컴퓨터",
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(2);

    expect(result.items)
      .toHaveLength(1);

    expect(result.items[0])
      .toEqual(
        expect.objectContaining({
          sourceId: "daegu-1",
          titleKo: "대구 컴퓨터 기초"
        })
      );
  });
});

