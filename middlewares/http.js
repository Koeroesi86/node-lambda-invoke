const uuid = require('uuid');
const url = require('url');
const rimraf = require('rimraf');
const { resolve } = require('path');
const Lambda = require('../classes/Lambda');
const RequestEvent = require('../classes/RequestEvent');
const { EVENT_STARTED } = require('../constants');
const stdoutListener = require('./stdoutListener');

const lambdaInstances = {};

/**
 * @param {string} lambdaToInvoke
 * @param {string} handlerKey
 * @param {function} logger
 * @param {string} storageDriverPath
 * @returns {Function}
 */
const createHttpMiddleware = (lambdaToInvoke, handlerKey = 'handler', logger = () => {}, storageDriverPath) => {
  // TODO: tmp folders
  if (!storageDriverPath || typeof storageDriverPath !== "string") return (req, res, next) => { next() };

  rimraf.sync(resolve(__dirname, '../requests/*'));
  rimraf.sync(resolve(__dirname, '../responses/*'));
  const StorageDriver = require(storageDriverPath);
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
    Promise.resolve()
      .then(() => new Promise(res => {
        let currentId = Object.keys(lambdaInstances).find(id => !lambdaInstances[id].busy);

        if (currentId) {
          res({ id: currentId, instance: lambdaInstances[currentId] });
        } else {
          currentId = uuid.v4();
          const currentLambdaInstance = new Lambda(lambdaToInvoke, handlerKey, logger, storageDriverPath);

          currentLambdaInstance.addEventListener('message', message => {
            if (message.type === EVENT_STARTED) {
              logger(`[${currentId}] started`);
              res({ id: currentId, instance: currentLambdaInstance });
            }
          });

          currentLambdaInstance.addEventListenerOnce('close', code => {
            if (code) logger(`[${currentId}] Lambda exited with code ${code}`);
            if (!response.finished) response.end();

            lambdaInstances[currentId] = null;
            delete lambdaInstances[currentId];
            storage.destroy();
          });

          stdoutListener(currentLambdaInstance, logger);
        }
      }))
      .then(({ id, instance }) => {
        lambdaInstances[id] = instance;
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
          }
          response.end();
        }
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
