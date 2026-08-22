function requireNonEmptyString(course, field) {
  const value = course[field];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `canonical course ${field} is required`
    );
  }
}

function validateCanonicalCourse(course) {
  if (
    !course ||
    typeof course !== "object" ||
    Array.isArray(course)
  ) {
    throw new TypeError(
      "canonical course must be an object"
    );
  }

  [
    "source",
    "sourceId",
    "countryCode",
    "language",
    "title"
  ].forEach((field) =>
    requireNonEmptyString(course, field)
  );

  const hasLat =
    course.lat !== null &&
    course.lat !== undefined;

  const hasLng =
    course.lng !== null &&
    course.lng !== undefined;

  if (hasLat !== hasLng) {
    throw new Error(
      "canonical course coordinates must include both lat and lng"
    );
  }

  if (hasLat && hasLng) {
    if (
      !Number.isFinite(course.lat) ||
      course.lat < -90 ||
      course.lat > 90 ||
      !Number.isFinite(course.lng) ||
      course.lng < -180 ||
      course.lng > 180
    ) {
      throw new Error(
        "canonical course coordinates are invalid"
      );
    }
  }

  return course;
}

module.exports = {
  validateCanonicalCourse
};
