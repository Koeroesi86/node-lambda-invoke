const { resolve } = require('path');
const serializer = require('./Serializer');
const Driver = require('./FileDriver');

class Storage {
  constructor(id, driver)  {
    this.id = id;
    this.driver = driver || Driver;

    this.setResponse = this.setResponse.bind(this);
    this.getResponse = this.getResponse.bind(this);
    this.setRequest = this.setRequest.bind(this);
    this.getRequest = this.getRequest.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  get requestPath() {
    return resolve(__dirname, `../requests/${this.id}`);
  }

  get responsePath() {
    return resolve(__dirname, `../responses/${this.id}`);
  }

  setResponse(response) {
    return this.driver.save(this.responsePath, serializer.serialize(response));
  }

  getResponse() {
    return this.driver.restore(this.responsePath)
      .then(data => Promise.resolve(serializer.deserialize(data)));
  }

  setRequest(request) {
    return this.driver.save(this.requestPath, serializer.serialize(request));
  }

  getRequest() {
    return this.driver.restore(this.requestPath)
      .then(data => Promise.resolve(serializer.deserialize(data)));
  }

  destroy() {
    this.driver.destroy(this.responsePath);
    this.driver.destroy(this.requestPath);
  }
}

module.exports = Storage;
