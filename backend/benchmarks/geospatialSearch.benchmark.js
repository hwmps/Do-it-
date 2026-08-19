const { performance } = require("node:perf_hooks");
const { findNearbyCourses } = require("../utils/geo");

const ORIGIN = {
  lat: 35.1795,
  lng: 129.0756
};

const RADIUS_KM = 5;
const DATASET_SIZES = [1_000, 10_000, 100_000, 500_000, 1_000_000];
const ITERATIONS = 10;

function createSeededRandom(seed = 42) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function generateCourses(size) {
  const random = createSeededRandom(size);

  return Array.from({ length: size }, (_, index) => ({
    id: index + 1,
    titleKo: `Course ${index + 1}`,
    locationKo: "Busan",
    lat: ORIGIN.lat + (random() - 0.5) * 0.6,
    lng: ORIGIN.lng + (random() - 0.5) * 0.6,
    coordinatesEstimated: false
  }));
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1
  );

  return sorted[index];
}

function benchmark(size) {
  const courses = generateCourses(size);

  findNearbyCourses(courses, {
    ...ORIGIN,
    radiusKm: RADIUS_KM
  });

  const durations = [];
  let resultCount = 0;

  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = performance.now();

    const results = findNearbyCourses(courses, {
      ...ORIGIN,
      radiusKm: RADIUS_KM
    });

    durations.push(performance.now() - start);
    resultCount = results.length;
  }

  const average =
    durations.reduce((sum, value) => sum + value, 0) /
    durations.length;

  return {
    size,
    resultCount,
    averageMs: average,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95)
  };
}

console.log("Exact Haversine Nearby Search Benchmark");
console.log(`radiusKm=${RADIUS_KM}, iterations=${ITERATIONS}`);
console.log("");

for (const size of DATASET_SIZES) {
  const result = benchmark(size);

  console.log(
    `${result.size.toLocaleString().padStart(7)} points | ` +
    `matches=${String(result.resultCount).padStart(5)} | ` +
    `avg=${result.averageMs.toFixed(2)} ms | ` +
    `p50=${result.p50Ms.toFixed(2)} ms | ` +
    `p95=${result.p95Ms.toFixed(2)} ms`
  );
}
