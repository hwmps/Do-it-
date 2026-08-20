class CourseIngestionService {
  constructor({
    repository,
    normalize
  }) {
    if (!repository || typeof repository.upsert !== "function") {
      throw new TypeError(
        "repository with upsert() is required"
      );
    }

    if (typeof normalize !== "function") {
      throw new TypeError(
        "normalize function is required"
      );
    }

    this.repository = repository;
    this.normalize = normalize;
  }

  async ingest(
    records,
    {
      now = new Date().toISOString(),
      seenSourceIds,
      persistedSourceIds
    } = {}
  ) {
    if (!Array.isArray(records)) {
      throw new TypeError(
        "ingestion payload must be an array"
      );
    }

    const dedupeEnabled =
      seenSourceIds instanceof Set;

    const seen =
      dedupeEnabled
        ? seenSourceIds
        : new Set();

    const persisted =
      persistedSourceIds instanceof Set
        ? persistedSourceIds
        : new Set();

    const summary = {
      received: records.length,
      normalized: 0,
      upserted: 0,
      invalid: 0,
      failed: 0
    };

    if (dedupeEnabled) {
      summary.unique = 0;
      summary.duplicates = 0;
    }

    for (const raw of records) {
      let course;

      try {
        course = this.normalize(raw);
        summary.normalized += 1;
      } catch {
        summary.invalid += 1;
        continue;
      }

      const alreadySeen =
        seen.has(course.sourceId);

      if (alreadySeen) {
        if (dedupeEnabled) {
          summary.duplicates += 1;
        }
      } else {
        seen.add(course.sourceId);

        if (dedupeEnabled) {
          summary.unique += 1;
        }
      }

      if (
        dedupeEnabled &&
        persisted.has(course.sourceId)
      ) {
        continue;
      }

      try {
        await this.repository.upsert(
          course,
          { now }
        );

        persisted.add(course.sourceId);
        summary.upserted += 1;
      } catch {
        summary.failed += 1;
      }
    }

    return summary;
  }
}

module.exports = {
  CourseIngestionService
};
