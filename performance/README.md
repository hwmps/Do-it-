# Performance Engineering

This directory contains reproducible load-testing scenarios and production performance baselines for the Do-it backend.

## Environment

- API: AWS API Gateway HTTP API
- Compute: AWS Lambda
- Production region: `ap-southeast-2` (Sydney)
- Load generator: k6 running locally from South Korea
- Endpoint: `GET /api/v1/health`
- Test type: staged concurrency baseline
- Maximum virtual users: 20

The health endpoint intentionally exercises the production request path, including API Gateway, Lambda, Express middleware, structured logging, and metrics instrumentation, while avoiding external service dependencies.

## Load Scenario

`k6/core-load.js` gradually increases concurrency:

- 1 VU
- 5 VUs
- 10 VUs
- 20 VUs
- ramp down to 5 VUs
- ramp down to 0

This is a concurrency baseline, not a maximum-throughput benchmark. Each virtual user sleeps between requests, so the observed request rate should not be interpreted as system capacity.

## Baseline Results

### Run 1

| Metric | Result |
|---|---:|
| Requests | 866 |
| Maximum VUs | 20 |
| Successful checks | 100% |
| HTTP failure rate | 0% |
| Median latency | 171.7 ms |
| p95 latency | 308.7 ms |
| Max latency | 1.08 s |
| Lambda errors | 0 |
| Lambda throttles | 0 |

### Run 2

| Metric | Result |
|---|---:|
| Requests | 839 |
| Maximum VUs | 20 |
| Successful checks | 100% |
| HTTP failure rate | 0% |
| Median latency | 183.26 ms |
| p90 latency | 273.88 ms |
| p95 latency | 396.31 ms |
| p99 latency | 1.50 s |
| Max latency | 2.29 s |

## Layer-by-Layer Latency Analysis

For Run 2, the 839 k6 requests were matched exactly with 839 API Gateway access-log records.

| Percentile | k6 client | API Gateway | Integration |
|---|---:|---:|---:|
| p50 | 183 ms | 14 ms | 12 ms |
| p95 | 396 ms | 33 ms | 31 ms |
| p99 | 1,500 ms | 202 ms | 200 ms |
| max | 2,290 ms | 403 ms | 401 ms |

API Gateway latency and integration latency remained very close:

- p50 difference: ~2 ms
- p95 difference: ~2 ms
- p99 difference: ~2 ms
- max difference: ~2 ms

This indicates that API Gateway processing overhead was small relative to integration latency during the test.

The large difference between client-observed latency and AWS-side latency suggests that a substantial portion of end-to-end latency occurred outside the application execution path, such as network routing and connection overhead between the load generator in South Korea and the production region in Sydney.

Percentiles from separate systems should not be subtracted as if they represent the same individual request, so this comparison is used to identify latency patterns rather than calculate exact network latency.

## Reliability

Across both baseline runs:

- 1,705 k6 requests completed
- 0 HTTP failures
- 100% application checks passed
- 0 Lambda errors observed
- 0 Lambda throttles observed

## Next Experiments

The baseline intentionally measures concurrency rather than maximum throughput.

Next experiments will use controlled request-rate scenarios to:

1. measure capacity at explicit RPS levels;
2. identify the point where latency begins to degrade;
3. observe Lambda concurrency, errors, and throttling under increasing load;
4. compare Lambda memory configurations and their latency/cost trade-offs;
5. separately benchmark endpoints that depend on external APIs.

## Capacity Experiment

A constant-arrival-rate scenario was used to separate request rate from response time and identify infrastructure capacity limits.

| Target rate | Requests | HTTP failures | Result |
|---|---:|---:|---|
| 5 RPS | 301 | 0 | Passed |
| 10 RPS | 601 | 0 | Passed |
| 20 RPS | 1,201 | 3 | Lambda throttling observed |

At 20 RPS, API Gateway returned three HTTP 503 responses.

CloudWatch access logs identified the integration error as:

`The Lambda function is being throttled. Try again later.`

The Lambda function had no function-level reserved concurrency configured. The AWS account's regional Lambda concurrency quota was 10, and CloudWatch recorded `ConcurrentExecutions = 10` during the exact minute in which the throttled requests occurred.

This establishes the observed failure mode as an infrastructure quota bottleneck rather than an application-level failure.

### Capacity finding

The experiment therefore does **not** establish 20 RPS as the backend's intrinsic capacity.

Instead, the controlled load test identified the AWS account's regional Lambda concurrency quota as the first limiting factor:

`load increase -> concurrency reaches 10 -> account quota reached -> Lambda throttling -> API Gateway 503`

No quota increase was performed after the experiment because the production environment is intentionally being operated under a zero-cost constraint.
