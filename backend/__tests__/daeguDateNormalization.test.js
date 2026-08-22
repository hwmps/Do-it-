const {
  DaeguCourseAdapter
} = require("../adapters/daeguCourseAdapter");

describe("Daegu canonical date normalization", () => {
  test("normalizes Daegu dotted dates to ISO dates", () => {
    const adapter =
      new DaeguCourseAdapter();

    const course =
      adapter.normalize({
        lec_id: "LEARNING_DATE_TEST",
        lec_title: "날짜 정규화 테스트",
        impl_place: "대구 테스트 센터",
        impl_start_dt: "2026.08.12",
        impl_finish_dt: "2026.09.04",
        impl_reg_start: "2026.07.20",
        impl_reg_finish: "2026.08.11"
      });

    expect(course.startAt)
      .toBe("2026-08-12");

    expect(course.endAt)
      .toBe("2026-09-04");

    expect(course.registrationStartAt)
      .toBe("2026-07-20");

    expect(course.registrationEndAt)
      .toBe("2026-08-11");
  });
});
