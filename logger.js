var winston = require('winston');
winston.add(winston.transports.File, {
    filename: 'xbmq.log',
    maxsize: 10000000,
    maxFiles: 2
});
winston.level = 'debug';
module.exports = winston.log;