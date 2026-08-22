const {
  BusanCourseAdapter
} = require("../adapters/busanCourseAdapter");

const busanCourseAdapter =
  new BusanCourseAdapter();

function normalizeCourse(raw) {
  const course =
    busanCourseAdapter.normalize(raw);

  return {
    source: course.source,
    sourceId: course.sourceId,

    titleKo: course.title,
    titleEn: "",

    locationKo: course.location,
    locationEn: "",

    period:
      course.startAt && course.endAt
        ? `${course.startAt} ~ ${course.endAt}`
        : course.startAt ||
          course.endAt ||
          "",

    status:
      course.status === "unknown"
        ? ""
        : course.status,

    target: "전체",

    reservationGroupKo:
      course.reservationGroup,

    lat: course.lat,
    lng: course.lng,

    coordinateSource:
      course.coordinateSource
  };
}

module.exports = {
  normalizeCourse
};
