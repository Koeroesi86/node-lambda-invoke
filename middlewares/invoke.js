const fs = require('fs');
const net = require('net');
const { EOL } = require('os');
const ResponseEvent = require('../classes/ResponseEvent');
const {
  EVENT_STARTED,
  EVENT_REQUEST,
  EVENT_RESPONSE,
} = require('../constants');
const CommunicationRegistry = require('../registry/communication');

const {
  LAMBDA = './testLambda.js',
  HANDLER = 'handler',
  COMMUNICATION = '{}',
  EXECUTOR_PIPE = '',
  INVOKER_PIPE = '',
} = process.env;

const stream = net.connect(EXECUTOR_PIPE);
stream.setNoDelay(true);
let sending = false;
const sendMessage = (data, cb = () => {}) => {
  // gets busy sometimes...
  if (sending) {
    // console.log('busy...')
    return process.nextTick(() => {
      sendMessage(data, cb);
    });
  }
  sending = true;
  // console.log('sending', JSON.stringify(data))
  stream.write(JSON.stringify(data) + EOL, 'utf8', () => {
    cb();

    // console.log('sent', JSON.stringify(data))
    sending = false;
  });
};
process.send = sendMessage;

const lambdaHandler = require(LAMBDA)[HANDLER];
const Communication = JSON.parse(COMMUNICATION);
const Storage = require(CommunicationRegistry[Communication.type].js.path);

setTimeout(() => {
  process.exit(0);
}, 15 * 60 * 1000); // setting to default 15 minutes AWS timeout 15 * 60 * 1000

function messageListener(event) {
  if (event.type === EVENT_REQUEST) {
    const storage = new Storage(event.id, process);

    Promise.resolve()
      .then(() => storage.getRequest())
      .then(requestEvent => new Promise(resolve => {
        lambdaHandler(requestEvent, {}, (error, response = {}) => {
          const responseEvent = new ResponseEvent;

          if (error) {
            responseEvent.statusCode = 500;
            responseEvent.body = error.body || error + '';
          } else {
            Object.assign(responseEvent, response);
          }

          resolve(responseEvent);
        });
      }))
      .then(responseEvent => storage.setResponse(responseEvent))
      .then(() => process.send({ type: EVENT_RESPONSE, id: event.id }));
  }
}

process.on('message', messageListener);

const server = net.createServer(stream => {
  stream.on('data', c => {
    process.emit('message', JSON.parse(c.toString().trim()));
  });
  stream.on('end', () => {
    server.close();
  });
});

server.listen(INVOKER_PIPE, () => {
  process.send({ type: EVENT_STARTED });
});
