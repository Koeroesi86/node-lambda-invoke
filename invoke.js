const minimist = require('minimist');

const {
  event: eventString,
  lambda = './testLambda.js',
  handler = 'handler'
} = minimist(process.argv.slice(2));
const event = JSON.parse(eventString);

/**
 * @typedef ResponseEvent
 * @property {Number} statusCode
 * @property {Object} headers
 * @property {String} body
 */

const invoke = () => {
  const lambdaHandler = require(lambda)[handler];
  lambdaHandler(event, {}, (error, response) => {
    if (error) {
      throw new Error(error);
    }
    console.log(`###RESPONSE###${JSON.stringify(response)}`);
  })
};

invoke();
