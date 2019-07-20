const uuid = require('uuid');
const Lambda = require('../classes/Lambda');
const stdoutListener = require('../middlewares/stdoutListener');
const { EVENT_STARTED } = require('../constants');

let lambdaInstances = {};

function getOverallCount() {
  return Object.keys(lambdaInstances).reduce((result, current) => Object.keys(lambdaInstances[current]).length + result, 0);
}

function getNonBusyId(lambdaToInvoke) {
  return Object.keys(lambdaInstances[lambdaToInvoke] || {}).find(id => !lambdaInstances[lambdaToInvoke][id].busy);
}

class LambdaPool {
  constructor({ storageDriverPath, overallLimit, logger = () => {} }) {
    this.storageDriver = storageDriverPath;
    this.overallLimit = overallLimit;
    this.logger = logger;

    this.getLambda = this.getLambda.bind(this);
    this.createLambda = this.createLambda.bind(this);
  }

  createLambda(lambdaToInvoke, handlerKey) {
    return new Promise(resolve => {
      const currentId = uuid.v4();
      const currentLambdaInstance = new Lambda(lambdaToInvoke, handlerKey, this.logger, this.storageDriver);

      const lambdaStartListener = message => {
        if (message.type === EVENT_STARTED) {
          this.logger(`[${currentId}] started`);
          currentLambdaInstance.removeEventListener('message', lambdaStartListener);
          resolve({ id: currentId, instance: currentLambdaInstance });
        }
      };
      currentLambdaInstance.addEventListener('message', lambdaStartListener);

      currentLambdaInstance.addEventListenerOnce('close', code => {
        if (code) this.logger(`[${currentId}] Lambda exited with code ${code}`);
      });

      stdoutListener(currentLambdaInstance, this.logger);
    });
  }

  getLambda(lambdaToInvoke, handlerKey) {
      const nonBusyId = getNonBusyId(lambdaToInvoke);
      if (getOverallCount() >= this.overallLimit) {
        return Promise.resolve()
          .then(() => new Promise(r => setTimeout(r, 2000)))
          .then(() => this.getLambda(lambdaToInvoke, handlerKey));
      } else if (!lambdaInstances[lambdaToInvoke] || !nonBusyId) {
        return Promise.resolve()
          .then(() => this.createLambda(lambdaToInvoke, handlerKey))
          .then(({ id, instance }) => {
            lambdaInstances[lambdaToInvoke] = {
              ...(lambdaInstances[lambdaToInvoke] && lambdaInstances[lambdaToInvoke]),
              [id]: instance,
            };

            return Promise.resolve(instance);
          });
      } else if(nonBusyId) {
        return Promise.resolve(lambdaInstances[lambdaToInvoke][nonBusyId]);
      }

      return Promise.reject();
  }
}

module.exports = LambdaPool;
