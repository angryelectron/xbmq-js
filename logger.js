var winston = require('winston');
winston.add(winston.transports.File, {
    filename: 'xbmq.log'
});
winston.level = 'debug';
module.exports = winston.log;