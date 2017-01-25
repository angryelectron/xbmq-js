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

xbee.begin(
  nconf.get('port'),
  nconf.get('baud'),
  nconf.get('apiMode'),
  beginMqtt,                // callback when XBee is ready
  whenXBeeMessageReceived)  // callback when XBee receives

/**
* Connect to MQTT Broker.  Creates a topic `rootTopic/gatewayTopic`
* where gatewayTopic is the NI of the local XBee or 'UNKNOWN' if NI
* is not set.
*/
function beginMqtt () {
  var credentials = {
    username: nconf.get('username'),
    password: nconf.get('password')
  }

  xbee.getLocalNI().then(function (name) {
    name = name.trim()
    if (!name || name.length === 0) {
      log('error', 'Local XBEE NI not set.')
      name = 'UNKNOWN'
    }
    var gatewayTopic = nconf.get('rootTopic') + '/' + name
    log('info', 'Gateway Topic: ' + gatewayTopic)
    mqtt.begin(nconf.get('broker'), credentials, gatewayTopic, whenMqttMessageReceived)
  }).catch(function (err) {
    log('error', err.message)
  })
}

/**
 * Handle incoming MQTT messages.
 *
 * @param {Error} error
 * @param {string} topic
 * @param {Object} message
 */
function whenMqttMessageReceived (error, topic, message) {
  if (error) {
    // mqtt errors are not published via mqtt
    log(error)
  } else {
    try {
      xbee.transmitMqttMessage(message)
    } catch (error) {
      log(error)
      if (mqtt.isConnected()) {
        mqtt.publishLog(error)
      }
    }
  }
}

/**
 * Handle incoming XBee messages
 *
 * @param {Error} error
 * @param {Object} frame - XBee API frame
 */
function whenXBeeMessageReceived (error, frame) {
  if (error) {
    log('error', error.message)
    if (mqtt.isConnected()) {
      mqtt.publishLog(error)
    }
  } else {
    try {
      mqtt.publishXBeeFrame(frame)
    } catch (error) {
      log('error', error)
      mqtt.publishLog(error)
    }
  }
}
