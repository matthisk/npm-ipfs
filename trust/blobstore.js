const ipfsBlobStore = require('ipfs-blob-store')
const debug = require('debug')('npm-ipfs:blobstore');

const options = {
  port: 5001,   // default value
  host: '127.0.0.1', // default value
  baseDir: '/', // default value
  flush: true  // default value
};

const store = ipfsBlobStore(options);

const isTarball = /[^.]+.tgz$/;
const isJson = /[^.]+.json$/;
const isIndex = /^[^\/]+\/index.json$/;

function transformKey(key) {
  if (isTarball.test(key)) {
    return `/npm-data${key}`;
  }

  if (isIndex.test(key)) {
    debug('Version index found', key);
    return `/npm-versions/${key.slice(0, -11)}`;
  }

  if (isJson.test(key)) {
    return `/npm-metadata/${key}`;
  }

  console.error('Unknown file extension', key);
  
  return key;
}

module.exports = {

  createWriteStream: function(opts, cb) {
    const key = transformKey(opts);
    
    debug('write', key);
    return store.createWriteStream(key, cb);
  },

  createReadStream: function(opts) {
    const key = transformKey(opts);

    debug('read', key);
    return store.createReadStream(key);
  },

  exists: function(opts, cb) {
    const key = transformKey(opts);

    debug('exists', key);
    return store.exists(key, cb);
  },

  remove: function(opts, cb) {
    const key = transformKey(opts);

    debug('remove', key);
    return store.remove(key, cb);
  },

};