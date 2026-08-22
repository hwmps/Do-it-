const fs =
  require("fs");

const os =
  require("os");

const path =
  require("path");

const {
  loadCatalogSnapshot
} = require(
  "../utils/catalogSnapshotLoader"
);

function writeTempSnapshot(
  value
) {
  const directory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "doit-catalog-"
      )
    );

  const filePath =
    path.join(
      directory,
      "catalog.json"
    );

  fs.writeFileSync(
    filePath,
    JSON.stringify(value),
    "utf8"
  );

  return filePath;
}

describe("catalogSnapshotLoader", () => {
  test("loads a valid versioned catalog snapshot", () => {
    const filePath =
      writeTempSnapshot({
        schemaVersion: 1,

        generatedAt:
          "2026-08-22T12:00:00.000Z",

        courses: [
          {
            sourceId: "course-1",
            title: "Course 1"
          }
        ]
      });

    const snapshot =
      loadCatalogSnapshot(
        filePath
      );

    expect(snapshot)
      .toEqual({
        schemaVersion: 1,

        generatedAt:
          "2026-08-22T12:00:00.000Z",

        courses: [
          {
            sourceId: "course-1",
            title: "Course 1"
          }
        ]
      });
  });

  test("rejects unsupported schema versions", () => {
    const filePath =
      writeTempSnapshot({
        schemaVersion: 99,

        generatedAt:
          "2026-08-22T12:00:00.000Z",

        courses: []
      });

    expect(() =>
      loadCatalogSnapshot(
        filePath
      )
    ).toThrow(
      "unsupported snapshot schemaVersion"
    );
  });

  test("rejects an invalid generatedAt timestamp", () => {
    const filePath =
      writeTempSnapshot({
        schemaVersion: 1,

        generatedAt:
          "not-a-date",

        courses: []
      });

    expect(() =>
      loadCatalogSnapshot(
        filePath
      )
    ).toThrow(
      "generatedAt"
    );
  });

  test("rejects snapshots without a courses array", () => {
    const filePath =
      writeTempSnapshot({
        schemaVersion: 1,

        generatedAt:
          "2026-08-22T12:00:00.000Z",

        courses: null
      });

    expect(() =>
      loadCatalogSnapshot(
        filePath
      )
    ).toThrow(
      "courses must be an array"
    );
  });

  test("rejects malformed JSON", () => {
    const directory =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "doit-catalog-"
        )
      );

    const filePath =
      path.join(
        directory,
        "catalog.json"
      );

    fs.writeFileSync(
      filePath,
      "{ definitely-not-json",
      "utf8"
    );

    expect(() =>
      loadCatalogSnapshot(
        filePath
      )
    ).toThrow(
      "invalid catalog snapshot JSON"
    );
  });
});
