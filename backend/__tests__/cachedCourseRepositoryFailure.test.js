const {
  CachedCourseRepository
} = require("../repositories/cachedCourseRepository");

describe("CachedCourseRepository failure recovery", () => {
  test("does not cache a failed repository read", async () => {
    const repository = {
      listPage: jest.fn()
        .mockRejectedValueOnce(
          new Error("temporary DynamoDB failure")
        )
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "course-1"
            }
          ],
          nextKey: undefined
        })
    };

    const cachedRepository =
      new CachedCourseRepository({
        repository,
        ttlMs: 300000
      });

    await expect(
      cachedRepository.listPage({
        limit: 50
      })
    ).rejects.toThrow(
      "temporary DynamoDB failure"
    );

    const result =
      await cachedRepository.listPage({
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(2);

    expect(result)
      .toEqual({
        items: [
          {
            sourceId: "course-1"
          }
        ],
        nextKey: undefined
      });
  });

  test("clears a failed in-flight request so future requests can retry", async () => {
    const repository = {
      listPage: jest.fn()
        .mockRejectedValueOnce(
          new Error("temporary failure")
        )
        .mockResolvedValueOnce({
          items: [
            {
              sourceId: "course-2"
            }
          ],
          nextKey: undefined
        })
    };

    const cachedRepository =
      new CachedCourseRepository({
        repository
      });

    const first =
      cachedRepository.listPage({
        limit: 50
      });

    const second =
      cachedRepository.listPage({
        limit: 50
      });

    const results =
      await Promise.allSettled([
        first,
        second
      ]);

    expect(results[0].status)
      .toBe("rejected");

    expect(results[1].status)
      .toBe("rejected");

    expect(repository.listPage)
      .toHaveBeenCalledTimes(1);

    const retry =
      await cachedRepository.listPage({
        limit: 50
      });

    expect(repository.listPage)
      .toHaveBeenCalledTimes(2);

    expect(retry.items[0].sourceId)
      .toBe("course-2");
  });
});
