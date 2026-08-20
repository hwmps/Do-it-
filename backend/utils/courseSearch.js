const { findNearbyCourses } = require("./geo");

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
  let results = [...courses];

  if (query) {
    results = results.filter(
      (course) =>
        course.titleKo?.includes(query) ||
        course.locationKo?.includes(query)
    );
  }

  if (status && status !== "전체") {
    results = results.filter(
      (course) => course.status === status
    );
  }

  if (target && target !== "전체") {
    results = results.filter(
      (course) => course.target === target
    );
  }

  if (nearbyRequested) {
    results = findNearbyCourses(results, {
      lat,
      lng,
      radiusKm
    }).map((course) => ({
      ...course,
      distanceKm: Number(course.distanceKm.toFixed(3))
    }));
  }

  return results;
}

module.exports = {
  applyCourseSearch
};
