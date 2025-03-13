const { createLogger, format, transports } = require('winston')
const { combine, timestamp, json } = format
const nconf = require('./nconf.js')

const logger = createLogger({
  level: nconf.get('loglevel'),
  format: combine(timestamp(), json()),
  transports: [
    new transports.File({ filename: nconf.get('log') })
  ]
})

module.exports = (level, message) => { logger.log({ level, message }) }
