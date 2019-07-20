const { resolve } = require('path');
const Worker = require('./Worker');
const { EVENT_STARTUP } = require('../constants');

class Lambda {
  /**
   * @param {string} path
   * @param {string} handler
   * @param {function} [logger]
   */
  constructor(path, handler, logger = () => {}) {
    this._path = path;
    this._handler = handler;
    this._logger = logger;
    this.createInstance();
    this.busy = false;

    const killTimer = setTimeout(() => {
      this._logger('Shutting down lambda.');
        this.instance.terminate();
        this.instance = null;
    }, 15 * 60 * 1000);

    this.instance.addEventListener('close', code => {
      if (code) this._logger(`Lambda exited with code ${code}`);
      this.instance = null;
      clearTimeout(killTimer);
    });
  }

  get stdout() {
    return this.instance.stdout;
  }

  get stderr() {
    return this.instance.stderr;
  }

  createInstance() {
    this.instance = new Worker(
      resolve(__dirname, '../middlewares/invoke.js'),
      {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: {
          LAMBDA: this._path,
          HANDLER: this._handler,
        }
      }
    );
    this.instance.postMessage(EVENT_STARTUP);
  }

  /**
   * @param {string} requestId
   * @param {function} callback
   */
  invoke(requestId, callback = () => {}) {
    if (!this.instance) this.createInstance();
    this.instance.addEventListenerOnce('message', reqId => {
      if (reqId === requestId) {
        callback(reqId);
        this.busy = false;
      }
    });
    this.instance.postMessage(requestId);
  }

  /**
   * @param {string} event
   * @param {function} listener
   */
  addEventListener(event, listener) {
    this.instance.addEventListener(event, listener);
  }

  /**
   * @param {string} event
   * @param {function} listener
   */
  addEventListenerOnce(event, listener) {
    this.instance.addEventListenerOnce(event, listener);
  }

  /**
   * @param {string} event
   * @param {function} listener
   */
  removeEventListener(event, listener) {
    this.instance.removeEventListener(event, listener);
  }
}

module.exports = Lambda;
