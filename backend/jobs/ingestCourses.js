const axios = require("axios");
const {
  DynamoDBClient
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient
} = require("@aws-sdk/lib-dynamodb");

const {
  PublicDataClient
} = require("../clients/publicDataClient");
const {
  normalizeCourse
} = require("../domain/normalizeCourse");
const {
  CourseRepository
} = require("../repositories/courseRepository");
const {
  CourseIngestionService
} = require("../services/courseIngestionService");
const {
  CourseCatalogIngestion
} = require("../services/courseCatalogIngestion");

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

async function runCourseIngestionJob({
  env = process.env,
  httpClient = axios,
  dynamoDb,
  log = console.log
} = {}) {
  const rawApiKey =
    env.PUBLIC_DATA_API_KEY || "";

  const tableName =
    env.AWS_DYNAMODB_TABLE_COURSES;

  if (!rawApiKey) {
    throw new Error(
      "PUBLIC_DATA_API_KEY is required"
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
        region: env.AWS_REGION
      })
    );

  const publicDataClient =
    new PublicDataClient({
      httpClient,
      apiKey:
        decodeURIComponent(rawApiKey)
    });

  const repository =
    new CourseRepository({
      client: documentClient,
      tableName
    });

  const ingestionService =
    new CourseIngestionService({
      repository,
      normalize: normalizeCourse
    });

  const catalogIngestion =
    new CourseCatalogIngestion({
      publicDataClient,
      ingestionService
    });

  const summary =
    await catalogIngestion.run({
      pageSize: positiveInteger(
        env.COURSE_INGESTION_PAGE_SIZE,
        50
      ),
      maxPages: positiveInteger(
        env.COURSE_INGESTION_MAX_PAGES,
        100
      )
    });

  log(summary);

  return summary;
}

if (require.main === module) {
  require("dotenv").config();

  runCourseIngestionJob()
    .then(() => {
      process.exitCode = 0;
    })
    .catch((error) => {
      console.error(
        "Course ingestion failed:",
        error.message
      );

      process.exitCode = 1;
    });
}

module.exports = {
  runCourseIngestionJob
};
