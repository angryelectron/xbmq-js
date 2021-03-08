const winston = require('winston')
const nconf = require('./nconf.js')

module.exports = winston.createLogger({
  level: nconf.get('loglevel'),
  transports: [
    new winston.transports.File({ filename: nconf.get('log') })
  ]
})
