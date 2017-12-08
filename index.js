const express = require('express');
const request = require('request');
const app = express();

const GLOBAL_REGISTRY = 'https://registry.npmjs.org/';

app.use('*', (req, res, next) => {
  console.log('REQUEST');
  console.log(req.method, req.host, req.baseUrl, req.path, req.query);
  console.log(req.headers);
  if (req.body) console.log(req.body);

  delete req.headers['host'];

  console.log('\n');

  request({
    baseUrl: `${GLOBAL_REGISTRY}`,
    method: req.method,
    uri: req.path,
    headers: req.headers,
  }, (err, httpResp, body) => {
    if (err) {
      console.log('error', err);
      return;
    }

    console.log('RESPONSE');

    console.log(httpResp.headers);
    console.log('body', body);

    res.json(body);
    res.status(httpResp.statusCode);
    
    next();
  });
});

app.listen(3000);