const Orbit = require('orbit-db');
const ipfsAPI = require('ipfs-api');

const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});

const orbit = new Orbit(ipfs);
const db = orbit.kvstore('matthisk.npm.registry');

db.events.on('ready', () => {
  const result = db.get('dude:0.1.0')
  console.log(result);
});
db.load();