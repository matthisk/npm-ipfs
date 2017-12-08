const ipfsAPI = require('ipfs-api');

const api = ipfsAPI('localhost', '5001', {protocol: 'http'});

module.exports = {
  api,
  ipfs: {
    host: '127.0.0.1',
    port: 5001,
  },
  port: 3000,
  repository: '/ipns/QmPoPjztJWxNydrJp6fvuX6r4YCZNhH7dgjNUqQaw3ZbwM',
  repositoryHash: 'QmUc5vYX5RmJ2aq7UBB97aSyAAcB34x9BcMpMPsUwUi7kt',
};