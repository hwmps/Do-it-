const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME || 'do-it-backend',
  logLevel: process.env.POWERTOOLS_LOG_LEVEL || 'INFO'
});

module.exports = { logger };
