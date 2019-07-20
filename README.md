# Node Lambda invoke

A library that can be easily used for AWS lambda functions locally

## Dependencies

* [Node](https://nodejs.org/en/)
* [Yarn](https://yarnpkg.com/lang/en/) (optional)

## Usage

```bash
yarn add @koeroesi86/node-lambda-invoke
```

Or with npm
```bash
npm i --save @koeroesi86/node-lambda-invoke
```

## Example

```javascript
const http = require('http');
const { resolve } = require('path');
const { httpMiddleware } = require('@koeroesi86/node-lambda-invoke');

const host = 'localhost';
const port = 8080;

const lambdaToInvoke = resolve(__dirname, './testLambda.js').replace(/\\/g, '/');
const handlerKey = 'handler';
const storageDriver = resolve(__dirname, '../classes/Storage').replace(/\\/g, '/');

http
  .createServer(httpMiddleware(lambdaToInvoke, handlerKey, console.log, storageDriver))
  .listen(
    { host, port, exclusive: true },
    () => console.log(`Server running on http://${host}:${port}`)
  );
```


## Running locally

    yarn start

## Configuration

Coming soon, currently a basic `.env` way is available...
