const { resolve } = require('path');
const serializer = require('./Serializer');
const Driver = require('./FileDriver');

class Storage {
  /**
   * @param {string} id
   * @param {Driver} [driver]
   */
  constructor(id, driver)  {
    this.id = id;
    this.driver = driver || Driver;

    this.setResponse = this.setResponse.bind(this);
    this.getResponse = this.getResponse.bind(this);
    this.setRequest = this.setRequest.bind(this);
    this.getRequest = this.getRequest.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  /**
   * @returns {string}
   */
  get requestPath() {
    return resolve(__dirname, `../requests/${this.id}`);
  }

  /**
   * @returns {string}
   */
  get responsePath() {
    return resolve(__dirname, `../responses/${this.id}`);
  }

  /**
   * @param {ResponseEvent} response
   * @returns {Promise}
   */
  setResponse(response) {
    return this.driver.save(this.responsePath, serializer.serialize(response));
  }

  /**
   * @returns {Promise<ResponseEvent>}
   */
  getResponse() {
    return this.driver.restore(this.responsePath)
      .then(data => Promise.resolve(serializer.deserialize(data)));
  }

  /**
   * @param {RequestEvent} request
   * @returns {Promise}
   */
  setRequest(request) {
    return this.driver.save(this.requestPath, serializer.serialize(request));
  }

  /**
   * @returns {Promise<RequestEvent>}
   */
  getRequest() {
    return this.driver.restore(this.requestPath)
      .then(data => Promise.resolve(serializer.deserialize(data)));
  }

  /**
   * @returns {Promise}
   */
  destroy() {
    return Promise.all([
      this.driver.destroy(this.responsePath),
      this.driver.destroy(this.requestPath)
    ]);
  }
}

module.exports = Storage;
