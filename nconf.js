var nconf = require('nconf');

nconf.argv();
nconf.file({
    file: __dirname + '/config.json'
});
nconf.defaults({
    rootTopic: 'xbmq',
    broker: 'mqtt://test.mosquitto.org',
    port: '/dev/ttyUSB0',
    baud: 9600,
    log: __dirname + '/xbmq.log',
    loglevel: 'info',
    apiMode: 2
});

module.exports = nconf;

