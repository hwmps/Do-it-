const {
  CourseCatalogIngestion
} = require("../services/courseCatalogIngestion");

describe("CourseCatalogIngestion", () => {
  test("fetches pages until an empty page and accumulates ingestion results", async () => {
    const publicDataClient = {
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
      publicDataClient,
      ingestionService
    });

    const result = await runner.run({
      pageSize: 2,
      now: "2026-08-20T00:00:00.000Z"
    });

    expect(publicDataClient.fetchPage)
      .toHaveBeenNthCalledWith(1, {
        pageNo: 1,
        numOfRows: 2
      });

    expect(publicDataClient.fetchPage)
      .toHaveBeenNthCalledWith(2, {
        pageNo: 2,
        numOfRows: 2
      });

    expect(publicDataClient.fetchPage)
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
      upserted: 2,
      invalid: 0,
      failed: 1
    });
  });

  test("uses one timestamp for the entire ingestion run", async () => {
    const publicDataClient = {
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
      publicDataClient,
      ingestionService
    });

    const now = "2026-08-20T12:00:00.000Z";

    await runner.run({ now });

    expect(ingestionService.ingest)
      .toHaveBeenNthCalledWith(
        1,
        [{ id: 1 }],
        { now }
      );

    expect(ingestionService.ingest)
      .toHaveBeenNthCalledWith(
        2,
        [{ id: 2 }],
        { now }
      );
  });

  test("stops at maxPages even when the source keeps returning records", async () => {
    const publicDataClient = {
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
      publicDataClient,
      ingestionService
    });

    const result = await runner.run({
      maxPages: 2
    });

    expect(publicDataClient.fetchPage)
      .toHaveBeenCalledTimes(2);

    expect(result.pagesFetched).toBe(2);
    expect(result.pagesIngested).toBe(2);
    expect(result.upserted).toBe(2);
  });

  test("rejects an invalid page size", async () => {
    const runner = new CourseCatalogIngestion({
      publicDataClient: {
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
});
