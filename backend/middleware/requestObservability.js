const { randomUUID } = require('crypto');
const { getCurrentInvoke } = require('@codegenie/serverless-express');
const { logger } = require('../observability/logger');
const {
  metrics,
  MetricUnit
} = require('../observability/metrics');

function getInvokeSafely() {
  try {
    return getCurrentInvoke() || {};
  } catch {
    return {};
  }
}

function requestObservability(req, res, next) {
  const startedAt = process.hrtime.bigint();

  const { event, context } = getInvokeSafely();

  const gatewayRequestId =
    event?.requestContext?.requestId || null;

  const lambdaRequestId =
    context?.awsRequestId || null;

  const correlationId =
    gatewayRequestId ||
    lambdaRequestId ||
    randomUUID();

  req.observability = {
    correlationId,
    lambdaRequestId
  };

  res.setHeader('X-Request-Id', correlationId);

  logger.info('HTTP request started', {
    event: 'http.request.started',
    correlationId,
    lambdaRequestId,
    method: req.method,
    path: req.path
  });

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(elapsedNs) / 1_000_000;

    const logData = {
      event: 'http.request.completed',
      correlationId,
      lambdaRequestId,
      method: req.method,
      path: req.path,
      route: req.route?.path || null,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      authenticated: Boolean(req.user?.sub)
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request completed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP request completed', logData);
    } else {
      logger.info('HTTP request completed', logData);
    }

    metrics.addMetric(
      'RequestCount',
      MetricUnit.Count,
      1
    );

    metrics.addMetric(
      'RequestLatency',
      MetricUnit.Milliseconds,
      durationMs
    );

    metrics.addMetric(
      'ClientErrorCount',
      MetricUnit.Count,
      res.statusCode >= 400 && res.statusCode < 500 ? 1 : 0
    );

    metrics.addMetric(
      'ServerErrorCount',
      MetricUnit.Count,
      res.statusCode >= 500 ? 1 : 0
    );

    metrics.addMetadata(
      'correlationId',
      correlationId
    );

    metrics.publishStoredMetrics();
  });

  next();
}

module.exports = {
  requestObservability
};
