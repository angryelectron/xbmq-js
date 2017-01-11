var winston = require('winston')
var nconf = require('./nconf.js')

winston.add(winston.transports.File, {
  filename: nconf.get('log'),
  maxsize: 10000000,
  maxFiles: 2
})
winston.level = nconf.get('loglevel')
module.exports = winston.log
