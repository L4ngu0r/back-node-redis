const redis = require('redis');
const client = redis.createClient('6379', '192.168.1.13');

client.on('ready', () => {
    console.log('Redis server is ready.');
});

client.on('connect', () => {
    console.log('Connected to Redis server');
});

client.on('reconnecting', () => {
    console.log('Reconnectig to Redis server');
});

client.on('warning', (warn) => {
    console.log('[!] Warning [!]');
    console.log(warn);
});

client.on('error', (err) => {
    console.log('Error ' + err);
});

client.on('end', () => {
    console.log('Connection is closed!');
});

function rk() {
    return Array.prototype.slice.call(arguments).join(':');
}

var todos = [
    {
        'id': 0,
        'name' : 'title1',
        'description' : 'desc1',
        'timestamp' : 1472305842849
    },
    {
        'id': 1,
        'name': 'title2',
        'description': 'desc2',
        'timestamp': 1472306081133
    },
    {
        'id': 2,
        'name': 'title3',
        'description': 'desc3',
        'timestamp': 1472308682213
    }
];

const importMulti = client.multi();
const hashIndex = rk('todo','date');

todos.forEach((item) => {
    const hashKey = rk('todo',item.id);

    importMulti.hmset(hashKey, item);
    importMulti.zadd(hashIndex,item.timestamp,hashKey);
});

importMulti.zrangebyscore(
    hashIndex,
    '-inf',
    new Date().getTime()
);
let resultArrayIndex = importMulti.queue.length - 1;

importMulti.exec(function(err,results){
    if (err) {
        console.log(err);
        throw err;
    } else {
        console.log(results);
        console.log(results.slice(resultArrayIndex, results.length));
        client.quit();
    }
});
