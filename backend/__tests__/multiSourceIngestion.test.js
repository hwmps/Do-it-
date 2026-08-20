const {
  BusanCourseAdapter
} = require("../adapters/busanCourseAdapter");

const {
  DaeguCourseAdapter
} = require("../adapters/daeguCourseAdapter");

const {
  CourseSourceRegistry
} = require("../sources/courseSourceRegistry");

const {
  BusanCourseSource
} = require("../sources/busanCourseSource");

const {
  DaeguCourseSource
} = require("../sources/daeguCourseSource");

const {
  CourseIngestionService
} = require("../services/courseIngestionService");

const {
  CourseCatalogIngestion
} = require("../services/courseCatalogIngestion");

describe("multi-source course ingestion", () => {
  test("reuses the same ingestion core for Busan and Daegu providers", async () => {
    const repository = {
      upsert: jest.fn()
        .mockResolvedValue({})
    };

    const registry =
      new CourseSourceRegistry({
        busan:
          new BusanCourseAdapter(),

        daegu:
          new DaeguCourseAdapter()
      });

    const busanClient = {
      fetchPage: jest.fn()
        .mockResolvedValueOnce([
          {
            lctreNm: "부산 Python 기초",
            adres: "부산광역시 교육센터",
            adresLa: "35.17",
            adresLo: "129.07",
            lctreBeginDttm: "2026-09-01",
            lctreEndDttm: "2026-11-30",
            progrsSttusNm: "접수중"
          }
        ])
        .mockResolvedValueOnce([])
    };

    const daeguClient = {
      fetchPage: jest.fn()
        .mockResolvedValueOnce([
          {
            lec_id: "LEARNING_00090738",
            lec_title: "대구 컴퓨터 기초",
            impl_place: "칠금평생교육원",
            impl_start_dt: "2026.08.12",
            impl_finish_dt: "2026.09.04",
            lec_target_name: "성인"
          }
        ])
        .mockResolvedValueOnce([])
    };

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

    function createRunner(source) {
      const ingestionService =
        new CourseIngestionService({
          repository,
          normalize: (raw) =>
            source.normalize(raw)
        });

      return new CourseCatalogIngestion({
        source,
        ingestionService
      });
    }

    const busanSummary =
      await createRunner(
        busanSource
      ).run({
        pageSize: 10
      });

    const daeguSummary =
      await createRunner(
        daeguSource
      ).run({
        pageSize: 10
      });

    expect(repository.upsert)
      .toHaveBeenCalledTimes(2);

    const busanCourse =
      repository.upsert
        .mock.calls[0][0];

    const daeguCourse =
      repository.upsert
        .mock.calls[1][0];

    expect(busanCourse).toEqual(
      expect.objectContaining({
        source:
          "busan-public-data",
        countryCode: "KR",
        region: "Busan",
        language: "ko",
        title:
          "부산 Python 기초",
        location:
          "부산광역시 교육센터",
        lat: 35.17,
        lng: 129.07
      })
    );

    expect(daeguCourse).toEqual(
      expect.objectContaining({
        source:
          "daegu-lifelong-learning",
        sourceRecordId:
          "LEARNING_00090738",
        countryCode: "KR",
        region: "Daegu",
        language: "ko",
        title:
          "대구 컴퓨터 기초",
        location:
          "칠금평생교육원",
        lat: null,
        lng: null
      })
    );

    expect(busanSummary).toEqual(
      expect.objectContaining({
        received: 1,
        unique: 1,
        upserted: 1,
        failed: 0
      })
    );

    expect(daeguSummary).toEqual(
      expect.objectContaining({
        received: 1,
        unique: 1,
        upserted: 1,
        failed: 0
      })
    );
  });
});
