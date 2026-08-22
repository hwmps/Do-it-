const fs =
  require("fs");

const os =
  require("os");

const path =
  require("path");

const {
  CatalogSnapshotGenerator
} = require(
  "../services/catalogSnapshotGenerator"
);

function createSource({
  pages,
  normalize
}) {
  return {
    fetchPage:
      jest.fn(
        async ({
          pageNo
        }) =>
          pages[
            pageNo - 1
          ] || []
      ),

    normalize:
      jest.fn(
        normalize ||
          ((raw) => raw)
      )
  };
}

describe(
  "CatalogSnapshotGenerator",
  () => {
    test(
      "merges multiple sources into a deterministic snapshot",
      async () => {
        const directory =
          fs.mkdtempSync(
            path.join(
              os.tmpdir(),
              "doit-snapshot-generator-"
            )
          );

        const outputPath =
          path.join(
            directory,
            "catalog.snapshot.json"
          );

        const busanSource =
          createSource({
            pages: [
              [
                {
                  sourceId:
                    "busan-2",
                  source:
                    "busan-public-data",
                  title:
                    "Busan 2"
                },
                {
                  sourceId:
                    "busan-1",
                  source:
                    "busan-public-data",
                  title:
                    "Busan 1"
                }
              ],
              []
            ]
          });

        const daeguSource =
          createSource({
            pages: [
              [
                {
                  sourceId:
                    "daegu-1",
                  source:
                    "daegu-lifelong-learning",
                  title:
                    "Daegu 1"
                }
              ],
              []
            ]
          });

        const generator =
          new CatalogSnapshotGenerator({
            sources: [
              busanSource,
              daeguSource
            ]
          });

        const result =
          await generator.generate({
            outputPath,
            generatedAt:
              "2026-08-22T12:00:00.000Z",
            pageSize: 50,
            maxPages: 10
          });

        const snapshot =
          JSON.parse(
            fs.readFileSync(
              outputPath,
              "utf8"
            )
          );

        expect(
          snapshot.schemaVersion
        ).toBe(1);

        expect(
          snapshot.generatedAt
        ).toBe(
          "2026-08-22T12:00:00.000Z"
        );

        expect(
          snapshot.courses.map(
            (course) =>
              course.sourceId
          )
        ).toEqual([
          "busan-1",
          "busan-2",
          "daegu-1"
        ]);

        expect(result)
          .toEqual(
            expect.objectContaining({
              sourcesProcessed: 2,
              uniqueCourses: 3,
              duplicates: 0
            })
          );

        fs.rmSync(
          directory,
          {
            recursive: true,
            force: true
          }
        );
      }
    );

    test(
      "deduplicates repeated sourceIds",
      async () => {
        const directory =
          fs.mkdtempSync(
            path.join(
              os.tmpdir(),
              "doit-snapshot-generator-"
            )
          );

        const outputPath =
          path.join(
            directory,
            "catalog.snapshot.json"
          );

        const source =
          createSource({
            pages: [
              [
                {
                  sourceId:
                    "course-1",
                  source:
                    "busan-public-data",
                  title:
                    "Course 1"
                },
                {
                  sourceId:
                    "course-1",
                  source:
                    "busan-public-data",
                  title:
                    "Course 1"
                }
              ],
              []
            ]
          });

        const generator =
          new CatalogSnapshotGenerator({
            sources: [
              source
            ]
          });

        const result =
          await generator.generate({
            outputPath,
            generatedAt:
              "2026-08-22T12:00:00.000Z"
          });

        const snapshot =
          JSON.parse(
            fs.readFileSync(
              outputPath,
              "utf8"
            )
          );

        expect(
          snapshot.courses
        ).toHaveLength(1);

        expect(
          result.duplicates
        ).toBe(1);

        fs.rmSync(
          directory,
          {
            recursive: true,
            force: true
          }
        );
      }
    );

    test(
      "rejects conflicting records with the same sourceId",
      async () => {
        const directory =
          fs.mkdtempSync(
            path.join(
              os.tmpdir(),
              "doit-snapshot-generator-"
            )
          );

        const outputPath =
          path.join(
            directory,
            "catalog.snapshot.json"
          );

        const source =
          createSource({
            pages: [
              [
                {
                  sourceId:
                    "course-1",
                  source:
                    "busan-public-data",
                  title:
                    "Original"
                },
                {
                  sourceId:
                    "course-1",
                  source:
                    "busan-public-data",
                  title:
                    "Different"
                }
              ],
              []
            ]
          });

        const generator =
          new CatalogSnapshotGenerator({
            sources: [
              source
            ]
          });

        await expect(
          generator.generate({
            outputPath,
            generatedAt:
              "2026-08-22T12:00:00.000Z"
          })
        ).rejects.toThrow(
          "conflicting duplicate sourceId"
        );

        expect(
          fs.existsSync(
            outputPath
          )
        ).toBe(false);

        fs.rmSync(
          directory,
          {
            recursive: true,
            force: true
          }
        );
      }
    );

    test(
      "preserves the previous snapshot when generation fails",
      async () => {
        const directory =
          fs.mkdtempSync(
            path.join(
              os.tmpdir(),
              "doit-snapshot-generator-"
            )
          );

        const outputPath =
          path.join(
            directory,
            "catalog.snapshot.json"
          );

        const previousSnapshot = {
          schemaVersion: 1,
          generatedAt:
            "2026-08-21T12:00:00.000Z",
          courses: [
            {
              sourceId:
                "old-course",
              title:
                "Existing snapshot"
            }
          ]
        };

        fs.writeFileSync(
          outputPath,
          JSON.stringify(
            previousSnapshot
          ),
          "utf8"
        );

        const failingSource = {
          fetchPage:
            jest.fn(
              async () => {
                throw new Error(
                  "source unavailable"
                );
              }
            ),

          normalize:
            jest.fn(
              (raw) => raw
            )
        };

        const generator =
          new CatalogSnapshotGenerator({
            sources: [
              failingSource
            ]
          });

        await expect(
          generator.generate({
            outputPath,
            generatedAt:
              "2026-08-22T12:00:00.000Z"
          })
        ).rejects.toThrow(
          "source unavailable"
        );

        const snapshotAfterFailure =
          JSON.parse(
            fs.readFileSync(
              outputPath,
              "utf8"
            )
          );

        expect(
          snapshotAfterFailure
        ).toEqual(
          previousSnapshot
        );

        fs.rmSync(
          directory,
          {
            recursive: true,
            force: true
          }
        );
      }
    );
  }
);
