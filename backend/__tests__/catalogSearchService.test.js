const {
  CatalogSearchService
} = require("../services/catalogSearchService");

describe("CatalogSearchService", () => {
  test("reads canonical and legacy courses through the same search path", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValue({
          items: [
            {
              sourceId: "busan-1",
              source: "busan-public-data",
              titleKo: "부산 파이썬 기초",
              locationKo: "부산 평생학습관",
              period: "2026.09.01 ~ 2026.11.30",
              status: "접수중",
              target: "성인",
              lat: 35.17,
              lng: 129.07
            },
            {
              sourceId: "daegu-1",
              source: "daegu-lifelong-learning",
              region: "Daegu",
              title: "대구 컴퓨터 기초",
              location: "대구 평생학습관",
              startAt: "2026-08-12",
              endAt: "2026-09-04",
              status: "unknown",
              target: "성인",
              lat: null,
              lng: null
            }
          ],
          nextKey: {
            sourceId: "daegu-1"
          }
        })
    };

    const service =
      new CatalogSearchService({
        repository
      });

    const result =
      await service.searchPage({
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledWith({
        limit: 50,
        startKey: undefined
      });

    expect(result.items)
      .toHaveLength(2);

    expect(result.items[0])
      .toEqual(
        expect.objectContaining({
          sourceId: "busan-1",
          titleKo: "부산 파이썬 기초"
        })
      );

    expect(result.items[1])
      .toEqual(
        expect.objectContaining({
          sourceId: "daegu-1",
          titleKo: "대구 컴퓨터 기초",
          locationKo: "대구 평생학습관",
          period: "2026-08-12 ~ 2026-09-04"
        })
      );

    expect(result.nextKey)
      .toEqual({
        sourceId: "daegu-1"
      });
  });

  test("applies the existing course search filters after presentation", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValue({
          items: [
            {
              sourceId: "busan-1",
              titleKo: "부산 파이썬 기초",
              locationKo: "부산",
              status: "접수중",
              target: "성인"
            },
            {
              sourceId: "daegu-1",
              title: "대구 컴퓨터 기초",
              location: "대구",
              status: "unknown",
              target: "성인"
            }
          ]
        })
    };

    const service =
      new CatalogSearchService({
        repository
      });

    const result =
      await service.searchPage({
        query: "대구",
        limit: 50
      });

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

  test("passes the pagination cursor to the repository", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValue({
          items: []
        })
    };

    const service =
      new CatalogSearchService({
        repository
      });

    await service.searchPage({
      limit: 25,
      startKey: {
        sourceId: "previous-course"
      }
    });

    expect(repository.listPage)
      .toHaveBeenCalledWith({
        limit: 25,
        startKey: {
          sourceId: "previous-course"
        }
      });
  });
});
