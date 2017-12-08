const config = require('./config');
const ipfs = config.api;

exports.tarball = function (data, cb) {
  console.log('data', data);
  cb(null, true);
};

exports.afterTarball = function (data, cb) {
  console.log('after tarball', data);
  cb(null, false);
};

exports.indexJson = function (data, cb) {
  console.log('index', data.json['name']);
    
  const json = JSON.stringify(data.json, null, 2);
  const buffer = Buffer.from(json);

  ipfs.files.add(buffer)
    .then(res => {
      console.log('IPFS add', res[0].hash);

      const from = `/ipfs/${res[0].hash}`;
      const to = `/npm-versions/${data.json['name']}`;

      return ipfs.files.cp([from, to])
    })
    .then(() => cb(null, true))
    .catch(err => {
      console.error('IPFS failed', err);

      cb(err);
    });
};
