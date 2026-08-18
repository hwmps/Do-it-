import http from 'k6/http';
import { check } from 'k6';

const BASE_URL =
  __ENV.BASE_URL ||
  'https://k5235hpbt6.execute-api.ap-southeast-2.amazonaws.com';

const RATE = Number(__ENV.RATE || 5);
const DURATION = __ENV.DURATION || '1m';

export const options = {
  scenarios: {
    capacity: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },

  summaryTrendStats: [
    'avg',
    'med',
    'p(90)',
    'p(95)',
    'p(99)',
    'max',
  ],
};

export default function () {
  const response = http.get(
    `${BASE_URL}/api/v1/health`,
    {
      tags: {
        endpoint: 'health',
        target_rps: String(RATE),
      },
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'health status is ok': (r) => {
      try {
        return r.json('status') === 'ok';
      } catch (_) {
        return false;
      }
    },
  });
}
