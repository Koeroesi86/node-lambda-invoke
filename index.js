const http = require('http');
const url = require('url');
const { resolve } = require('path');
const { fork } = require('child_process');

if (!process.env.HOST) {
  require('dotenv').config();
}

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '8080';

/**
 * @typedef RequestEvent
 * @property {String} path
 * @property {Object.<String, String>} headers
 * @property {Object.<String, String>} pathParameters
 * @property {Object} requestContext
 * @property {String} resource
 * @property {String} httpMethod
 * @property {Object.<String, String>} queryStringParameters
 * @property {Object.<String, String>} stageVariables
 */

/**
 * @typedef ResponseEvent
 * @property {Number} statusCode
 * @property {Object.<String, String>} headers
 * @property {String} body
 */

http
  .createServer((request, response) => {
    const {
      query: queryStringParameters,
      pathname: path
    } = url.parse(request.url, true);

    /** @var {RequestEvent} event */
    const event = {
      httpMethod: request.method.toUpperCase(),
      path,
      queryStringParameters
    };

    try {
      const invoke = resolve(__dirname, './invoke.js').replace(/\\/, '/');
      const lambdaToInvoke = resolve(__dirname, './testLambda.js').replace(/\\/g, '/');
      const handlerKey = 'handler';

      console.log('Invoking lambda', `${lambdaToInvoke}#${handlerKey}`);
      const lambdaInstance = fork(
        invoke,
        [
          '--lambda', lambdaToInvoke,
          '--handler', handlerKey
        ],
        {
        }
      );

      let killTimer;
      const setKillTimer = () => {
        killTimer = setTimeout(() => {
          lambdaInstance.kill('SIGINT');
        }, 15000);
      }; // setting to default AWS timeout

      lambdaInstance.send(event);

      setKillTimer();

      /** @var {ResponseEvent} responseEvent */
      lambdaInstance.on('message', responseEvent => {
        if (responseEvent.statusCode) {
          clearTimeout(killTimer);
          response.writeHead(responseEvent.statusCode, responseEvent.headers);
          if (responseEvent.body) response.write(responseEvent.body);

          lambdaInstance.kill('SIGINT');
        }
      });

      lambdaInstance.on('close', (code) => {
        if (code) {
          console.log(`child process exited with code ${code}`);
        }
        clearTimeout(killTimer);
        response.end();
      });
    } catch (e) {
      console.error(e);
      response.writeHead(500);
      response.write('Something went wrong');
      response.end();
    }
  })
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
