const {
  Metrics,
  MetricUnit
} = require('@aws-lambda-powertools/metrics');

function createMetrics() {
  return new Metrics({
    namespace: 'DoIt',
    serviceName: 'do-it-backend',
    defaultDimensions: {
      environment: process.env.APP_ENV || 'local'
    }
  });
}

const metrics = createMetrics();
const aiMetrics = createMetrics();
const publicDataMetrics = createMetrics();

module.exports = {
  metrics,
  aiMetrics,
  publicDataMetrics,
  MetricUnit
};
