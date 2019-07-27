const uuid = require('uuid');
const url = require('url');
const LambdaPool = require('../classes/LambdaPool');
const RequestEvent = require('../classes/RequestEvent');
const CommunicationRegistry = require('../registry/communication');

let overallLimit = 3000;

/**
 * @typedef Communication
 * @property {string} type
 * @property {string} [path]
 */

/**
 * @typedef Options
 * @property {string} lambdaPath
 * @property {string} handlerKey
 * @property {function} [logger]
 * @property {number} [limit]
 * @property {Communication} [communication]
 */

/**
 * @param {Options} options
 * @returns {Function}
 */
function createHttpMiddleware(options) {
  const {
    lambdaPath,
    handlerKey = 'handler',
    logger = () => {},
    limit = overallLimit,
    communication = {},
  } = options;
  const currentCommunication = {
    ...(!communication.type ? { type: 'ipc' } : communication),
  };
  const communicationConfig = {
    ...(CommunicationRegistry[currentCommunication.type] && CommunicationRegistry[currentCommunication.type].js),
    ...(!CommunicationRegistry[currentCommunication.type] && currentCommunication),
  };
  // TODO: tmp folders
  if (!communicationConfig.path || typeof communicationConfig.path !== "string") return (req, res, next) => { next() };

  if (limit) {
    overallLimit = limit;
  }

  const StorageDriver = require(communicationConfig.path);
  if (StorageDriver.start) StorageDriver.start();
  const lambdaPool = new LambdaPool({ logger, communication: currentCommunication });
  return (request, response) => {
    const {
      query: queryStringParameters,
      pathname: path
    } = url.parse(request.url, true);

    /** @var {RequestEvent} event */
    const requestEvent = new RequestEvent;
    requestEvent.httpMethod = request.method.toUpperCase();
    requestEvent.path = path;
    requestEvent.queryStringParameters = queryStringParameters;
    requestEvent.headers = request.headers;

    const requestId = uuid.v4();
    let storage;

    let lambdaInstance;

    logger('Invoking lambda', `${lambdaPath}#${handlerKey}`);

    const closeListener = () => {
      if (!response.finished) response.end();
      if (storage) storage.destroy();
    };
    Promise.resolve()
      .then(() => lambdaPool.getLambda(lambdaPath, handlerKey))
      .then(instance => {
        instance.addEventListenerOnce('close', closeListener);

        lambdaInstance = instance;
        storage = new StorageDriver(requestId, instance);
        return Promise.resolve(instance);
      })
      .then(() => new Promise(res => lambdaInstance.invoke(requestId, requestEvent, res)))
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
        return storage ? storage.destroy() : Promise.resolve();
      })
      .catch(err => {
        logger(err);
        response.writeHead(500);
        response.write('Something went wrong.');
        response.end();
      });
  }
}

module.exports = createHttpMiddleware;
