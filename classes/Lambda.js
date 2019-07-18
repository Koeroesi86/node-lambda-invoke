const { resolve } = require('path');
const Worker = require('./Worker');
const { EVENT_STARTUP } = require('../constants');

class Lambda {
  /**
   * @param {string} path
   * @param {string} handler
   */
  constructor(path, handler) {
    this._path = path;
    this._handler = handler;
    this.createInstance();
    this.busy = false;

    const killTimer = setTimeout(() => {
      console.log('Shutting down lambda.');
        this.instance.terminate();
        this.instance = null;
    }, 15 * 60 * 1000);

    this.instance.addEventListener('close', code => {
      if (code) {
        console.log(`Lambda exited with code ${code}`);
      }
      this.instance = null;
      clearTimeout(killTimer);
    });
  }

  createInstance() {
    this.instance = new Worker(
      resolve(__dirname, '../middlewares/invoke.js'),
      {
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
