const crypto = require("node:crypto");

const {
  validateCanonicalCourse
} = require("../domain/canonicalCourse");

const SOURCE =
  "daegu-lifelong-learning";

function cleanString(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createSourceId({
  upstreamId,
  title,
  location,
  startAt
}) {
  const identity = upstreamId
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
    .update(identity.join("|"))
    .digest("hex");
}

class DaeguCourseAdapter {
  normalize(raw) {
    const title =
      cleanString(raw.lec_title);

    if (!title) {
      throw new Error(
        "course title is required"
      );
    }

    const location =
      cleanString(raw.impl_place);

    const startAt =
      cleanString(raw.impl_start_dt);

    const upstreamId =
      cleanString(raw.lec_id);

    return validateCanonicalCourse({
      source: SOURCE,

      sourceId: createSourceId({
        upstreamId,
        title,
        location,
        startAt
      }),

      sourceRecordId:
        upstreamId,

      countryCode: "KR",
      region: "Daegu",
      language: "ko",

      title,
      location,

      startAt,

      endAt:
        cleanString(
          raw.impl_finish_dt
        ),

      startTime:
        cleanString(
          raw.start_time
        ),

      endTime:
        cleanString(
          raw.end_time
        ),

      status: "unknown",

      target:
        cleanString(
          raw.lec_target_name
        ),

      daysOfWeek:
        cleanString(
          raw.day_week
        ),

      institution:
        cleanString(
          raw.ins_name
        ),

      registrationStartAt:
        cleanString(
          raw.impl_reg_start
        ),

      registrationEndAt:
        cleanString(
          raw.impl_reg_finish
        ),

      receiptMethod:
        cleanString(
          raw.receipt
        ),

      sourceUrl:
        cleanString(
          raw.lec_refer_url
        ),

      lat: null,
      lng: null,

      coordinateSource:
        "unknown"
    });
  }
}

module.exports = {
  DaeguCourseAdapter
};
