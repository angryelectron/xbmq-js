var nconf = require('nconf')
var path = require('path')

nconf.argv()
nconf.file({
  file: path.join(__dirname, 'config.json')
})
nconf.defaults({
  rootTopic: 'xbmq',
  broker: 'mqtt://test.mosquitto.org',
  username: null,
  password: null,
  port: '/dev/ttyUSB0',
  baud: 9600,
  log: path.join(__dirname, 'xbmq.log'),
  loglevel: 'info',
  apiMode: 2
})

module.exports = nconf
