const axios = require("axios");

const {
  DynamoDBClient
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient
} = require("@aws-sdk/lib-dynamodb");

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
  CourseRepository
} = require("../repositories/courseRepository");

const {
  CourseIngestionService
} = require("../services/courseIngestionService");

const {
  CourseCatalogIngestion
} = require("../services/courseCatalogIngestion");

function positiveInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(value, 10);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
}

async function runDaeguIngestionJob({
  env = process.env,
  httpClient = axios,
  dynamoDb,
  log = console.log
} = {}) {
  if (
    env.ALLOW_DYNAMODB_WRITE !==
    "true"
  ) {
    throw new Error(
      "ALLOW_DYNAMODB_WRITE=true is required for Daegu production ingestion"
    );
  }

  const rawApiKey =
    env.DAEGU_PUBLIC_DATA_API_KEY ||
    "";

  const tableName =
    env.AWS_DYNAMODB_TABLE_COURSES;

  if (!rawApiKey) {
    throw new Error(
      "DAEGU_PUBLIC_DATA_API_KEY is required"
    );
  }

  if (!tableName) {
    throw new Error(
      "AWS_DYNAMODB_TABLE_COURSES is required"
    );
  }

  const documentClient =
    dynamoDb ||
    DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region:
          env.AWS_REGION
      })
    );

  const publicDataClient =
    new DaeguPublicDataClient({
      httpClient,
      apiKey:
        decodeURIComponent(
          rawApiKey
        )
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

  const repository =
    new CourseRepository({
      client:
        documentClient,
      tableName
    });

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
      pageSize:
        positiveInteger(
          env.COURSE_INGESTION_PAGE_SIZE,
          100
        ),

      maxPages:
        positiveInteger(
          env.COURSE_INGESTION_MAX_PAGES,
          100
        )
    });

  log(summary);

  return summary;
}

if (require.main === module) {
  require("dotenv").config({
    quiet: true
  });

  runDaeguIngestionJob()
    .then(() => {
      process.exitCode = 0;
    })
    .catch((error) => {
      console.error(
        "Daegu ingestion failed:",
        error.message
      );

      process.exitCode = 1;
    });
}

module.exports = {
  runDaeguIngestionJob
};
