const {
  H3SpatialIndex
} = require("../utils/h3SpatialIndex");

const {
  findNearbyCourses
} = require("../utils/geo");

describe("H3SpatialIndex", () => {
  const courses = [
    {
      id: 1,
      titleKo: "Origin",
      lat: 35.1795,
      lng: 129.0756
    },
    {
      id: 2,
      titleKo: "Nearby",
      lat: 35.1900,
      lng: 129.0800
    },
    {
      id: 3,
      titleKo: "Also Nearby",
      lat: 35.2000,
      lng: 129.0900
    },
    {
      id: 4,
      titleKo: "Far Away",
      lat: 35.3000,
      lng: 129.2000
    },
    {
      id: 5,
      titleKo: "Estimated Coordinate",
      lat: 35.1800,
      lng: 129.0760,
      coordinatesEstimated: true
    }
  ];

  test("builds an index only from trustworthy coordinates", () => {
    const index = new H3SpatialIndex({
      resolution: 8
    });

    index.build(courses);

    expect(index.size).toBe(4);
  });

  test("returns the same exact nearby results as Haversine search", () => {
    const index = new H3SpatialIndex({
      resolution: 8
    });

    index.build(courses);

    const query = {
      lat: 35.1795,
      lng: 129.0756,
      radiusKm: 5
    };

    const exactIds = findNearbyCourses(
      courses,
      query
    ).map((course) => course.id);

    const indexedIds = index
      .searchNearby(query)
      .map((course) => course.id);

    expect(indexedIds).toEqual(exactIds);
  });

  test("prunes candidates before exact distance calculation", () => {
    const index = new H3SpatialIndex({
      resolution: 8
    });

    index.build(courses);

    const candidates = index.getCandidates({
      lat: 35.1795,
      lng: 129.0756,
      radiusKm: 5
    });

    expect(candidates.length)
      .toBeLessThan(index.size);
  });

  test("rejects an invalid radius", () => {
    const index = new H3SpatialIndex({
      resolution: 8
    });

    index.build(courses);

    expect(() =>
      index.searchNearby({
        lat: 35.1795,
        lng: 129.0756,
        radiusKm: 0
      })
    ).toThrow("radiusKm");
  });
});
