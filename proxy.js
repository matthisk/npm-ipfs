const http = require('http');
const zlib = require('zlib');
const request = require('request');
const debug = require('debug')('npmipfs:proxy');
const httpProxy = require('http-proxy');
const Orbit = require('orbit-db');
const ipfsAPI = require('ipfs-api');

const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});

const orbit = new Orbit(ipfs);
const db = orbit.kvstore('matthisk.npm.registry');

const GLOBAL_REGISTRY = 'https://registry.npmjs.org/';

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
});

proxy.on('error', (err) => {
  debug('Failed to proxy request', err);
});

function fetchTarball(name, version, url) {
  debug('Fetching tarball', name, version, url);

  request(url, (err, resp, body) => {
    if (err) return console.error('error while fetching tarball', err);
    const buffer = Buffer.from(body);
    
    ipfs.files.add(buffer)
      .then(ipfsRes => {
        debug(url, 'at hash', `http://localhost:8080/ipfs/${ipfsRes[0].hash}`);

        return db.put(name, {
          [version]: ipfsRes][0].hash
        });
      })
      .catch(err => {
        console.error('unable to put file', err);
      });
  });
}

function fetchAllTarballs(json) {
  const ps = Object.keys(json.versions).map(version => {
    const tarballUrl = json.versions[version].dist.tarball;
    const name = json.versions[version].name;

    fetchTarball(name, version, tarballUrl);
  });

  Promise.all(ps);
}

//
// Listen for the `proxyRes` event on `proxy`.
//
proxy.on('proxyRes', function (proxyRes, req, res) {
  debug('RESPONSE', req.url);
  debug(proxyRes.headers);
  debug(proxyRes.statusCode);
  debug(proxyRes.statusMessage);
  debug('');

  const gzip = zlib.createGunzip();
  const buffer = [];
  
  proxyRes.pipe(gzip);

  gzip.on('data', function(data) {
      // decompression chunk ready, add it to the buffer
      buffer.push(data.toString());
  }).on("end", function() {
      // response and decompression complete, join the buffer and return
      const json = JSON.parse(buffer.join(""));
      debug('response:');
      debug(json); 

      fetchAllTarballs(json);
  }).on("error", function(e) {
      debug('error', e);
  });
  
});

//
// Listen for the `open` event on `proxy`.
//
proxy.on('open', function (proxySocket) {
  // listen for messages coming FROM the target here
  proxySocket.on('data', hybiParseAndLogMessage);
});

//
// Listen for the `close` event on `proxy`.
//
proxy.on('close', function (res, socket, head) {
  // view disconnected websocket connections
  debug('Client disconnected');
});

const server = http.createServer((req, res) => {
  debug('REQUEST');
  debug(req.url);
  debug(req.headers);
  debug('');

  proxy.web(req, res, { target: GLOBAL_REGISTRY });
});

server.on('error', err => {
  console.error('server error', err);
});

server.listen(3000);