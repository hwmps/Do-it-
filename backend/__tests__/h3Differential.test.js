const {
  findNearbyCourses
} = require("../utils/geo");

const {
  H3SpatialIndex
} = require("../utils/h3SpatialIndex");

function createSeededRandom(seed = 2026) {
  let state = seed >>> 0;

  return () => {
    state =
      (1664525 * state + 1013904223) >>> 0;

    return state / 2 ** 32;
  };
}

function generateCourses(size) {
  const random = createSeededRandom(42);

  return Array.from(
    { length: size },
    (_, index) => ({
      id: index + 1,
      lat: 35.1795 + (random() - 0.5) * 1.0,
      lng: 129.0756 + (random() - 0.5) * 1.0,
      coordinatesEstimated: false
    })
  );
}

function sortedIds(results) {
  return results
    .map((course) => course.id)
    .sort((a, b) => a - b);
}

describe("H3 differential correctness", () => {
  test("matches exact Haversine results across randomized queries", () => {
    const courses = generateCourses(10000);

    const index = new H3SpatialIndex({
      resolution: 9
    });

    index.build(courses);

    const random = createSeededRandom(99);
    const radii = [1, 2, 5, 10, 20];

    for (let queryIndex = 0; queryIndex < 30; queryIndex += 1) {
      const lat =
        35.1795 + (random() - 0.5) * 0.6;

      const lng =
        129.0756 + (random() - 0.5) * 0.6;

      for (const radiusKm of radii) {
        const query = {
          lat,
          lng,
          radiusKm
        };

        const exact =
          findNearbyCourses(
            courses,
            query
          );

        const indexed =
          index.searchNearby(query);

        expect(sortedIds(indexed))
          .toEqual(sortedIds(exact));
      }
    }
  });
});
