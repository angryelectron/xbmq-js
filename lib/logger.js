const winston = require('winston')
const nconf = require('./nconf.js')

const logger = winston.createLogger({
  level: nconf.get('loglevel'),
  transports: [
    new winston.transports.File({ filename: nconf.get('log') })
  ]
})

module.exports = (level, message) => { logger.log({ level, message }) }
