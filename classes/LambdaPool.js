const uuid = require('uuid');
const Lambda = require('../classes/Lambda');
const stdoutListener = require('../middlewares/stdoutListener');
const { EVENT_STARTED } = require('../constants');

const lambdaInstances = {};

function getOverallCount() {
  return Object.keys(lambdaInstances).reduce((result, current) => Object.keys(lambdaInstances[current]).length + result, 0);
}

function getNonBusyId(lambdaToInvoke) {
  const timeLimit = Date.now() - 15 * 60 * 1000 + 5000; // lifespan of lambda, to give enough time to respond before killed
  return Object.keys(lambdaInstances[lambdaToInvoke] || {}).find(id => {
    const instance = lambdaInstances[lambdaToInvoke][id];
    return !instance.busy && instance.createdAt >= timeLimit;
  });
}

class LambdaPool {
  constructor({ overallLimit, logger = () => {}, communication }) {
    this.communication = communication;
    this.overallLimit = overallLimit;
    this.logger = logger;

    this.getLambda = this.getLambda.bind(this);
    this.createLambda = this.createLambda.bind(this);
  }

  createLambda(lambdaToInvoke, handlerKey) {
    return new Promise(resolve => {
      const currentId = uuid.v4();
      const currentLambdaInstance = new Lambda(lambdaToInvoke, handlerKey, this.logger, this.communication);

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
          .then(() => new Promise(r => setTimeout(r, 100)))
          .then(() => this.getLambda(lambdaToInvoke, handlerKey));
      } else if (!lambdaInstances[lambdaToInvoke] || !nonBusyId) {
        return Promise.resolve()
          .then(() => this.createLambda(lambdaToInvoke, handlerKey))
          .then(({ id, instance }) => {
            instance.createdAt = Date.now();
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
