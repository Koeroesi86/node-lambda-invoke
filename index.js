const http = require('http');
const url = require('url');
const { resolve } = require('path');
const { spawn } = require('child_process');

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
      const lambdaInstance = spawn(
        `node ${invoke}`,
        [
          '--event', JSON.stringify(JSON.stringify(event)),
          '--lambda', lambdaToInvoke,
          '--handler', handlerKey
        ],
        { shell: true }
      );

      const killTimer = setTimeout(() => {
        lambdaInstance.kill('SIGINT');
      }, 15000); // setting to default AWS timeout

      lambdaInstance.stdout.on('data', (data) => {
        const logLine = data.toString();
        if (logLine.startsWith('###RESPONSE###')) {
          /** @var {ResponseEvent} response */
          const responseEvent = JSON.parse(logLine.replace(/^###RESPONSE###/, ''));
          response.writeHead(responseEvent.statusCode, responseEvent.headers);
          response.write(responseEvent.body);
        }
      });

      lambdaInstance.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      lambdaInstance.on('close', (code) => {
        if (code !== 0) {
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
