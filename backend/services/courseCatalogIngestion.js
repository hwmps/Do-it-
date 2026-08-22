class CourseCatalogIngestion {
  constructor({
    source,
    ingestionService
  }) {
    if (
      !source ||
      typeof source.fetchPage !== "function"
    ) {
      throw new TypeError(
        "source with fetchPage() is required"
      );
    }

    if (
      !ingestionService ||
      typeof ingestionService.ingest !== "function"
    ) {
      throw new TypeError(
        "ingestionService with ingest() is required"
      );
    }

    this.source = source;
    this.ingestionService = ingestionService;
  }

  async run({
    pageSize = 50,
    maxPages = 100,
    now = new Date().toISOString()
  } = {}) {
    if (
      !Number.isInteger(pageSize) ||
      pageSize <= 0
    ) {
      throw new RangeError(
        "pageSize must be a positive integer"
      );
    }

    if (
      !Number.isInteger(maxPages) ||
      maxPages <= 0
    ) {
      throw new RangeError(
        "maxPages must be a positive integer"
      );
    }

    const seenSourceIds = new Set();
    const persistedSourceIds = new Set();

    const summary = {
      pagesFetched: 0,
      pagesIngested: 0,
      received: 0,
      normalized: 0,
      unique: 0,
      duplicates: 0,
      upserted: 0,
      invalid: 0,
      failed: 0
    };

    for (
      let pageNo = 1;
      pageNo <= maxPages;
      pageNo += 1
    ) {
      const records =
        await this.source.fetchPage({
          pageNo,
          numOfRows: pageSize
        });

      summary.pagesFetched += 1;

      if (records.length === 0) {
        break;
      }

      const pageSummary =
        await this.ingestionService.ingest(
          records,
          {
            now,
            seenSourceIds,
            persistedSourceIds
          }
        );

      summary.pagesIngested += 1;
      summary.received += pageSummary.received;
      summary.normalized += pageSummary.normalized;
      summary.unique +=
        pageSummary.unique ??
        pageSummary.normalized;
      summary.duplicates +=
        pageSummary.duplicates ?? 0;
      summary.upserted += pageSummary.upserted;
      summary.invalid += pageSummary.invalid;
      summary.failed += pageSummary.failed;
    }

    return summary;
  }
}

module.exports = {
  CourseCatalogIngestion
};
