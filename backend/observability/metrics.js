const {
  Metrics,
  MetricUnit
} = require('@aws-lambda-powertools/metrics');

const metrics = new Metrics({
  namespace: 'DoIt',
  serviceName: 'do-it-backend',
  defaultDimensions: {
    environment: process.env.APP_ENV || 'local'
  }
});

module.exports = {
  metrics,
  MetricUnit
};
