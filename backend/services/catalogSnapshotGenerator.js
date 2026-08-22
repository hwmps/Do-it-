const fs =
  require("fs");

const path =
  require("path");

const {
  randomUUID
} = require("crypto");

const {
  isDeepStrictEqual
} = require("util");

const SCHEMA_VERSION = 1;

function assertPositiveInteger(
  value,
  name
) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new RangeError(
      `${name} must be a positive integer`
    );
  }
}

function validateGeneratedAt(
  generatedAt
) {
  if (
    typeof generatedAt !==
      "string" ||
    !generatedAt.trim() ||
    Number.isNaN(
      Date.parse(generatedAt)
    )
  ) {
    throw new Error(
      "generatedAt must be a valid timestamp"
    );
  }
}

function validateSource(
  source
) {
  if (
    !source ||
    typeof source.fetchPage !==
      "function"
  ) {
    throw new TypeError(
      "source with fetchPage() is required"
    );
  }

  if (
    typeof source.normalize !==
      "function"
  ) {
    throw new TypeError(
      "source with normalize() is required"
    );
  }
}

function validateCourse(
  course
) {
  if (
    !course ||
    typeof course !==
      "object" ||
    Array.isArray(course)
  ) {
    throw new Error(
      "normalized course must be an object"
    );
  }

  if (
    typeof course.sourceId !==
      "string" ||
    !course.sourceId.trim()
  ) {
    throw new Error(
      "normalized course sourceId is required"
    );
  }
}

function compareBySourceId(
  left,
  right
) {
  if (
    left.sourceId <
    right.sourceId
  ) {
    return -1;
  }

  if (
    left.sourceId >
    right.sourceId
  ) {
    return 1;
  }

  return 0;
}

class CatalogSnapshotGenerator {
  constructor({
    sources
  }) {
    if (
      !Array.isArray(sources) ||
      sources.length === 0
    ) {
      throw new TypeError(
        "sources must be a non-empty array"
      );
    }

    sources.forEach(
      validateSource
    );

    this.sources =
      [...sources];
  }

  async generate({
    outputPath,
    generatedAt =
      new Date().toISOString(),
    pageSize = 50,
    maxPages = 100
  } = {}) {
    if (
      typeof outputPath !==
        "string" ||
      !outputPath.trim()
    ) {
      throw new TypeError(
        "outputPath is required"
      );
    }

    validateGeneratedAt(
      generatedAt
    );

    assertPositiveInteger(
      pageSize,
      "pageSize"
    );

    assertPositiveInteger(
      maxPages,
      "maxPages"
    );

    const coursesBySourceId =
      new Map();

    let duplicates = 0;
    let recordsReceived = 0;
    let recordsNormalized = 0;
    let pagesFetched = 0;
    let sourcesProcessed = 0;

    for (
      const source
      of this.sources
    ) {
      for (
        let pageNo = 1;
        pageNo <= maxPages;
        pageNo += 1
      ) {
        const records =
          await source.fetchPage({
            pageNo,
            numOfRows:
              pageSize
          });

        pagesFetched += 1;

        if (
          !Array.isArray(records)
        ) {
          throw new TypeError(
            "source fetchPage() must return an array"
          );
        }

        if (
          records.length === 0
        ) {
          break;
        }

        recordsReceived +=
          records.length;

        for (
          const raw
          of records
        ) {
          const course =
            source.normalize(
              raw
            );

          validateCourse(
            course
          );

          recordsNormalized +=
            1;

          const existing =
            coursesBySourceId.get(
              course.sourceId
            );

          if (!existing) {
            coursesBySourceId.set(
              course.sourceId,
              course
            );

            continue;
          }

          if (
            isDeepStrictEqual(
              existing,
              course
            )
          ) {
            duplicates += 1;
            continue;
          }

          throw new Error(
            `conflicting duplicate sourceId: ${course.sourceId}`
          );
        }
      }

      sourcesProcessed += 1;
    }

    const courses =
      Array.from(
        coursesBySourceId
          .values()
      )
        .sort(
          compareBySourceId
        );

    const snapshot = {
      schemaVersion:
        SCHEMA_VERSION,

      generatedAt,

      courses
    };

    const directory =
      path.dirname(
        outputPath
      );

    fs.mkdirSync(
      directory,
      {
        recursive: true
      }
    );

    const temporaryPath =
      path.join(
        directory,
        `.${path.basename(
          outputPath
        )}.${process.pid}.${randomUUID()}.tmp`
      );

    try {
      fs.writeFileSync(
        temporaryPath,
        `${JSON.stringify(
          snapshot,
          null,
          2
        )}\n`,
        "utf8"
      );

      /*
       * Same-filesystem rename makes the
       * completed snapshot visible at once.
       *
       * If fetching/normalization failed
       * earlier, this point is never reached,
       * so the previous snapshot survives.
       */
      fs.renameSync(
        temporaryPath,
        outputPath
      );
    } catch (error) {
      if (
        fs.existsSync(
          temporaryPath
        )
      ) {
        fs.rmSync(
          temporaryPath,
          {
            force: true
          }
        );
      }

      throw error;
    }

    return {
      schemaVersion:
        SCHEMA_VERSION,

      generatedAt,

      sourcesProcessed,
      pagesFetched,
      recordsReceived,
      recordsNormalized,

      uniqueCourses:
        courses.length,

      duplicates,

      outputPath
    };
  }
}

module.exports = {
  CatalogSnapshotGenerator
};
