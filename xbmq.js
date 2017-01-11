#!/usr/bin/env node

/**
 * XBee to MQTT Gateway
 * @copyright 2015-2017
 * @author Andrew Bythell <abythell@ieee.org>
 */

var xbee = require('./lib/xbee.js')
var mqtt = require('./lib/mqtt.js')
var log = require('./lib/logger.js')
var nconf = require('./lib/nconf.js')

var rootTopic = nconf.get('rootTopic')
var broker = nconf.get('broker')
var credentials = {
  username: nconf.get('username'),
  password: nconf.get('password')
}
var port = nconf.get('port')
var baud = nconf.get('baud')
var apiMode = nconf.get('apiMode')

/*
 * Global variables
 */
var gatewayTopic

/*
 * Fire up the XBee and invoke the callback once the
 * XBee is ready to receive commands.
 *
 * Local and remote XBees must have the same ID and use
 * API mode 2.
 */
xbee.begin(port, baud, apiMode, beginMqtt, whenXBeeMessageReceived)

/*
 * Start the MQTT client.  Use the local XBee's 64-bit
 * address as part of the topic.
 */
function beginMqtt () {
  xbee.getLocalNI().then(function (name) {
    name = name.trim()
    if (!name || name.length === 0) {
      log('error', 'Local XBEE NI not set.')
      name = 'UNKNOWN'
    }
    gatewayTopic = rootTopic + '/' + name
    log('info', 'Gateway Topic: ' + gatewayTopic)
    mqtt.begin(broker, credentials, gatewayTopic, whenMqttMessageReceived)
  })
}

function whenMqttMessageReceived (error, topic, message) {
  if (error) {
    log(error)
        /*
         * Logging MQTT errors back to MQTT may create a infinite loop.
         */
        // mqtt.publishLog(error);
    return
  }

  try {
    xbee.transmitMqttMessage(message)
  } catch (error) {
    log(error)
    mqtt.publishLog(error)
  }
}

function whenXBeeMessageReceived (error, frame) {
  try {
    if (error) {
      log('error', error)
      if (mqtt.isConnected()) {
        mqtt.publishLog(error)
      }
    } else {
      if (mqtt.isConnected()) {
        mqtt.publishXBeeFrame(frame)
      }
    }
  } catch (error) {
    log('error', error)
    if (mqtt.isConnected()) {
      mqtt.publishLog(error)
    }
  }
}

module.exports = {
  whenMqttMessageReceived: whenMqttMessageReceived,
  whenXBeeMessageReceived: whenXBeeMessageReceived
}
