const fs = require('fs');
const { dirname, resolve } = require('path');
const { fork, spawn } = require('child_process');
// const uuid = require('uuid');
// const rimraf = require('rimraf');

const getExecutor = workerPath => {
  const res = (workerPath || '').match(/\.(.+)$/);
  switch (res[1]) {
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
    this.pipePrefix = resolve(__dirname, `../pipes/test`).replace(/\\/g, '/');
    this.invokerPipePath = `${this.pipePrefix}-invoker`;
    this.executorPipePath = `${this.pipePrefix}-executor`;

    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.terminate = this.terminate.bind(this);
    this.postMessage = this.postMessage.bind(this);
    this.send = this.send.bind(this);
    this._onExecutorMessage = this._onExecutorMessage.bind(this);

    console.log('this.invokerPipePath', this.invokerPipePath)

    // change to named pipe!
    fs.writeFileSync(this.invokerPipePath, '\n', 'utf8');
    fs.writeFileSync(this.executorPipePath, '\n', 'utf8');

    this.instance = spawn(
      getExecutor(this.workerPath),
      [
        this.workerPath
      ],
      {
        // silent: true,
        // detached: true,
        // stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: dirname(this.workerPath),
        ...options,
        env: {
          ...options.env,
          EXECUTOR_PIPE: this.executorPipePath
        }
      }
    );
    const messageListener = data => {
      console.info(data.toString().trim());
    };
    this.instance.stdout.off('data', messageListener);
    this.instance.stdout.on('data', messageListener);
    this.instance.once('close', () => {
      this.instance = null;
      delete this.instance;
    });

    // this.executorPipe = fs.createWriteStream(this.executorPipePath, { flags: 'w', autoClose: false });
    // this.readableStream = fs.createReadStream(this.executorPipePath, { encoding: 'utf8', autoClose: false });
    // this.readableStream.on('data', this._onExecutorMessage);
    // until fifo added
    fs.watchFile(this.executorPipePath, { interval: 1 },e => {
      this._onExecutorMessage(fs.readFileSync(this.executorPipePath, 'utf8'))
    });
  }

  _onExecutorMessage(chunk) {
    console.log('>>>DATA', chunk.toString().trim())
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
    if (this.instance) this.instance.send(message, cb);
  }
}

module.exports = Worker;
