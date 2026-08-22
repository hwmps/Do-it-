const axios = require("axios");

const {
  DaeguPublicDataClient
} = require("../clients/daeguPublicDataClient");

const {
  DaeguCourseAdapter
} = require("../adapters/daeguCourseAdapter");

const {
  CourseSourceRegistry
} = require("../sources/courseSourceRegistry");

const {
  DaeguCourseSource
} = require("../sources/daeguCourseSource");

const {
  CourseIngestionService
} = require("../services/courseIngestionService");

const {
  CourseCatalogIngestion
} = require("../services/courseCatalogIngestion");

async function runDaeguDryRun({
  env = process.env,
  httpClient = axios,
  log = console.log
} = {}) {
  const rawApiKey =
    env.DAEGU_PUBLIC_DATA_API_KEY || "";

  if (!rawApiKey) {
    throw new Error(
      "DAEGU_PUBLIC_DATA_API_KEY is required"
    );
  }

  const apiKey =
    decodeURIComponent(rawApiKey);

  const publicDataClient =
    new DaeguPublicDataClient({
      httpClient,
      apiKey
    });

  const registry =
    new CourseSourceRegistry({
      daegu:
        new DaeguCourseAdapter()
    });

  const source =
    new DaeguCourseSource({
      publicDataClient,
      registry
    });

  const simulatedItems =
    new Map();

  const repository = {
    async upsert(course) {
      simulatedItems.set(
        course.sourceId,
        course
      );

      return course;
    }
  };

  const ingestionService =
    new CourseIngestionService({
      repository,
      normalize: (raw) =>
        source.normalize(raw)
    });

  const catalogIngestion =
    new CourseCatalogIngestion({
      source,
      ingestionService
    });

  const summary =
    await catalogIngestion.run({
      pageSize: 100,
      maxPages: 100
    });

  const result = {
    dryRun: true,
    dynamoDbWrites: 0,
    simulatedUniqueItems:
      simulatedItems.size,
    ...summary
  };

  log(result);

  return result;
}

if (require.main === module) {
  require("dotenv").config({
    quiet: true
  });

  runDaeguDryRun()
    .catch((error) => {
      console.error(
        "Daegu dry run failed:",
        error.message
      );

      process.exitCode = 1;
    });
}

module.exports = {
  runDaeguDryRun
};
