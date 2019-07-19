const {
  unlink,
  readFile,
  writeFile,
} = require('fs');

module.exports = {
  save: (path, data) => new Promise((res, rej) =>
    writeFile(path, data, 'utf8', err => err ? rej(err) : res())
  ),
  restore: path => new Promise((res, rej) =>
    readFile(path, 'utf8', (err, data) => err ? rej(err) : res(data))
  ),
  destroy: path => new Promise((res, rej) =>
    unlink(path, err => err ? rej(err) : res())
  ),
};
