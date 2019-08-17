module.exports.handler = (event, context, callback) => {
  if (event.path === '/') {
    return callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: '<h1>It works!</h1>'
    });
  }

  callback(null, {
    statusCode: 404,
    headers: {
      'Content-Type': 'text/html'
    },
    body: ''
  });
};
