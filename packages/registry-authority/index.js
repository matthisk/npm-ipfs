var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'}); // leaving out the arguments will default to these values

const topic = 'npm';

async function receiveMsg(msg) {
    var json = undefined;
    try {
        json = JSON.parse(msg.data.toString());
    } catch (error){
        console.log("JSON parse error:", msg.data.toString());
        return
    }
    //console.log(json);

    const result = await addFile(json);
    console.log(result);

    const res = await publish(result[1]);
    console.log(res);
}

async function addFile(fileJson) {
    const files = [{
        path: `/npm-versions/${fileJson.name}`,
        content: new Buffer(JSON.stringify(fileJson)),
    }];

    return ipfs.files.add(files);
}

async function publish(multihash) {
    //const multihash = await ipfs.files.stat('/npm-versions');
    return ipfs.name.publish(multihash);
}


ipfs.pubsub.subscribe(topic, receiveMsg);

