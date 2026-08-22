const {
  findNearbyCourses
} = require("./geo");

function isKoreanTerm(value) {
  return /^[가-힣]+$/.test(value);
}

function matchesText(
  field,
  query
) {
  if (
    typeof field !== "string" ||
    typeof query !== "string"
  ) {
    return false;
  }

  const searchTerm =
    query.trim();

  if (!searchTerm) {
    return true;
  }

  if (!isKoreanTerm(searchTerm)) {
    return field.includes(
      searchTerm
    );
  }

  let fromIndex = 0;

  while (
    fromIndex <= field.length
  ) {
    const index =
      field.indexOf(
        searchTerm,
        fromIndex
      );

    if (index === -1) {
      return false;
    }

    if (index === 0) {
      return true;
    }

    const previousCharacter =
      field[index - 1];

    if (
      !/[가-힣]/.test(
        previousCharacter
      )
    ) {
      return true;
    }

    fromIndex =
      index + 1;
  }

  return false;
}

function applyCourseSearch(
  courses,
  {
    query,
    status,
    target,
    nearbyRequested = false,
    lat,
    lng,
    radiusKm
  } = {}
) {
  let results = [
    ...courses
  ];

  if (query) {
    results =
      results.filter(
        (course) =>
          matchesText(
            course.titleKo,
            query
          ) ||
          matchesText(
            course.locationKo,
            query
          )
      );
  }

  if (
    status &&
    status !== "전체"
  ) {
    results =
      results.filter(
        (course) =>
          course.status === status
      );
  }

  if (
    target &&
    target !== "전체"
  ) {
    results =
      results.filter(
        (course) =>
          course.target === target
      );
  }

  if (nearbyRequested) {
    results =
      findNearbyCourses(
        results,
        {
          lat,
          lng,
          radiusKm
        }
      ).map(
        (course) => ({
          ...course,
          distanceKm:
            Number(
              course.distanceKm
                .toFixed(3)
            )
        })
      );
  }

  return results;
}

module.exports = {
  applyCourseSearch
};
