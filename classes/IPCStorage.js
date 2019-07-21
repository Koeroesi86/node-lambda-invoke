const Lambda = require('./Lambda');

let storage = {};

const MESSAGES = {
  GET_RESONSE: 'GW_GET_RESONSE',
  SET_RESONSE: 'GW_SET_RESONSE',
  SET_RESONSE_FINISHED: 'GW_SET_RESONSE_FINISHED',
  GET_REQUEST: 'GW_GET_REQUEST',
  SET_REQUEST: 'GW_SET_REQUEST',
  SET_REQUEST_FINISHED: 'GW_SET_REQUEST_FINISHED',
  DESTROY: 'GW_DESTROY',
};

const getRequestKey = id => `request-${id}`;
const getResponseKey = id => `response-${id}`;

process.on('message', message => {
  if (message.type === MESSAGES.SET_REQUEST) {
    const id = getRequestKey(message.id);
    storage[id] = message.payload;
    process.send({ type: MESSAGES.SET_REQUEST_FINISHED, id: message.id });
  }

  if (message.type === MESSAGES.SET_RESONSE) {
    const id = getResponseKey(message.id);
    storage[id] = message.payload;
    process.send({ type: MESSAGES.SET_RESONSE_FINISHED, id: message.id });
  }

  // if (message.type === MESSAGES.DESTROY) {
  //   const requestId = getResponseKey(message.id);
  //   delete storage[requestId];
  //   const responseId = getResponseKey(message.id);
  //   delete storage[responseId];
  // }
});

class IPCStorage {
  /**
   * @param {string} id
   * @param {Process|Lambda} [instance]
   */
  constructor(id, instance)  {
    this.id = id;
    /** @type {Process|Lambda} */
    this.instance = instance;

    this.setResponse = this.setResponse.bind(this);
    this.getResponse = this.getResponse.bind(this);
    this.setRequest = this.setRequest.bind(this);
    this.getRequest = this.getRequest.bind(this);
    this.destroy = this.destroy.bind(this);
    this.invoker = this.invoker.bind(this);
    this.executor = this.executor.bind(this);
    this.invokerMessageListener = this.invokerMessageListener.bind(this);
    this.executorMessageListener = this.executorMessageListener.bind(this);

    if (this.instance instanceof Lambda) {
      this.invoker();
    } else {
      this.executor();
    }
  }

  invoker() {
    this.instance.addEventListener('message', this.invokerMessageListener);
  }

  invokerMessageListener(message) {
    if (message && message.type === MESSAGES.GET_REQUEST) {
      const id = getRequestKey(message.id);
      const item = storage[id];
      if (item) {
        this.instance.postMessage({ type: MESSAGES.SET_REQUEST, id: message.id, payload: item });
      }
    }

    if (message && message.type === MESSAGES.SET_RESONSE) {
      const id = getResponseKey(message.id);
      storage[id] = message.payload;
      this.instance.postMessage({ type: MESSAGES.SET_RESONSE_FINISHED, id: message.id });
    }
  }

  executor() {
    this.instance.on('message', this.executorMessageListener);
  }

  executorMessageListener(message) {
    if (message && message.type === MESSAGES.SET_REQUEST) {
      const id = getRequestKey(message.id);
      storage[id] = message.payload;
      process.send({ type: MESSAGES.SET_REQUEST_FINISHED, id: message.id });
    }

    if (message && message.type === MESSAGES.GET_RESONSE) {
      const id = getResponseKey(message.id);
      const item = storage[id];
      if (item) {
        process.send({ type: MESSAGES.SET_RESONSE, id: message.id, payload: item });
      }
    }
  }

  /**
   * @returns {string}
   */
  get requestKey() {
    return getRequestKey(this.id);
  }

  /**
   * @returns {string}
   */
  get responseKey() {
    return getResponseKey(this.id);
  }

  /**
   * @param {ResponseEvent} response
   * @returns {Promise}
   */
  setResponse(response) {
    storage[this.responseKey] = response;
    return new Promise(resolve => {
      const finishListener = message => {
        if (message && message.type === MESSAGES.SET_RESONSE_FINISHED && message.id === this.id) {
          resolve();
          this.instance.off('message', finishListener);
        }
      };
      this.instance.on('message', finishListener);
      this.instance.send({ type: MESSAGES.SET_RESONSE, id: this.id, payload: response });
    });
  }

  /**
   * @returns {Promise<ResponseEvent>}
   */
  getResponse() {
    return new Promise(resolve => {
      if (storage[this.responseKey]) return resolve(storage[this.responseKey]);
      const finishListener = message => {
        if (message && message.type === MESSAGES.SET_RESONSE && message.id === this.id) {
          storage[this.responseKey] = message.payload;
          resolve(message.payload);
          this.instance.off('message', finishListener);
        }
      };
      this.instance.on('message', finishListener);
      this.instance.send({ type: MESSAGES.GET_RESONSE, id: this.id });
    });
  }

  /**
   * @param {RequestEvent} request
   * @returns {Promise}
   */
  setRequest(request) {
    storage[this.requestKey] = request;
    return new Promise(resolve => {
      const finishListener = message => {
        if (message && message.type === MESSAGES.SET_REQUEST_FINISHED && message.id === this.id) {
          resolve();
          this.instance.off('message', finishListener);
        }
      };
      this.instance.on('message', finishListener);
      this.instance.send({ type: MESSAGES.SET_REQUEST, id: this.id, payload: request });
    });
  }

  /**
   * @returns {Promise<RequestEvent>}
   */
  getRequest() {
    return new Promise(resolve => {
      if (storage[this.requestKey]) return resolve(storage[this.requestKey]);
      const finishListener = message => {
        if (message && message.type === MESSAGES.SET_REQUEST && message.id === this.id) {
          storage[this.requestKey] = message.payload;
          resolve(message.payload);
          this.instance.off('message', finishListener);
          // this.instance.send({ type: MESSAGES.SET_REQUEST_FINISHED, id: message.id })
        }
      };
      this.instance.on('message', finishListener);
      this.instance.send({ type: MESSAGES.GET_REQUEST, id: this.id });
    });
  }

  /**
   * @returns {Promise}
   */
  destroy() {
    storage[this.requestKey] = null;
    delete storage[this.requestKey];
    storage[this.responseKey] = null;
    delete storage[this.responseKey];

    if (this.instance instanceof Lambda) {
      this.instance.removeEventListener('message', this.invokerMessageListener);
    } else {
      this.instance.off('message', this.executorMessageListener);
    }

    return Promise.resolve();
  }
}

IPCStorage.start = () => {
  storage = {};
};

module.exports = IPCStorage;
