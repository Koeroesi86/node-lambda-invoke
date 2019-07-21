const http = require('http');
const { resolve } = require('path');
const createHttpMiddleware = require('../middlewares/http');

if (!process.env.HOST) {
  require('dotenv').config();
}

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '8080';

const lambdaPath = resolve(__dirname, './testLambda.js').replace(/\\/g, '/');
const handlerKey = 'handler';
// const storageDriver = resolve(__dirname, '../classes/FileStorage').replace(/\\/g, '/');
const logger = (...args) => console.log(`[${new Date().toLocaleString()}]`, ...args);

http
  .createServer(
    createHttpMiddleware({
      lambdaPath,
      handlerKey,
      logger,
      // communication: {
      //   type: 'custom',
      //   path: storageDriver
      // },
      communication: {
        type: 'ipc', // file|ipc
      },
    })
  )
  .listen(
    { host, port: parseInt(port, 10), exclusive: true },
    () => console.log(`Server running on http://${host}:${port}`)
  );
