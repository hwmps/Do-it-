const fs =
  require("fs");

const SUPPORTED_SCHEMA_VERSION =
  1;

function parseSnapshotJson(
  raw
) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "invalid catalog snapshot JSON"
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
      "snapshot generatedAt must be a valid timestamp"
    );
  }
}

function validateSnapshot(
  snapshot
) {
  if (
    !snapshot ||
    typeof snapshot !==
      "object" ||
    Array.isArray(snapshot)
  ) {
    throw new Error(
      "catalog snapshot must be an object"
    );
  }

  if (
    snapshot.schemaVersion !==
      SUPPORTED_SCHEMA_VERSION
  ) {
    throw new Error(
      `unsupported snapshot schemaVersion: ${snapshot.schemaVersion}`
    );
  }

  validateGeneratedAt(
    snapshot.generatedAt
  );

  if (
    !Array.isArray(
      snapshot.courses
    )
  ) {
    throw new TypeError(
      "courses must be an array"
    );
  }

  return snapshot;
}

function loadCatalogSnapshot(
  filePath
) {
  if (
    typeof filePath !==
      "string" ||
    !filePath.trim()
  ) {
    throw new TypeError(
      "filePath is required"
    );
  }

  const raw =
    fs.readFileSync(
      filePath,
      "utf8"
    );

  const snapshot =
    parseSnapshotJson(raw);

  return validateSnapshot(
    snapshot
  );
}

module.exports = {
  loadCatalogSnapshot
};
