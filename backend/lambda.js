const serverlessExpress = require('@codegenie/serverless-express');
const app = require('./server');

exports.handler = serverlessExpress({ app });