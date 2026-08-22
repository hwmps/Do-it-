const crypto = require("crypto");

const {
  validateCanonicalCourse
} = require("../domain/canonicalCourse");

const SOURCE =
  "daegu-lifelong-learning";

function clean(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const result =
    String(value).trim();

  return result || null;
}

function normalizeDate(value) {
  const date =
    clean(value);

  if (!date) {
    return null;
  }

  const dottedDate =
    date.match(
      /^(\d{4})\.(\d{2})\.(\d{2})$/
    );

  if (dottedDate) {
    const [
      ,
      year,
      month,
      day
    ] = dottedDate;

    return `${year}-${month}-${day}`;
  }

  return date;
}

function createSourceId({
  upstreamId,
  title,
  location,
  startAt
}) {
  const identityParts =
    upstreamId
      ? [
          SOURCE,
          upstreamId
        ]
      : [
          SOURCE,
          title,
          location,
          startAt
        ];

  return crypto
    .createHash("sha256")
    .update(
      identityParts.join("|")
    )
    .digest("hex");
}

class DaeguCourseAdapter {
  normalize(raw) {
    if (
      !raw ||
      typeof raw !== "object"
    ) {
      throw new TypeError(
        "raw Daegu course is required"
      );
    }

    const upstreamId =
      clean(raw.lec_id);

    const title =
      clean(raw.lec_title);

    const location =
      clean(raw.impl_place);

    const startAt =
      normalizeDate(
        raw.impl_start_dt
      );

    const endAt =
      normalizeDate(
        raw.impl_finish_dt
      );

    const registrationStartAt =
      normalizeDate(
        raw.impl_reg_start
      );

    const registrationEndAt =
      normalizeDate(
        raw.impl_reg_finish
      );

    const sourceId =
      createSourceId({
        upstreamId,
        title,
        location,
        startAt
      });

    const course = {
      source: SOURCE,
      sourceId,
      sourceRecordId:
        upstreamId,

      countryCode: "KR",
      region: "Daegu",
      language: "ko",

      title,
      location,

      startAt,
      endAt,

      startTime:
        clean(raw.start_time),

      endTime:
        clean(raw.end_time),

      status: "unknown",

      target:
        clean(
          raw.lec_target_name
        ),

      daysOfWeek:
        clean(raw.day_week),

      institution:
        clean(raw.ins_name),

      registrationStartAt,
      registrationEndAt,

      receiptMethod:
        clean(raw.receipt),

      sourceUrl:
        clean(
          raw.lec_refer_url
        ),

      lat: null,
      lng: null,

      coordinateSource:
        "unknown"
    };

    return validateCanonicalCourse(
      course
    );
  }
}

module.exports = {
  DaeguCourseAdapter
};
