const uuid = require('uuid');
const url = require('url');
const rimraf = require('rimraf');
const { resolve } = require('path');
const { writeFileSync } = require('fs');
const Lambda = require('../classes/Lambda');
const RequestEvent = require('../classes/RequestEvent');
const Storage = require('../classes/Storage');
const stdoutListener = require('./stdoutListener');

const lambdaInstances = {};

/**
 * @param {string} lambdaToInvoke
 * @param {string} handlerKey
 * @param {function} [logger]
 * @param {Storage} [storageDriver]
 * @returns {Function}
 */
const createHttpMiddleware = (lambdaToInvoke, handlerKey = 'handler', logger = () => {}, storageDriver) => {
  // TODO: tmp folders
  rimraf.sync(resolve(__dirname, '../requests/*'));
  writeFileSync(resolve(__dirname, '../requests/.gitkeep'), '', 'utf8');
  rimraf.sync(resolve(__dirname, '../responses/*'));
  writeFileSync(resolve(__dirname, '../responses/.gitkeep'), '', 'utf8');
  const storageDriverClass = storageDriver || Storage;
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
    const storage = new storageDriverClass(requestId);

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

      stdoutListener(lambdaInstance, logger);
    }

    storage.setRequest(event)
      .then(() => new Promise(res =>  lambdaInstance.invoke(requestId, res))
      .then(() => storage.getResponse()))
      /** @var {ResponseEvent} responseEvent */
      .then(responseEvent => {
        if (responseEvent.statusCode) {
          response.writeHead(responseEvent.statusCode, responseEvent.headers);
          if (responseEvent.body) response.write(responseEvent.body);
          response.end();
        }
        return storage.destroy();
      });

    lambdaInstance.addEventListenerOnce('close', () => {
      if (!response.finished) response.end();
      storage.destroy();
    });
  }
};

module.exports = createHttpMiddleware;
