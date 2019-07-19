const uuid = require('uuid');
const url = require('url');
const rimraf = require('rimraf');
const { resolve } = require('path');
const Lambda = require('../classes/Lambda');
const RequestEvent = require('../classes/RequestEvent');
const Storage = require('../classes/Storage');

const lambdaInstances = {};

const createHttpMiddleware = (lambdaToInvoke, handlerKey = 'handler', logger = () => {}) => {
  // TODO: tmp folders
  rimraf.sync(resolve(__dirname, '../requests/*'));
  rimraf.sync(resolve(__dirname, '../responses/*'));
  return (request, response) => {
    const {
      query: queryStringParameters,
      pathname: path
    } = url.parse(request.url, true);

    /** @var {RequestEvent} event */
    const event = new RequestEvent();
    event.httpMethod = request.method.toUpperCase();
    event.path = path;
    event.queryStringParameters = queryStringParameters;

    const requestId = uuid.v4();
    const storage = new Storage(requestId);

    let lambdaInstance;
    let currentId = Object.keys(lambdaInstances).find(id => !lambdaInstances[id].busy);

    logger('Invoking lambda', `${lambdaToInvoke}#${handlerKey}`);
    if (currentId) {
      lambdaInstance = lambdaInstances[currentId];
    } else {
      currentId = uuid.v4();
      lambdaInstance = new Lambda(lambdaToInvoke, handlerKey);
      lambdaInstances[currentId] = lambdaInstance;

      lambdaInstance.addEventListenerOnce('close', code => {
        if (code) logger(`[${currentId}] Lambda exited with code ${code}`);
        if (!response.finished) response.end();

        lambdaInstances[currentId] = null;
        delete lambdaInstances[currentId];
        storage.destroy();
      });
    }

    storage.setRequest(event)
      .then(() => new Promise(res =>  lambdaInstance.invoke(requestId, res))
      .then(() => storage.getResponse()))
      /** @var {ResponseEvent} responseEvent */
      .then(responseEvent => {
        storage.destroy();
        if (responseEvent.statusCode) {
          response.writeHead(responseEvent.statusCode, responseEvent.headers);
          if (responseEvent.body) response.write(responseEvent.body);
          response.end();
        }
      });

    lambdaInstance.addEventListenerOnce('close', () => {
      if (!response.finished) response.end();
      storage.destroy();
    });
  }
};

module.exports = createHttpMiddleware;
