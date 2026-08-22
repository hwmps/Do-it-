const {
  CatalogSearchService
} = require("../services/catalogSearchService");

function makeCourse({
  sourceId,
  title,
  region
}) {
  return {
    sourceId,
    source: "daegu-lifelong-learning",
    title,
    region,
    location: "평생학습관",
    status: "unknown",
    target: "성인"
  };
}

describe("CatalogSearchService read amplification", () => {
  test("unfiltered catalog request reads only one repository page", async () => {
    const items =
      Array.from(
        { length: 50 },
        (_, index) =>
          makeCourse({
            sourceId: `course-${index}`,
            title: `과정 ${index}`,
            region: "Daegu"
          })
      );

    const repository = {
      listPage: jest.fn()
        .mockResolvedValue({
          items,
          nextKey: {
            sourceId: "cursor-1"
          }
        })
    };

    const service =
      new CatalogSearchService({
        repository,
        maxSearchPages: 10
      });

    const result =
      await service.searchPage({
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(1);

    expect(result.items)
      .toHaveLength(50);
  });

  test("filtered search can read ten pages to return one result", async () => {
    let pageNumber = 0;
    let rawItemsRead = 0;

    const repository = {
      listPage: jest.fn(
        async ({ limit }) => {
          pageNumber += 1;

          const items =
            Array.from(
              { length: limit },
              (_, index) => {
                const isMatch =
                  pageNumber === 10 &&
                  index === 0;

                return makeCourse({
                  sourceId:
                    `page-${pageNumber}-${index}`,

                  title:
                    isMatch
                      ? "대구 컴퓨터 과정"
                      : "부산 컴퓨터 과정",

                  region:
                    isMatch
                      ? "Daegu"
                      : "Busan"
                });
              }
            );

          rawItemsRead +=
            items.length;

          return {
            items,
            nextKey: {
              sourceId:
                `cursor-${pageNumber}`
            }
          };
        }
      )
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

    const returnedItems =
      result.items.length;

    const readAmplification =
      rawItemsRead /
      returnedItems;

    expect(repository.listPage)
      .toHaveBeenCalledTimes(10);

    expect(rawItemsRead)
      .toBe(500);

    expect(returnedItems)
      .toBe(1);

    expect(readAmplification)
      .toBe(500);

    expect(result.nextKey)
      .toEqual({
        sourceId: "cursor-10"
      });
  });
});
