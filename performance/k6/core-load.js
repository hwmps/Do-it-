import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL =
  __ENV.BASE_URL ||
  'https://k5235hpbt6.execute-api.ap-southeast-2.amazonaws.com';

export const options = {
  stages: [
    { duration: '20s', target: 1 },
    { duration: '30s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const response = http.get(
    `${BASE_URL}/api/v1/health`,
    {
      tags: {
        endpoint: 'health',
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

  sleep(1);
}
