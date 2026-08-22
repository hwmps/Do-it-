const {
  CachedCourseRepository
} = require("../repositories/cachedCourseRepository");

describe("CachedCourseRepository concurrency", () => {
  test("deduplicates concurrent reads for the same page", async () => {
    let resolvePage;

    const pendingPage =
      new Promise((resolve) => {
        resolvePage = resolve;
      });

    const repository = {
      listPage: jest.fn(
        () => pendingPage
      )
    };

    const cachedRepository =
      new CachedCourseRepository({
        repository,
        ttlMs: 300000
      });

    const first =
      cachedRepository.listPage({
        limit: 50
      });

    const second =
      cachedRepository.listPage({
        limit: 50
      });

    resolvePage({
      items: [
        {
          sourceId: "course-1"
        }
      ],
      nextKey: undefined
    });

    const [firstResult, secondResult] =
      await Promise.all([
        first,
        second
      ]);

    expect(repository.listPage)
      .toHaveBeenCalledTimes(1);

    expect(firstResult)
      .toEqual(secondResult);
  });
});
