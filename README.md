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
const { httpMiddleware } = require('@koeroesi86/node-lambda-invoke');

const host = 'localhost';
const port = 8080;

const lambdaToInvoke = './pathOfLambda.js';
const handlerKey = 'handler';
const storageDriver = './pathOfStorage.js';

http
  .createServer(httpMiddleware(lambdaToInvoke, handlerKey, console.log, storageDriver))
  .listen(
    { host, port, exclusive: true },
    () => console.log(`Server running on http://${host}:${port}`)
  );
```


## Running locally

```bash
yarn start
```

## Configuration

Coming soon, currently a basic `.env` way is available...
