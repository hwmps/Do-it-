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

function buildPeriod(course) {
  const legacyPeriod =
    clean(course.period);

  if (legacyPeriod) {
    return legacyPeriod;
  }

  const startAt =
    clean(course.startAt);

  const endAt =
    clean(course.endAt);

  if (startAt && endAt) {
    return `${startAt} ~ ${endAt}`;
  }

  return startAt || endAt || null;
}

function presentCatalogCourse(course) {
  if (
    !course ||
    typeof course !== "object"
  ) {
    throw new TypeError(
      "course is required"
    );
  }

  const sourceId =
    clean(course.sourceId);

  if (!sourceId) {
    throw new Error(
      "course sourceId is required"
    );
  }

  const titleKo =
    clean(course.titleKo) ||
    clean(course.title);

  const locationKo =
    clean(course.locationKo) ||
    clean(course.location);

  return {
    id: sourceId,
    sourceId,

    sourceRecordId:
      clean(course.sourceRecordId),

    source:
      clean(course.source),

    countryCode:
      clean(course.countryCode),

    region:
      clean(course.region),

    language:
      clean(course.language),

    titleKo,

    titleEn:
      clean(course.titleEn),

    locationKo,

    locationEn:
      clean(course.locationEn),

    period:
      buildPeriod(course),

    startAt:
      clean(course.startAt),

    endAt:
      clean(course.endAt),

    status:
      clean(course.status) ||
      "unknown",

    target:
      clean(course.target) ||
      "전체",

    lat:
      course.lat ?? null,

    lng:
      course.lng ?? null,

    coordinateSource:
      clean(
        course.coordinateSource
      ) || "unknown"
  };
}

module.exports = {
  presentCatalogCourse
};
