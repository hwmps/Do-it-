const {
  haversineDistanceKm,
  findNearbyCourses
} = require("../utils/geo");

describe("haversineDistanceKm", () => {
  test("returns zero for the same coordinate", () => {
    expect(
      haversineDistanceKm(35.1795, 129.0756, 35.1795, 129.0756)
    ).toBeCloseTo(0, 6);
  });

  test("calculates a known one-degree latitude distance", () => {
    const distance = haversineDistanceKm(0, 0, 1, 0);

    expect(distance).toBeCloseTo(111.195, 2);
  });

  test("is symmetric", () => {
    const aToB =
      haversineDistanceKm(35.1795, 129.0756, 35.1631, 129.1636);

    const bToA =
      haversineDistanceKm(35.1631, 129.1636, 35.1795, 129.0756);

    expect(aToB).toBeCloseTo(bToA, 10);
  });

  test("rejects invalid latitude", () => {
    expect(() =>
      haversineDistanceKm(91, 129, 35, 129)
    ).toThrow("Latitude");
  });

  test("rejects invalid longitude", () => {
    expect(() =>
      haversineDistanceKm(35, 181, 35, 129)
    ).toThrow("Longitude");
  });
});


describe("findNearbyCourses", () => {
  const courses = [
    {
      id: 1,
      title: "near",
      lat: 35.1800,
      lng: 129.0760
    },
    {
      id: 2,
      title: "farther",
      lat: 35.2000,
      lng: 129.0900
    },
    {
      id: 3,
      title: "outside",
      lat: 35.3000,
      lng: 129.2000
    }
  ];

  test("filters courses outside the requested radius", () => {
    const results = findNearbyCourses(courses, {
      lat: 35.1795,
      lng: 129.0756,
      radiusKm: 5
    });

    expect(results.map((course) => course.id))
      .toEqual([1, 2]);

    expect(results.find((course) => course.id === 3))
      .toBeUndefined();
  });

  test("sorts nearby courses by ascending distance", () => {
    const results = findNearbyCourses(courses, {
      lat: 35.1795,
      lng: 129.0756,
      radiusKm: 20
    });

    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(2);

    expect(results[0].distanceKm)
      .toBeLessThan(results[1].distanceKm);
  });

  test("adds distanceKm without mutating the original courses", () => {
    const results = findNearbyCourses(courses, {
      lat: 35.1795,
      lng: 129.0756,
      radiusKm: 5
    });

    expect(results[0].distanceKm)
      .toEqual(expect.any(Number));

    expect(courses[0].distanceKm)
      .toBeUndefined();
  });

  test("rejects invalid radius", () => {
    expect(() =>
      findNearbyCourses(courses, {
        lat: 35.1795,
        lng: 129.0756,
        radiusKm: 0
      })
    ).toThrow("radiusKm");
  });
});
