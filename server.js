const express = require('express'),
    bodyParser = require('body-parser'),
    redis = require('redis'),
    app = express(),
    router = express.Router();

/***************************
 *       Middleware        *
 ***************************/

app.set('json spaces', 2);
app.disable("x-powered-by");
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

/**********************
 *       Redis        *
 **********************/


const client = redis.createClient('6379', '192.168.1.13');

function rk() {
    return Array.prototype.slice.call(arguments).join(':');
}

const importMulti = client.multi();
const hashIndex = rk('todo', 'date');

client.on('connect', () => {
    console.log('Connected to Redis server');
});

client.on('error', (err) => {
    console.log('Error ' + err);
});

function keyExists(key, cbFound, cbNotFound) {
    console.log('looking for key...');
    client.exists('todo:' + key, (err, reply) => {
        console.log(err);
        console.log(reply);
        if (reply === 1) {
            console.log('key exists');
            cbFound();
        } else {
            console.log('key not found');
            cbNotFound();
        }
    });
}

/********************
 *       API        *
 ********************/

router.get('/', (req, res) => {

    function onComplete(results) {
        console.log("On Complete");
        res.setHeader('Content-Type', 'application/json');
        res.status(200);
        res.json(results);
    }

    importMulti.zrangebyscore(
        hashIndex,
        '-inf',
        new Date().getTime()
    );

    let resultArrayIndex = importMulti.queue.length - 1;

    importMulti.exec((err, results) => {
        if (err) {
            console.log(err);
            throw err;
        } else {
            console.log('Results : ');
            console.log(results);
            let finalJson = [];
            let res = results.slice(resultArrayIndex, results.length)[0];
            let nbRes = res ? res.length : 0;

            if (nbRes === 0) {
                onComplete();
            } else {
                res.forEach((key) => {
                    client.hgetall(key, (err, reply) => {
                        if (err) {
                            throw err;
                        }
                        finalJson.push(reply);
                        if (--nbRes === 0) {
                            onComplete(finalJson);
                        }
                    });
                });
            }
        }
    });
});

router.post('/add', (req, res) => {
    console.log('post /add');
    console.log(req.body);
    let newItem = req.body;
    const hashKey = rk('todo', newItem.name);
    client.hmset(hashKey, newItem, (err, reply) => {
        console.log('hmset');
        if (err) {
            throw err;
        }
        console.log(reply);
        client.zadd(hashIndex, newItem.timestamp, hashKey);
        res.status(200);
        res.json(newItem);
    });

});


router.delete('/:id', (req, res) => {
    console.log("delete");
    const id = req.params.id;
    console.log("id : " + id);
    keyExists(id, () => {
        client.del('todo:' + id, (err, reply) => {
            console.log('del ?');
            if (err) {
                throw err;
            }
            console.log(reply);
            client.zrem(hashIndex, 'todo:' + id, (err, reply) => {
                console.log('zrem ?');
                if (err) {
                    throw err;
                }
                console.log(reply);
                res.status(200);
                res.json(reply);
            });
        });
    }, () => {
        res.status(404);
        res.json('{id ' + id + ' doesn\'t exist ! }');
    });
});

router.put('/:id', (req, res) => {
    console.log('put');
    const id = req.params.id;
    console.log("id : " + id);
});

app.use('/todo', router);

/***********************
 *       Server        *
 ***********************/

app.listen(9001);
console.log('Server started on port 9001');