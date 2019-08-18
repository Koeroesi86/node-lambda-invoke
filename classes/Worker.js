const { dirname } = require('path');
const { spawn } = require('child_process');
const uuid = require('uuid');

const getExecutor = workerPath => {
  const res = (workerPath || '').match(/\.([a-zA-Z0-9\-]+)$/);
  switch (res[1]) {
    case 'sh':
      return 'sh';
    case 'php':
      return 'php';
    case 'js':
    default: return 'node';
  }
};

// TODO: move this to separate package
class Worker {
  /**
   * @param {string} workerPath
   * @param {Object} options
   */
  constructor(workerPath, options = {}) {
    this.workerPath = workerPath.replace(/\\/g, '/');
    this.id = uuid.v4();

    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.terminate = this.terminate.bind(this);
    this.postMessage = this.postMessage.bind(this);
    this.send = this.send.bind(this);
    this._onExecutorMessage = this._onExecutorMessage.bind(this);
    this._messageListeners = [];

    this.instance = spawn(
      getExecutor(this.workerPath),
      [
        this.workerPath
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: dirname(this.workerPath),
        ...options,
      }
    );
    this.instance.once('close', () => {
      this.instance = null;
      delete this.instance;
    });
  }

  _onExecutorMessage(chunk) {
    let message = chunk.toString().trim();
    const event = JSON.parse(message);

    this.instance.emit('message', event);
  }

  set onmessage(onmessage) {
    if (typeof onmessage === 'function') this._messageListeners.push(onmessage);
  }

  set onerror(onerror) {
    this.addEventListener('error', onerror);
  }

  get stdout() {
    return this.instance.stdout;
  }

  get stderr() {
    return this.instance.stderr;
  }

  addEventListener(event, listener) {
    if (this.instance) this.instance.on(event, listener);
  }

  addEventListenerOnce(event, listener) {
    if (this.instance) this.instance.once(event, listener);
  }

  on(event, listener) {
    this.addEventListener(event, listener);
  }

  off(event, listener) {
    this.removeEventListener(event, listener);
  }

  send(message, cb = () => {}) {
    this.postMessage(message, cb);
  }

  removeEventListener(event, listener) {
    if (this.instance) this.instance.off(event, listener);
  }

  // from EventTarget prototype, if needed
  // dispatchEvent() {
  //
  // }

  terminate() {
    if (this.instance) this.instance.kill('SIGINT');
  }

  postMessage(message, cb = () => {}) {
    this.instance.send(message, cb);
  }
}

module.exports = Worker;
