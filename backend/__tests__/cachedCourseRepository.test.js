const {
  CachedCourseRepository
} = require("../repositories/cachedCourseRepository");

describe("CachedCourseRepository", () => {
  test("reuses a cached DynamoDB page within the TTL", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValue({
          items: [
            {
              sourceId: "course-1",
              title: "Cached Course"
            }
          ],
          nextKey: {
            sourceId: "next-course"
          }
        })
    };

    let now = 1000;

    const cachedRepository =
      new CachedCourseRepository({
        repository,
        ttlMs: 300000,
        now: () => now
      });

    const first =
      await cachedRepository.listPage({
        limit: 50
      });

    now += 1000;

    const second =
      await cachedRepository.listPage({
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(1);

    expect(second)
      .toEqual(first);
  });

  test("refreshes the page after the TTL expires", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "course-1"
            }
          ]
        })
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "course-2"
            }
          ]
        })
    };

    let now = 1000;

    const cachedRepository =
      new CachedCourseRepository({
        repository,
        ttlMs: 300000,
        now: () => now
      });

    const first =
      await cachedRepository.listPage({
        limit: 50
      });

    now += 300001;

    const second =
      await cachedRepository.listPage({
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(2);

    expect(first.items[0].sourceId)
      .toBe("course-1");

    expect(second.items[0].sourceId)
      .toBe("course-2");
  });

  test("keeps different pagination pages in separate cache entries", async () => {
    const repository = {
      listPage: jest.fn()
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "first-page"
            }
          ]
        })
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "second-page"
            }
          ]
        })
    };

    const cachedRepository =
      new CachedCourseRepository({
        repository
      });

    await cachedRepository.listPage({
      limit: 50
    });

    await cachedRepository.listPage({
      limit: 50,
      startKey: {
        sourceId: "cursor-1"
      }
    });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(2);
  });

  test("requires a repository with listPage", () => {
    expect(() =>
      new CachedCourseRepository({
        repository: {}
      })
    ).toThrow("listPage");
  });
});

