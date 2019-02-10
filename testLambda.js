module.exports.handler = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: '<h1>It works!</h1>'
  })
};
