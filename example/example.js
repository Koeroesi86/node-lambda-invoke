const http = require('http');
const { resolve } = require('path');
const createHttpMiddleware = require('../middlewares/http');

if (!process.env.HOST) {
  require('dotenv').config();
}

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '8080';

const lambdaToInvoke = resolve(__dirname, './testLambda.js').replace(/\\/g, '/');
const handlerKey = 'handler';
http
  .createServer(createHttpMiddleware(lambdaToInvoke, handlerKey, console.log))
  .listen(
    {
      host: host,
      port: parseInt(port, 10),
      exclusive: true
    },
    () => {
      console.log(`Server running on http://${host}:${port}`)
    }
  );
