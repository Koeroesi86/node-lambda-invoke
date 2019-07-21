const { resolve } = require('path');
const Worker = require('./Worker');
const {
  EVENT_REQUEST,
  EVENT_RESPONSE,
} = require('../constants');

class Lambda {
  /**
   * @param {string} path
   * @param {string} handler
   * @param {function} [logger]
   * @param {string} [storagePath]
   */
  constructor(path, handler, logger = () => {}, storagePath) {
    this._path = path;
    this._handler = handler;
    this._logger = logger;
    this._storagePath = storagePath;
    this.StorageDriver = require(storagePath);
    this.createInstance();
    this.busy = false;

    const killTimer = setTimeout(() => {
      this._logger('Shutting down lambda.');
        if (this.instance) {
          this.instance.terminate();
          this.instance = null;
        }
    }, 15 * 60 * 1000);

    this.instance.addEventListener('close', code => {
      if (code) this._logger(`Lambda exited with code ${code}`);
      this.instance = null;
      clearTimeout(killTimer);
    });

    this.onFinished = this.onFinished.bind(this);
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
          STORAGE: this._storagePath,
        }
      }
    );
  }

  /**
   * @param {string} requestId
   * @param {RequestEvent} requestEvent
   * @param {function} callback
   */
  invoke(requestId, requestEvent, callback = () => {}) {
    if (!this.instance) this.createInstance();
    this._storage = new this.StorageDriver(requestId, this.instance);
    Promise.resolve()
      .then(() => this._storage.setRequest(requestEvent))
      .then(() => {
        this.busy = true;
        this._requestId = requestId;
        this._callback = callback;
        this.instance.addEventListener('message', this.onFinished);
        this.instance.postMessage({ type: EVENT_REQUEST, id: requestId });
      });
  }

  onFinished(event) {
    if (event.type === EVENT_RESPONSE && event.id === this._requestId) {
      this.busy = false;
      this._storage.getResponse().then(responseEvent => this._callback(responseEvent));
      this.instance.removeEventListener('message', this.onFinished);
    }
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

  postMessage(message, cb = () => {}) {
    this.instance.postMessage(message, cb);
  }
}

module.exports = Lambda;
