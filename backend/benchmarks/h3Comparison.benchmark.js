const { performance } = require("node:perf_hooks");
const { findNearbyCourses } = require("../utils/geo");
const { H3SpatialIndex } = require("../utils/h3SpatialIndex");

const ORIGIN = { lat: 35.1795, lng: 129.0756 };
const QUERY = { ...ORIGIN, radiusKm: 5 };
const SIZES = [100_000, 500_000, 1_000_000];
const RESOLUTIONS = [7, 8, 9];
const ITERATIONS = 10;

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function generateCourses(size) {
  const random = randomGenerator(size);

  return Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    lat: ORIGIN.lat + (random() - 0.5) * 0.6,
    lng: ORIGIN.lng + (random() - 0.5) * 0.6,
    coordinatesEstimated: false
  }));
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

function measure(fn) {
  fn();
  const times = [];

  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    p50: percentile(times, 50),
    p95: percentile(times, 95)
  };
}

function ids(results) {
  return results.map(x => x.id).sort((a, b) => a - b);
}

function sameResults(a, b) {
  return JSON.stringify(ids(a)) === JSON.stringify(ids(b));
}

for (const size of SIZES) {
  console.log(`\n===== ${size.toLocaleString()} points =====`);

  const courses = generateCourses(size);
  const exact = findNearbyCourses(courses, QUERY);
  const exactTime = measure(() => findNearbyCourses(courses, QUERY));

  console.log(
    `Exact | matches=${exact.length} | avg=${exactTime.avg.toFixed(2)} ms | ` +
    `p50=${exactTime.p50.toFixed(2)} ms | p95=${exactTime.p95.toFixed(2)} ms`
  );

  for (const resolution of RESOLUTIONS) {
    const index = new H3SpatialIndex({ resolution });

    const buildStart = performance.now();
    index.build(courses);
    const buildMs = performance.now() - buildStart;

    const candidates = index.getCandidates(QUERY);
    const indexed = index.searchNearby(QUERY);

    const correct = sameResults(exact, indexed);

    if (!correct) {
      throw new Error(`Correctness mismatch at resolution ${resolution}`);
    }

    const timing = measure(() => index.searchNearby(QUERY));
    const speedup = exactTime.avg / timing.avg;
    const candidatePct = (candidates.length / size) * 100;

    console.log(
      `H3 r${resolution} | build=${buildMs.toFixed(2)} ms | ` +
      `candidates=${candidates.length} (${candidatePct.toFixed(2)}%) | ` +
      `avg=${timing.avg.toFixed(2)} ms | p50=${timing.p50.toFixed(2)} ms | ` +
      `p95=${timing.p95.toFixed(2)} ms | speedup=${speedup.toFixed(2)}x | correct=${correct}`
    );
  }

  if (global.gc) global.gc();
}
