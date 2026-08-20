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
      now = new Date().toISOString()
    } = {}
  ) {
    if (!Array.isArray(records)) {
      throw new TypeError(
        "ingestion payload must be an array"
      );
    }

    const summary = {
      received: records.length,
      normalized: 0,
      upserted: 0,
      invalid: 0,
      failed: 0
    };

    for (const raw of records) {
      let course;

      try {
        course = this.normalize(raw);
        summary.normalized += 1;
      } catch {
        summary.invalid += 1;
        continue;
      }

      try {
        await this.repository.upsert(
          course,
          { now }
        );

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
