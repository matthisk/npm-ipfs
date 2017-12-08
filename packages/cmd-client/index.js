#!/usr/bin/env node
const IPFS = require('ipfs-api');
const chalk = require('chalk');
const util = require('util');
const fs = require('fs');
const path = require('path');
const tar = require('tar-stream');
const Gunzip = require('gunzip-maybe');
const crypto = require('crypto');

const readFile = util.promisify(fs.readFile);

const gunzip = Gunzip();
const ipfs = IPFS('localhost', '5001', {protocol: 'http'});

const tarball = path.join(process.cwd(), process.argv[2]);

const TOPIC_ID = "npm";

console.log('Reading tarball', chalk.green(tarball));

async function main() {
  const buffer = await readFile(tarball);

  const result = await ipfs.files.add(buffer);
  
  console.log('Uploaded tarball to hash', chalk.red(result[0].hash));

  const metadata = await metadataFromTarball(fs.createReadStream(tarball));

  const parsed = JSON.parse(metadata);

  // TODO: duplicate file stream to avoid reading from disk twice
  const hash = await shasum(fs.createReadStream(tarball));

  parsed['dist'] = {
    "shasum": hash.toString('hex'),
    "tarball": `http://localhost:8080/ipfs/${result[0].hash}`,
    "_ipfs": result[0].hash,
  };

  await ipfs.pubsub.publish(TOPIC_ID, new Buffer(JSON.stringify(parsed)));
}

function shasum(stream) {
  const hash = crypto.createHash('sha1');

  const hashed = stream.pipe(hash);
  const result = [];

  return new Promise(resolve => {
    hashed.on('data', chunks => result.push(chunks));

    hashed.on('end', () => resolve(Buffer.concat(result)));
  });
}

function metadataFromTarball(stream) {
  const extract = tar.extract();
  const result = [];

  return new Promise(resolve => {
    extract.on('entry', function(header, stream, next) {
      // header is the tar header
      // stream is the content body (might be an empty stream)
      // call next when you are done with this entry

      stream.on('end', function() {
        next() // ready for next entry
      });
    
      if (header.name === 'package/package.json') {
        stream.on('data', chunks => {
          result.push(chunks);
        });

        stream.on('end', () => {
          resolve(Buffer.concat(result));
        });
      }

      stream.resume(); // just auto drain the stream
    });
    
    extract.on('finish', function() {
      // all entries read
    });

    // This will wait until we know the readable stream is actually valid before piping
    stream.on('open', function () {
      // This just pipes the read stream to the response object (which goes to the client)
      stream.pipe(gunzip).pipe(extract);
    });

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    stream.on('error', function(err) {
      console.log('error', err);
    });
  });
}

main().catch(err => console.error(err));