const {
  CourseCatalogIngestion
} = require("../services/courseCatalogIngestion");

describe("CourseCatalogIngestion", () => {
  test("fetches pages until an empty page and accumulates ingestion results", async () => {
    const source = {
      fetchPage: jest.fn()
        .mockResolvedValueOnce([
          { id: 1 },
          { id: 2 }
        ])
        .mockResolvedValueOnce([
          { id: 3 }
        ])
        .mockResolvedValueOnce([])
    };

    const ingestionService = {
      ingest: jest.fn()
        .mockResolvedValueOnce({
          received: 2,
          normalized: 2,
          upserted: 2,
          invalid: 0,
          failed: 0
        })
        .mockResolvedValueOnce({
          received: 1,
          normalized: 1,
          upserted: 0,
          invalid: 0,
          failed: 1
        })
    };

    const runner = new CourseCatalogIngestion({
      source,
      ingestionService
    });

    const result = await runner.run({
      pageSize: 2,
      now: "2026-08-20T00:00:00.000Z"
    });

    expect(source.fetchPage)
      .toHaveBeenNthCalledWith(1, {
        pageNo: 1,
        numOfRows: 2
      });

    expect(source.fetchPage)
      .toHaveBeenNthCalledWith(2, {
        pageNo: 2,
        numOfRows: 2
      });

    expect(source.fetchPage)
      .toHaveBeenNthCalledWith(3, {
        pageNo: 3,
        numOfRows: 2
      });

    expect(ingestionService.ingest)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      pagesFetched: 3,
      pagesIngested: 2,
      received: 3,
      normalized: 3,
      unique: 3,
      duplicates: 0,
      upserted: 2,
      invalid: 0,
      failed: 1
    });
  });

  test("uses one timestamp for the entire ingestion run", async () => {
    const source = {
      fetchPage: jest.fn()
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([{ id: 2 }])
        .mockResolvedValueOnce([])
    };

    const ingestionService = {
      ingest: jest.fn().mockResolvedValue({
        received: 1,
        normalized: 1,
        upserted: 1,
        invalid: 0,
        failed: 0
      })
    };

    const runner = new CourseCatalogIngestion({
      source,
      ingestionService
    });

    const now = "2026-08-20T12:00:00.000Z";

    await runner.run({ now });

    const firstOptions =
      ingestionService.ingest.mock.calls[0][1];

    const secondOptions =
      ingestionService.ingest.mock.calls[1][1];

    expect(firstOptions.now).toBe(now);
    expect(secondOptions.now).toBe(now);

    expect(firstOptions.seenSourceIds)
      .toBeInstanceOf(Set);

    expect(secondOptions.seenSourceIds)
      .toBe(firstOptions.seenSourceIds);

    expect(firstOptions.persistedSourceIds)
      .toBeInstanceOf(Set);

    expect(secondOptions.persistedSourceIds)
      .toBe(firstOptions.persistedSourceIds);
  });

  test("stops at maxPages even when the source keeps returning records", async () => {
    const source = {
      fetchPage: jest.fn()
        .mockResolvedValue([{ id: 1 }])
    };

    const ingestionService = {
      ingest: jest.fn().mockResolvedValue({
        received: 1,
        normalized: 1,
        upserted: 1,
        invalid: 0,
        failed: 0
      })
    };

    const runner = new CourseCatalogIngestion({
      source,
      ingestionService
    });

    const result = await runner.run({
      maxPages: 2
    });

    expect(source.fetchPage)
      .toHaveBeenCalledTimes(2);

    expect(result.pagesFetched).toBe(2);
    expect(result.pagesIngested).toBe(2);
    expect(result.upserted).toBe(2);
  });

  test("rejects an invalid page size", async () => {
    const runner = new CourseCatalogIngestion({
      source: {
        fetchPage: jest.fn()
      },
      ingestionService: {
        ingest: jest.fn()
      }
    });

    await expect(
      runner.run({ pageSize: 0 })
    ).rejects.toThrow("pageSize");
  });

  test("deduplicates the same sourceId across different pages", async () => {
    const {
      CourseIngestionService
    } = require("../services/courseIngestionService");

    const source = {
      fetchPage: jest.fn()
        .mockResolvedValueOnce([
          { sourceId: "course-a", titleKo: "Course A" }
        ])
        .mockResolvedValueOnce([
          { sourceId: "course-a", titleKo: "Course A" },
          { sourceId: "course-b", titleKo: "Course B" }
        ])
        .mockResolvedValueOnce([])
    };

    const repository = {
      upsert: jest.fn().mockResolvedValue({})
    };

    const ingestionService =
      new CourseIngestionService({
        repository,
        normalize: (record) => record
      });

    const runner =
      new CourseCatalogIngestion({
        source,
        ingestionService
      });

    const result = await runner.run({
      pageSize: 2
    });

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      pagesFetched: 3,
      pagesIngested: 2,
      received: 3,
      normalized: 3,
      unique: 2,
      duplicates: 1,
      upserted: 2,
      invalid: 0,
      failed: 0
    });
  });


  test("retries a cross-page duplicate when the earlier write failed", async () => {
    const {
      CourseIngestionService
    } = require("../services/courseIngestionService");

    const source = {
      fetchPage: jest.fn()
        .mockResolvedValueOnce([
          { sourceId: "course-a", titleKo: "Course A" }
        ])
        .mockResolvedValueOnce([
          { sourceId: "course-a", titleKo: "Course A" }
        ])
        .mockResolvedValueOnce([])
    };

    const repository = {
      upsert: jest.fn()
        .mockRejectedValueOnce(
          new Error("temporary write failure")
        )
        .mockResolvedValueOnce({})
    };

    const ingestionService =
      new CourseIngestionService({
        repository,
        normalize: (record) => record
      });

    const runner =
      new CourseCatalogIngestion({
        source,
        ingestionService
      });

    const result = await runner.run({
      pageSize: 1
    });

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      pagesFetched: 3,
      pagesIngested: 2,
      received: 2,
      normalized: 2,
      unique: 1,
      duplicates: 1,
      upserted: 1,
      invalid: 0,
      failed: 1
    });
  });

});
