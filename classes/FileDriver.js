const {
  unlink,
  readFile,
  writeFile,
  existsSync,
} = require('fs');

/**
 * Example driver for Storage
 * @type {{restore: (function(*=): Promise), save: (function(*=, *=): Promise), destroy: (function(*=): Promise)}}
 */
module.exports = {
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
