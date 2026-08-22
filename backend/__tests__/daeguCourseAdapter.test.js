const {
  DaeguCourseAdapter
} = require("../adapters/daeguCourseAdapter");

describe("DaeguCourseAdapter", () => {
  test("normalizes Daegu lecture data into the canonical course model", () => {
    const adapter = new DaeguCourseAdapter();

    const course = adapter.normalize({
      lec_title: "컴퓨터 기초",
      impl_start_dt: "2026-08-12",
      impl_finish_dt: "2026-09-04",
      start_time: "09:00",
      end_time: "11:30",
      lec_target_name: "청년/직장인,성인",
      day_week: "수,금",
      impl_place: "칠금평생교육원 3층 컨퍼런스룸",
      lec_fixedcnt: "15",
      lec_cost: "81510",
      ins_name: "칠금평생교육원",
      impl_info_tel: "053-781-3888",
      impl_reg_start: "2026-05-18",
      impl_reg_finish: "2026-08-11",
      receipt: "온라인접수",
      lec_refer_url: "https://example.com/course"
    });

    expect(course).toEqual(
      expect.objectContaining({
        source: "daegu-lifelong-learning",
        countryCode: "KR",
        region: "Daegu",
        language: "ko",

        title: "컴퓨터 기초",
        location: "칠금평생교육원 3층 컨퍼런스룸",

        startAt: "2026-08-12",
        endAt: "2026-09-04",

        lat: null,
        lng: null,
        coordinateSource: "unknown",

        target: "청년/직장인,성인",
        daysOfWeek: "수,금",
        institution: "칠금평생교육원",
        registrationStartAt: "2026-05-18",
        registrationEndAt: "2026-08-11",
        sourceUrl: "https://example.com/course"
      })
    );

    expect(course.sourceId)
      .toEqual(expect.any(String));
  });

  test("keeps sourceId stable when mutable fields change", () => {
    const adapter = new DaeguCourseAdapter();

    const first = adapter.normalize({
      lec_title: "컴퓨터 기초",
      impl_place: "칠금평생교육원",
      impl_start_dt: "2026-08-12",
      impl_finish_dt: "2026-09-04",
      lec_cost: "81510"
    });

    const second = adapter.normalize({
      lec_title: "컴퓨터 기초",
      impl_place: "칠금평생교육원",
      impl_start_dt: "2026-08-12",
      impl_finish_dt: "2026.09.10",
      lec_cost: "90000"
    });

    expect(first.sourceId)
      .toBe(second.sourceId);
  });

  test("does not fabricate coordinates", () => {
    const adapter = new DaeguCourseAdapter();

    const course = adapter.normalize({
      lec_title: "영어 회화",
      impl_place: "대구 평생학습관",
      impl_start_dt: "2026.09.01"
    });

    expect(course.lat).toBeNull();
    expect(course.lng).toBeNull();

    expect(course.coordinateSource)
      .toBe("unknown");
  });

  test("rejects a record without a title", () => {
    const adapter = new DaeguCourseAdapter();

    expect(() =>
      adapter.normalize({
        impl_place: "대구광역시"
      })
    ).toThrow("title");
  });
  test("uses the upstream lec_id as the stable identity when available", () => {
    const adapter = new DaeguCourseAdapter();

    const first = adapter.normalize({
      lec_id: "LEARNING_00090738",
      lec_title: "기존 제목",
      impl_place: "기존 장소",
      impl_start_dt: "2026.04.22"
    });

    const updated = adapter.normalize({
      lec_id: "LEARNING_00090738",
      lec_title: "수정된 제목",
      impl_place: "수정된 장소",
      impl_start_dt: "2026.05.01"
    });

    expect(first.sourceId)
      .toBe(updated.sourceId);
  });

  test("keeps different upstream lec_id values distinct", () => {
    const adapter = new DaeguCourseAdapter();

    const first = adapter.normalize({
      lec_id: "LEARNING_00000001",
      lec_title: "같은 강좌명",
      impl_place: "같은 장소",
      impl_start_dt: "2026.09.01"
    });

    const second = adapter.normalize({
      lec_id: "LEARNING_00000002",
      lec_title: "같은 강좌명",
      impl_place: "같은 장소",
      impl_start_dt: "2026.09.01"
    });

    expect(first.sourceId)
      .not.toBe(second.sourceId);
  });
});
