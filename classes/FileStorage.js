const { resolve } = require('path');
const {
  unlink,
  readFile,
  writeFile,
  existsSync,
  mkdirSync,
} = require('fs');
const rimraf = require('rimraf');

const serializer = {
  serialize: data => JSON.stringify(data),
  deserialize: data => JSON.parse(data),
};

/**
 * @type {{restore: (function(*=): Promise), save: (function(*=, *=): Promise), destroy: (function(*=): Promise)}}
 */
const Driver = {
  save: (path, data) => new Promise((res, rej) =>
    writeFile(path, data, 'utf8', err => err ? rej(err) : res())
  ),
  restore: path => new Promise((res, rej) =>
    readFile(path, 'utf8', (err, data) => err ? rej(err) : res(data))
  ),
  destroy: path => new Promise((res, rej) =>
    existsSync(path) ? unlink(path, err => err ? rej(err) : res()) : setTimeout(res, 0)
  ),
};


class FileStorage {
  /**
   * @param {string} id
   */
  constructor(id)  {
    this.id = id;

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
    return resolve(FileStorage.requestBase, `./${this.id}`);
  }

  /**
   * @returns {string}
   */
  get responsePath() {
    return resolve(FileStorage.responseBase, `./${this.id}`);
  }

  /**
   * @param {ResponseEvent} response
   * @returns {Promise}
   */
  setResponse(response) {
    return Driver.save(this.responsePath, serializer.serialize(response));
  }

  /**
   * @returns {Promise<ResponseEvent>}
   */
  getResponse() {
    return Driver.restore(this.responsePath)
      .then(data => Promise.resolve(serializer.deserialize(data)));
  }

  /**
   * @param {RequestEvent} request
   * @returns {Promise}
   */
  setRequest(request) {
    return Driver.save(this.requestPath, serializer.serialize(request));
  }

  /**
   * @returns {Promise<RequestEvent>}
   */
  getRequest() {
    return Driver.restore(this.requestPath)
      .then(data => Promise.resolve(serializer.deserialize(data)));
  }

  /**
   * @returns {Promise}
   */
  destroy() {
    return Promise.all([
      Driver.destroy(this.responsePath),
      Driver.destroy(this.requestPath)
    ]);
  }
}

FileStorage.requestBase = resolve(__dirname, `../requests/`);
FileStorage.responseBase = resolve(__dirname, `../responses/`);

FileStorage.start = () => {
  rimraf.sync(resolve(FileStorage.requestBase, './*'));
  rimraf.sync(resolve(FileStorage.responseBase, './*'));

  if (!existsSync(FileStorage.requestBase)) mkdirSync(FileStorage.requestBase, { recursive: true });
  if (!existsSync(FileStorage.responseBase)) mkdirSync(FileStorage.responseBase, { recursive: true });
};

module.exports = FileStorage;
