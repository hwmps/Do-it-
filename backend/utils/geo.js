const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function validateCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError("Coordinates must be finite numbers");
  }

  if (lat < -90 || lat > 90) {
    throw new RangeError("Latitude must be between -90 and 90");
  }

  if (lng < -180 || lng > 180) {
    throw new RangeError("Longitude must be between -180 and 180");
  }
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  validateCoordinates(lat1, lng1);
  validateCoordinates(lat2, lng2);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const originLat = toRadians(lat1);
  const destinationLat = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(dLng / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * centralAngle;
}

function findNearbyCourses(
  courses,
  {
    lat,
    lng,
    radiusKm
  }
) {
  validateCoordinates(lat, lng);

  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    throw new RangeError("radiusKm must be greater than 0");
  }

  return courses
    .filter(
      (course) =>
        course.coordinatesEstimated !== true &&
        Number.isFinite(course.lat) &&
        Number.isFinite(course.lng)
    )
    .map((course) => ({
      ...course,
      distanceKm: haversineDistanceKm(
        lat,
        lng,
        course.lat,
        course.lng
      )
    }))
    .filter(
      (course) => course.distanceKm <= radiusKm
    )
    .sort(
      (a, b) => a.distanceKm - b.distanceKm
    );
}

module.exports = {
  haversineDistanceKm,
  findNearbyCourses
};
