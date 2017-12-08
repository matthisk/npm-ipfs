const express = require('express');
const config = require('./config');
const url = require('url');
const chalk = require('chalk');

const api = config.api;
const app = express();

app.get('/', (req, res, next) => {

});

// serve up tarball
app.use((req, res, next) => {
  if (req.url.slice(-1) !== '/') {
    return next();
  }

  const hash = req.url.slice(1, -1);
  
  console.log('GET ME SOME TARBALL', chalk.green(hash));

  api.files.get(hash)
    .then(stream => {
      stream.on('data', (chunk) => {
        chunk.content.pipe(res);
      });
    });
});

// api.name.resolve(config.repository)
// .then(hash => {
//   return api.object.get(hash);
// })
// .then((res) => {
//   console.log('res', res);

//   next();
// });

// serve up metadata
app.use((req, res, next) => {  
  const packageName = req.url.slice(1);

  console.log('Fetching package', chalk.green(`"${packageName}"`));

  return api.object.get(config.repositoryHash)
    .then((res) => {
      const node = res.toJSON();
      const link = res.links.find(link => link.name === packageName);

      if (!link) {
        throw new Error('Package ' + chalk.red(packageName) + ' not found in repository');
      }

      return api.files.get(`${link.toJSON().multihash}/index.json`);
    })
    .then(stream => {
      let file = '';
      
      stream.on('data', (chunk) => {
          // write the file's path and contents to standard out
          chunk.content.on('data', content => file = file + content);
      });

      stream.on('end', () => {
        const data = JSON.parse(file)

        if (data && data.versions && typeof data.versions === 'object') {
          Object.keys(data.versions).forEach(function (versionNum) {
            const version = data.versions[versionNum]
            
            if (version.dist && version.dist.tarball && typeof version.dist.tarball === 'string') {
              const parts = url.parse(version.dist.tarball)
              version.dist.tarball = 'http://' + req.hostname + ':' + config.port + '/' + version.ipfs + '/';
            }
          })
        }

        res.json(data);
      });
    })
    .catch(err => {
      console.error(err.message);
      res.status(404);
      next();
    });
});

const server = app.listen(config.port);