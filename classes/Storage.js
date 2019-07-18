const { readFileSync, writeFileSync, unlinkSync, existsSync } = require('fs');
const { resolve } = require('path');
const serializer = require('./Serializer');

class Storage {
  constructor(id)  {
    this.id = id;
  }

  get requestPath() {
    return resolve(__dirname, `../requests/${this.id}`);
  }

  get responsePath() {
    return resolve(__dirname, `../responses/${this.id}`);
  }

  get request() {
    return serializer.deserialize(readFileSync(this.requestPath, 'utf8'));
  }

  set request(request) {
    writeFileSync(this.requestPath, serializer.serialize(request), 'utf8');
  }

  get response() {
    return serializer.deserialize(readFileSync(this.responsePath, 'utf8'));
  }

  set response(response) {
    writeFileSync(this.responsePath, serializer.serialize(response), 'utf8');
  }

  destroy() {
    if (existsSync(this.responsePath)) unlinkSync(this.responsePath);
    if (existsSync(this.requestPath)) unlinkSync(this.requestPath);
  }
}

module.exports = Storage;
