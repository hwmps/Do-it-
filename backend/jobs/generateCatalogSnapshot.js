const path =
  require("path");

const axios =
  require("axios");

const {
  PublicDataClient
} = require(
  "../clients/publicDataClient"
);

const {
  DaeguPublicDataClient
} = require(
  "../clients/daeguPublicDataClient"
);

const {
  BusanCourseAdapter
} = require(
  "../adapters/busanCourseAdapter"
);

const {
  DaeguCourseAdapter
} = require(
  "../adapters/daeguCourseAdapter"
);

const {
  CourseSourceRegistry
} = require(
  "../sources/courseSourceRegistry"
);

const {
  BusanCourseSource
} = require(
  "../sources/busanCourseSource"
);

const {
  DaeguCourseSource
} = require(
  "../sources/daeguCourseSource"
);

const {
  CatalogSnapshotGenerator
} = require(
  "../services/catalogSnapshotGenerator"
);

function positiveInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
}

function decodeApiKey(
  value,
  name
) {
  if (!value) {
    throw new Error(
      `${name} is required`
    );
  }

  return decodeURIComponent(
    value
  );
}

async function runGenerateCatalogSnapshot({
  env = process.env,
  httpClient = axios,
  generatedAt =
    new Date().toISOString(),
  log = console.log
} = {}) {
  /*
   * Validate both credentials before
   * making any network request.
   */
  const busanApiKey =
    decodeApiKey(
      env.PUBLIC_DATA_API_KEY,
      "PUBLIC_DATA_API_KEY"
    );

  const daeguApiKey =
    decodeApiKey(
      env.DAEGU_PUBLIC_DATA_API_KEY,
      "DAEGU_PUBLIC_DATA_API_KEY"
    );

  const outputPath =
    env.CATALOG_SNAPSHOT_OUTPUT_PATH ||
    path.resolve(
      __dirname,
      "../data/catalog.snapshot.json"
    );

  const pageSize =
    positiveInteger(
      env.CATALOG_SNAPSHOT_PAGE_SIZE,
      100
    );

  const maxPages =
    positiveInteger(
      env.CATALOG_SNAPSHOT_MAX_PAGES,
      100
    );

  /*
   * One canonical registry is shared by
   * both heterogeneous public sources.
   */
  const registry =
    new CourseSourceRegistry({
      busan:
        new BusanCourseAdapter(),

      daegu:
        new DaeguCourseAdapter()
    });

  const busanClient =
    new PublicDataClient({
      httpClient,
      apiKey:
        busanApiKey
    });

  const daeguClient =
    new DaeguPublicDataClient({
      httpClient,
      apiKey:
        daeguApiKey
    });

  const busanSource =
    new BusanCourseSource({
      publicDataClient:
        busanClient,

      registry
    });

  const daeguSource =
    new DaeguCourseSource({
      publicDataClient:
        daeguClient,

      registry
    });

  const generator =
    new CatalogSnapshotGenerator({
      sources: [
        busanSource,
        daeguSource
      ]
    });

  const summary =
    await generator.generate({
      outputPath,
      generatedAt,
      pageSize,
      maxPages
    });

  const result = {
    ...summary,

    /*
     * This pipeline deliberately has
     * no DynamoDB dependency.
     */
    awsReads: 0,
    awsWrites: 0
  };

  log(result);

  return result;
}

if (require.main === module) {
  require("dotenv").config({
    quiet: true
  });

  runGenerateCatalogSnapshot()
    .then(() => {
      process.exitCode = 0;
    })
    .catch((error) => {
      console.error(
        "Catalog snapshot generation failed:",
        error.message
      );

      process.exitCode = 1;
    });
}

module.exports = {
  runGenerateCatalogSnapshot
};
