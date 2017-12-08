const ipfsAPI = require('ipfs-api');
const fs = require('fs');
const chalk = require('chalk');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'}); // leaving out the arguments will default to these values

const topic = 'npm';

const metadataTemplate = JSON.parse(fs.readFileSync('./template.json'));

async function receiveMsg(msg) {
    console.log('Received message on pubsub channel', chalk.green(msg.from), chalk.red(msg.data.length));

    var json = undefined;
    try {
        json = JSON.parse(msg.data.toString());
    } catch (error){
        console.error("JSON parse error:", msg.data.toString());
        return
    }

    const template = await getMetadataTemplate(json);
    const content = toMetadata(template, json)
    const result = await addFile(content);
    
    console.log('Saved metadata to /npm-versions at hash', chalk.green(result.hash));

    try {
        await ipfs.files.get(json.dist['_ipfs']);
    } catch (error) {
        console.error('Failed to fetch tarball from maintainer with error', error);
        // TODO: enqueue and try again
    }

    const dirMeta = await ipfs.files.stat('/npm-versions');

    console.log('Now publishing to IPFS', chalk.yellow('please be patient'));
    
    const res = await ipfs.name.publish(dirMeta.Hash);
    
    console.log('Republished metadata under ipns', chalk.yellow(res.Name));
}

async function getMetadataTemplate(metadata) {
    const p = `/npm-versions/${metadata.name}`;

    let result;
    try {
        result = await ipfs.files.stat(p);
    } catch (err) {
        console.warn('failed file stat', err);
        return Object.assign({}, metadataTemplate);
    }

    const re = await ipfs.files.read(p);
    const bufs = [];

    return new Promise((resolve, reject) => {
        re.on('data', chunks => bufs.push(chunks));

        re.on('error', err => reject(err));

        re.on('end', () => {
            resolve(JSON.parse(Buffer.concat(bufs)));
        });
    });
}

function toMetadata(template, input) {
    const version = input.version;

    template['_id'] = input.name;
    template.name = input.name;
    template['dist-tags'].latest = version;
    template.versions[version] = input;

    return template;
} 

async function addFile(fileJson) {
    const content = new Buffer(JSON.stringify(fileJson, null, 4));
    const [result] = await ipfs.files.add(content);

    const from = `/ipfs/${result.hash}`;
    const to = `/npm-versions/${fileJson.name}`;

    try {
        await ipfs.files.rm(to);
    } catch(err) {}

    await ipfs.files.cp([from, to]);

    return result;
}

async function bootstrap() {
    try {
        await ipfs.files.mkdir('/npm-versions')
    } catch (err) {
        if (err.message.toLowerCase() !== 'file already exists') {
            throw err;
        }
    }
}

bootstrap().then(() => {
    return ipfs.pubsub.subscribe(topic, receiveMsg);
}).catch(err => console.error(err));

