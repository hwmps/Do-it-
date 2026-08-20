const h3 = require("h3-js");

const {
  findNearbyCourses
} = require("./geo");

class H3SpatialIndex {
  constructor({ resolution = 8 } = {}) {
    if (
      !Number.isInteger(resolution) ||
      resolution < 0 ||
      resolution > 15
    ) {
      throw new RangeError(
        "resolution must be an integer between 0 and 15"
      );
    }

    this.resolution = resolution;
    this.buckets = new Map();
    this.size = 0;
  }

  build(courses) {
    this.buckets.clear();
    this.size = 0;

    for (const course of courses) {
      if (
        course.coordinatesEstimated === true ||
        !Number.isFinite(course.lat) ||
        !Number.isFinite(course.lng)
      ) {
        continue;
      }

      const cell = h3.latLngToCell(
        course.lat,
        course.lng,
        this.resolution
      );

      if (!this.buckets.has(cell)) {
        this.buckets.set(cell, []);
      }

      this.buckets.get(cell).push(course);
      this.size += 1;
    }

    return this;
  }

  getCandidates({
    lat,
    lng,
    radiusKm
  }) {
    this.validateQuery({
      lat,
      lng,
      radiusKm
    });

    const originCell = h3.latLngToCell(
      lat,
      lng,
      this.resolution
    );

    const averageEdgeKm =
      h3.getHexagonEdgeLengthAvg(
        this.resolution,
        h3.UNITS.km
      );

    const gridRadius =
      Math.ceil(radiusKm / averageEdgeKm) + 2;

    const nearbyCells = h3.gridDisk(
      originCell,
      gridRadius
    );

    const candidates = [];

    for (const cell of nearbyCells) {
      const bucket = this.buckets.get(cell);

      if (bucket) {
        candidates.push(...bucket);
      }
    }

    return candidates;
  }

  searchNearby(query) {
    const candidates = this.getCandidates(query);

    return findNearbyCourses(
      candidates,
      query
    );
  }

  validateQuery({
    lat,
    lng,
    radiusKm
  }) {
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      throw new RangeError(
        "Latitude must be between -90 and 90"
      );
    }

    if (
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      throw new RangeError(
        "Longitude must be between -180 and 180"
      );
    }

    if (
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0
    ) {
      throw new RangeError(
        "radiusKm must be greater than 0"
      );
    }
  }
}

module.exports = {
  H3SpatialIndex
};
