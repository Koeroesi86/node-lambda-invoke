const ResponseEvent = require('../classes/ResponseEvent');
const { EVENT_STARTUP, EVENT_STARTED } = require('../constants');

const {
  LAMBDA = './testLambda.js',
  HANDLER = 'handler'
} = process.env;

const lambdaHandler = require(LAMBDA)[HANDLER];

let storagePath;

setTimeout(() => {
  process.exit(0);
}, 15 * 60 * 1000); // setting to default 15 minutes AWS timeout 15 * 60 * 1000

process.on('message', requestId => {
  if (requestId && requestId.type === EVENT_STARTUP) {
    if (requestId.storagePath) {
      storagePath = requestId.storagePath;
    }

    process.send({ type: EVENT_STARTED });
    return;
  }

  const Storage = require(storagePath);
  const storage = new Storage(requestId);

  Promise.resolve()
    .then(() => storage.getRequest())
    .then(message => new Promise(resolve => {
      lambdaHandler(message, {}, (error, response = {}) => {
        const responseEvent = new ResponseEvent;

        if (error) {
          responseEvent.statusCode = 500;
          responseEvent.body = error.body || error + '';
        } else {
          Object.assign(responseEvent, response);
        }

        resolve(responseEvent);
      });
    }))
    .then(responseEvent => storage.setResponse(responseEvent))
    .then(() => process.send(requestId));
});
