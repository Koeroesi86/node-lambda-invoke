const minimist = require('minimist');

const {
  lambda = './testLambda.js',
  handler = 'handler'
} = minimist(process.argv.slice(2));

/**
 * @typedef ResponseEvent
 * @property {Number} statusCode
 * @property {Object} headers
 * @property {String} body
 */

process.on('message', message => {
  console.log('message from parent:', message);

  const lambdaHandler = require(lambda)[handler];
  lambdaHandler(message, {}, (error, response) => {
    if (error) {
      return process.send({
        statusCode: error.statusCode || 500,
        body: error.body || error.toString()
      });
    }

    process.send(response);
  })
});
