/**
 * XBee to MQTT Gateway
 * @copyright 2015-2017
 * @author Andrew Bythell <abythell@ieee.org>
 */
const xbmq = require('./lib/xbmq.js')
const nconf = require('./lib/nconf.js')
const logger = require('./lib/logger.js')

const xbeeConfig = {
  apiMode: nconf.get('apiMode'),
  port: nconf.get('port'),
  baud: nconf.get('baud')
}

const mqttConfig = {
  broker: nconf.get('broker'),
  credentials: {
    username: nconf.get('username'),
    password: nconf.get('password')
  },
  topic: nconf.get('rootTopic')
}

xbmq.create(xbeeConfig, mqttConfig, logger).catch((err) => {
  console.log(err.message)
  process.exit(1)
})
