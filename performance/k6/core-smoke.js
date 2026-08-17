import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL =
  __ENV.BASE_URL ||
  'https://k5235hpbt6.execute-api.ap-southeast-2.amazonaws.com';

export const options = {
  vus: 1,
  iterations: 5,

  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const response = http.get(
    `${BASE_URL}/api/v1/locations/search`,
    {
      tags: {
        endpoint: 'locations-search',
      },
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response is JSON': (r) =>
      (r.headers['Content-Type'] || '').includes('application/json'),
  });

  sleep(1);
}
