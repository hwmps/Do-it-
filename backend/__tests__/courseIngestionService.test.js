const {
  CourseIngestionService
} = require("../services/courseIngestionService");

describe("CourseIngestionService", () => {
  test("normalizes and upserts valid records", async () => {
    const normalize = jest
      .fn()
      .mockImplementation((raw) => ({
        sourceId: `course-${raw.id}`,
        titleKo: raw.title
      }));

    const repository = {
      upsert: jest.fn().mockResolvedValue({})
    };

    const service = new CourseIngestionService({
      repository,
      normalize
    });

    const result = await service.ingest([
      { id: 1, title: "Python" },
      { id: 2, title: "AI" }
    ], {
      now: "2026-08-20T00:00:00.000Z"
    });

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      received: 2,
      normalized: 2,
      upserted: 2,
      invalid: 0,
      failed: 0
    });
  });

  test("skips invalid records without stopping the ingestion run", async () => {
    const normalize = jest
      .fn()
      .mockImplementation((raw) => {
        if (!raw.title) {
          throw new Error("course title is required");
        }

        return {
          sourceId: `course-${raw.id}`,
          titleKo: raw.title
        };
      });

    const repository = {
      upsert: jest.fn().mockResolvedValue({})
    };

    const service = new CourseIngestionService({
      repository,
      normalize
    });

    const result = await service.ingest([
      { id: 1, title: "Python" },
      { id: 2 },
      { id: 3, title: "AI" }
    ]);

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      received: 3,
      normalized: 2,
      upserted: 2,
      invalid: 1,
      failed: 0
    });
  });

  test("continues after an individual repository failure", async () => {
    const normalize = jest
      .fn()
      .mockImplementation((raw) => ({
        sourceId: `course-${raw.id}`,
        titleKo: raw.title
      }));

    const repository = {
      upsert: jest
        .fn()
        .mockRejectedValueOnce(
          new Error("DynamoDB unavailable")
        )
        .mockResolvedValueOnce({})
    };

    const service = new CourseIngestionService({
      repository,
      normalize
    });

    const result = await service.ingest([
      { id: 1, title: "Python" },
      { id: 2, title: "AI" }
    ]);

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      received: 2,
      normalized: 2,
      upserted: 1,
      invalid: 0,
      failed: 1
    });
  });

  test("passes the same ingestion timestamp to every upsert", async () => {
    const normalize = jest
      .fn()
      .mockImplementation((raw) => ({
        sourceId: `course-${raw.id}`,
        titleKo: raw.title
      }));

    const repository = {
      upsert: jest.fn().mockResolvedValue({})
    };

    const service = new CourseIngestionService({
      repository,
      normalize
    });

    const now = "2026-08-20T12:00:00.000Z";

    await service.ingest([
      { id: 1, title: "Python" },
      { id: 2, title: "AI" }
    ], {
      now
    });

    expect(repository.upsert)
      .toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        { now }
      );

    expect(repository.upsert)
      .toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        { now }
      );
  });

  test("rejects a non-array ingestion payload", async () => {
    const service = new CourseIngestionService({
      repository: {
        upsert: jest.fn()
      },
      normalize: jest.fn()
    });

    await expect(
      service.ingest(null)
    ).rejects.toThrow("array");
  });

  test("skips duplicate sourceIds before writing to the repository", async () => {
    const normalize = jest
      .fn()
      .mockImplementation((raw) => ({
        sourceId: raw.sourceId,
        titleKo: raw.title
      }));

    const repository = {
      upsert: jest.fn().mockResolvedValue({})
    };

    const service = new CourseIngestionService({
      repository,
      normalize
    });

    const seenSourceIds = new Set();

    const first = await service.ingest([
      { sourceId: "course-1", title: "Python" },
      { sourceId: "course-1", title: "Python" },
      { sourceId: "course-2", title: "AI" }
    ], {
      seenSourceIds
    });

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(first).toEqual({
      received: 3,
      normalized: 3,
      unique: 2,
      duplicates: 1,
      upserted: 2,
      invalid: 0,
      failed: 0
    });
  });


  test("retries a duplicate when the earlier write for that sourceId failed", async () => {
    const normalize = jest.fn((raw) => ({
      sourceId: raw.sourceId,
      titleKo: raw.title
    }));

    const repository = {
      upsert: jest.fn()
        .mockRejectedValueOnce(new Error("temporary write failure"))
        .mockResolvedValueOnce({})
    };

    const service = new CourseIngestionService({
      repository,
      normalize
    });

    const seenSourceIds = new Set();
    const persistedSourceIds = new Set();

    const result = await service.ingest([
      { sourceId: "course-a", title: "Course A" },
      { sourceId: "course-a", title: "Course A" }
    ], {
      seenSourceIds,
      persistedSourceIds
    });

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    expect(result).toEqual({
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
