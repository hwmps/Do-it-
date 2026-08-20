const crypto = require("node:crypto");

const SOURCE = "busan-public-data";

function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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
  period
}) {
  const identity = [
    SOURCE,
    title,
    location,
    period
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(identity)
    .digest("hex");
}

function normalizeCourse(raw) {
  const titleKo =
    cleanString(raw.crsNm) ||
    cleanString(raw.title);

  if (!titleKo) {
    throw new Error("course title is required");
  }

  const locationKo =
    cleanString(raw.operInstNm) ||
    cleanString(raw.place);

  const period =
    cleanString(raw.crsPeriod);

  const lat =
    parseCoordinate(raw.lat, -90, 90);

  const lng =
    parseCoordinate(raw.lng, -180, 180);

  const hasTrustedCoordinates =
    lat !== null &&
    lng !== null;

  return {
    source: SOURCE,

    sourceId: createSourceId({
      title: titleKo,
      location: locationKo,
      period
    }),

    titleKo,
    titleEn: titleKo,

    locationKo,
    locationEn: locationKo,

    period,

    status:
      cleanString(raw.status) ||
      "접수중",

    target:
      cleanString(raw.trget) ||
      "성인",

    lat: hasTrustedCoordinates
      ? lat
      : null,

    lng: hasTrustedCoordinates
      ? lng
      : null,

    coordinateSource:
      hasTrustedCoordinates
        ? "upstream"
        : "unknown"
  };
}

module.exports = {
  normalizeCourse
};
