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
  address,
  startDate
}) {
  const identity = [
    SOURCE,
    title,
    address,
    startDate
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(identity)
    .digest("hex");
}

function buildPeriod(startDate, endDate) {
  if (startDate && endDate) {
    return `${startDate} ~ ${endDate}`;
  }

  return startDate || endDate || "";
}

function normalizeCourse(raw) {
  const titleKo =
    cleanString(raw.lctreNm);

  if (!titleKo) {
    throw new Error("course title is required");
  }

  const locationKo =
    cleanString(raw.adres);

  const startDate =
    cleanString(raw.lctreBeginDttm);

  const endDate =
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
      title: titleKo,
      address: locationKo,
      startDate
    }),

    titleKo,
    titleEn: "",

    locationKo,
    locationEn: "",

    period:
      buildPeriod(
        startDate,
        endDate
      ),

    status:
      cleanString(
        raw.progrsSttusNm
      ) || "알 수 없음",

    target: "전체",

    reservationGroupKo:
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

module.exports = {
  normalizeCourse
};
