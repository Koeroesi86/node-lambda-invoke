const moment = require('moment');

const getDate = exports = () =>  moment().format('YYYY-MM-DD HH:mm:ss.SS');

/**
 *
 * @param {Lambda} lambdaInstance
 * @param {function} [logger]
 */
module.exports = (lambdaInstance, logger = () => {}) => {
  const messageListener = data => {
    logger(`[${getDate()}] ${data.toString().trim()}`);
  };
  lambdaInstance.stdout.off('data', messageListener);
  lambdaInstance.stdout.on('data', messageListener);
  lambdaInstance.stderr.off('data', messageListener);
  lambdaInstance.stderr.on('data', messageListener);

  const closeListener = code => {
    if (code) logger(`[${getDate()}] child process exited with code ${code}`);
  };
  lambdaInstance.addEventListenerOnce('close', closeListener);
};
