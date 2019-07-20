const { dirname } = require('path');
const { fork } = require('child_process');

// TODO: move this to separate package
class Worker {
  /**
   * @param {string} workerPath
   * @param {Object} options
   */
  constructor(workerPath, options = {}) {
    this.workerPath = workerPath.replace(/\\/, '/');
    this.instance = fork(
      this.workerPath,
      [],
      {
        // silent: true,
        // detached: true,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: dirname(this.workerPath),
        ...options,
      }
    );
    const messageListener = data => {
      console.info(data.toString().trim());
    };
    this.instance.stdout.off('data', messageListener);
    this.instance.stdout.on('data', messageListener);

    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.terminate = this.terminate.bind(this);
    this.postMessage = this.postMessage.bind(this);
  }

  set onmessage(onmessage) {
    this.addEventListener('message', onmessage);
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

  postMessage(message) {
    if (this.instance) this.instance.send(message);
  }
}

module.exports = Worker;
