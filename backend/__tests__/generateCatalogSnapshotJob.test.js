const fs =
  require("fs");

const os =
  require("os");

const path =
  require("path");

const {
  runGenerateCatalogSnapshot
} = require(
  "../jobs/generateCatalogSnapshot"
);

describe(
  "generateCatalogSnapshot job",
  () => {
    test(
      "builds one canonical snapshot from Busan JSON and Daegu XML without AWS",
      async () => {
        const directory =
          fs.mkdtempSync(
            path.join(
              os.tmpdir(),
              "doit-snapshot-job-"
            )
          );

        const outputPath =
          path.join(
            directory,
            "catalog.snapshot.json"
          );

        const httpClient = {
          get: jest.fn(
            async (
              url,
              options
            ) => {
              const pageNo =
                options.params.pageNo;

              if (
                url.includes(
                  "BusanCrsTrnngInfoService"
                )
              ) {
                if (pageNo === 1) {
                  return {
                    data: {
                      getCrsTrnngInfo: {
                        body: {
                          items: {
                            item: [
                              {
                                lctreNm:
                                  "부산 자바 기초",

                                adres:
                                  "부산광역시",

                                lctreBeginDttm:
                                  "2026-09-01",

                                lctreEndDttm:
                                  "2026-09-30",

                                progrsSttusNm:
                                  "접수중",

                                adresLa:
                                  "35.1796",

                                adresLo:
                                  "129.0756"
                              }
                            ]
                          }
                        }
                      }
                    }
                  };
                }

                return {
                  data: {
                    getCrsTrnngInfo: {
                      body: {
                        items: {
                          item: []
                        }
                      }
                    }
                  }
                };
              }

              if (
                url.includes(
                  "lectureServiceV3"
                )
              ) {
                if (pageNo === 1) {
                  return {
                    data: `
                      <response>
                        <header>
                          <resultCode>00</resultCode>
                          <resultMsg>NORMAL SERVICE.</resultMsg>
                        </header>

                        <body>
                          <items>
                            <item>
                              <lec_id>DG-1</lec_id>
                              <lec_title>대구 파이썬 기초</lec_title>
                              <impl_place>대구 평생학습관</impl_place>
                              <impl_start_dt>2026.09.01</impl_start_dt>
                              <impl_finish_dt>2026.09.30</impl_finish_dt>
                              <lec_target_name>성인</lec_target_name>
                              <ins_name>대구교육기관</ins_name>
                            </item>
                          </items>
                        </body>
                      </response>
                    `
                  };
                }

                return {
                  data: `
                    <response>
                      <header>
                        <resultCode>00</resultCode>
                        <resultMsg>NORMAL SERVICE.</resultMsg>
                      </header>

                      <body>
                        <items></items>
                      </body>
                    </response>
                  `
                };
              }

              throw new Error(
                `unexpected URL: ${url}`
              );
            }
          )
        };

        const logs = [];

        const result =
          await runGenerateCatalogSnapshot({
            env: {
              PUBLIC_DATA_API_KEY:
                "busan-test-key",

              DAEGU_PUBLIC_DATA_API_KEY:
                "daegu-test-key",

              CATALOG_SNAPSHOT_OUTPUT_PATH:
                outputPath,

              CATALOG_SNAPSHOT_PAGE_SIZE:
                "100",

              CATALOG_SNAPSHOT_MAX_PAGES:
                "10"
            },

            httpClient,

            generatedAt:
              "2026-08-22T12:00:00.000Z",

            log: (value) =>
              logs.push(value)
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
          snapshot.courses
        ).toHaveLength(2);

        expect(
          snapshot.courses.map(
            (course) =>
              course.region
          ).sort()
        ).toEqual([
          "Busan",
          "Daegu"
        ]);

        expect(
          snapshot.courses.every(
            (course) =>
              typeof course.sourceId ===
                "string" &&
              course.sourceId.length > 0
          )
        ).toBe(true);

        expect(result)
          .toEqual(
            expect.objectContaining({
              sourcesProcessed: 2,
              uniqueCourses: 2,
              awsReads: 0,
              awsWrites: 0
            })
          );

        expect(
          httpClient.get
        ).toHaveBeenCalledTimes(4);

        expect(logs)
          .toHaveLength(1);

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
      "requires both public data API keys before generating a snapshot",
      async () => {
        await expect(
          runGenerateCatalogSnapshot({
            env: {
              PUBLIC_DATA_API_KEY:
                "busan-test-key"
            },

            httpClient: {
              get: jest.fn()
            }
          })
        ).rejects.toThrow(
          "DAEGU_PUBLIC_DATA_API_KEY is required"
        );
      }
    );
  }
);
