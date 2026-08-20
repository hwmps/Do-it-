const crypto = require("node:crypto");

const SOURCE = "busan-public-data";

function cleanString(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseCoordinate(value, min, max) {
  const parsed = Number.parseFloat(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    return null;
  }

  return parsed;
}

function createSourceId({
  title,
  location,
  startAt
}) {
  const identity = [
    SOURCE,
    title,
    location,
    startAt
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(identity)
    .digest("hex");
}

class BusanCourseAdapter {
  normalize(raw) {
    const title =
      cleanString(raw.lctreNm);

    if (!title) {
      throw new Error(
        "course title is required"
      );
    }

    const location =
      cleanString(raw.adres);

    const startAt =
      cleanString(raw.lctreBeginDttm);

    const endAt =
      cleanString(raw.lctreEndDttm);

    const parsedLat =
      parseCoordinate(
        raw.adresLa,
        -90,
        90
      );

    const parsedLng =
      parseCoordinate(
        raw.adresLo,
        -180,
        180
      );

    const hasTrustedCoordinates =
      parsedLat !== null &&
      parsedLng !== null;

    return {
      source: SOURCE,

      sourceId: createSourceId({
        title,
        location,
        startAt
      }),

      countryCode: "KR",
      region: "Busan",
      language: "ko",

      title,
      location,

      startAt,
      endAt,

      status:
        cleanString(
          raw.progrsSttusNm
        ) || "unknown",

      reservationGroup:
        cleanString(
          raw.resveGroupNm
        ),

      lat: hasTrustedCoordinates
        ? parsedLat
        : null,

      lng: hasTrustedCoordinates
        ? parsedLng
        : null,

      coordinateSource:
        hasTrustedCoordinates
          ? "upstream"
          : "unknown"
    };
  }
}

module.exports = {
  BusanCourseAdapter
};
