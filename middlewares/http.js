const uuid = require('uuid');
const url = require('url');
const rimraf = require('rimraf');
const { resolve } = require('path');
const LambdaPool = require('../classes/LambdaPool');
const RequestEvent = require('../classes/RequestEvent');

let overallLimit = 3000;

/**
 * @param {string} lambdaToInvoke
 * @param {string} handlerKey
 * @param {function} logger
 * @param {string} storageDriverPath
 * @returns {Function}
 */
const createHttpMiddleware = (lambdaToInvoke, handlerKey = 'handler', logger = () => {}, storageDriverPath, limit) => {
  // TODO: tmp folders
  if (!storageDriverPath || typeof storageDriverPath !== "string") return (req, res, next) => { next() };

  if (limit) {
    overallLimit = limit;
  }

  rimraf.sync(resolve(__dirname, '../requests/*'));
  rimraf.sync(resolve(__dirname, '../responses/*'));
  const StorageDriver = require(storageDriverPath);
  const lambdaPool = new LambdaPool({ storageDriverPath, handlerKey, logger });
  return (request, response) => {
    const {
      query: queryStringParameters,
      pathname: path
    } = url.parse(request.url, true);

    /** @var {RequestEvent} event */
    const event = new RequestEvent;
    event.httpMethod = request.method.toUpperCase();
    event.path = path;
    event.queryStringParameters = queryStringParameters;
    event.headers = request.headers;

    const requestId = uuid.v4();
    const storage = new StorageDriver(requestId);

    let lambdaInstance;

    logger('Invoking lambda', `${lambdaToInvoke}#${handlerKey}`);

    const closeListener = () => {
      if (!response.finished) response.end();
      storage.destroy();
    };
    Promise.resolve()
      .then(() => lambdaPool.getLambda(lambdaToInvoke, handlerKey))
      .then(instance => {
        instance.addEventListenerOnce('close', closeListener);

        lambdaInstance = instance;
        return Promise.resolve();
      })
      .then(() => storage.setRequest(event))
      .then(() => new Promise(res =>  lambdaInstance.invoke(requestId, res))
      .then(() => storage.getResponse()))
      /** @var {ResponseEvent} responseEvent */
      .then(responseEvent => {
        if (responseEvent.statusCode) {
          response.writeHead(responseEvent.statusCode, responseEvent.headers);
          if (responseEvent.body) {
            const bufferEncoding = responseEvent.isBase64Encoded ? 'base64' : 'utf8';
            response.end(Buffer.from(responseEvent.body, bufferEncoding));
          } else {
            response.end();
          }
        }

        lambdaInstance.removeEventListener('close', closeListener);
        return storage.destroy();
      })
      .catch(err => {
        logger(err);
        response.writeHead(500);
        response.write('Something went wrong.');
        response.end();
      });
  }
};

module.exports = createHttpMiddleware;
