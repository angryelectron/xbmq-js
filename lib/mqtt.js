var Mqtt = require('mqtt')
var log = require('./logger.js')

module.exports = {
  begin: begin,
  end: end,
  publishXBeeFrame: publishXBeeFrame,
  publishLog: publishLog,
  isConnected: isConnected
}

var mqtt
var rootTopic
var connected = false

/**
 * Check if connected to the broker.
 * @private
 * @return {boolean} true if connected, otherwise false
 */
function isConnected () {
  return connected && mqtt && rootTopic
}

/**
 * Start the MQTT client, establish LWT, subscribe to the request topic,
 * and listen for incoming messages.
 *
 * @param {string} broker - eg. mqtt://host
 * @param {Object} credentials
 * @param {string} credentials.username - Broker username
 * @param {string} credentials.password - Broker password
 * @param {string} topic - MQTT topic, eg. location/xbeeNI
 * @param {function} messageCallback - function(error, topic, message)
 */
function begin (broker, credentials, topic, messageCallback) {
  if (!topic) {
    throw new ReferenceError('Invalid root topic.')
  } else if (!broker) {
    throw new ReferenceError('Invalid broker.')
  }

  rootTopic = topic
  var mqttOptions = {
    clientId: 'xbmq-' + Math.random().toString(16).substr(2, 8),
    clean: false,
    keepalive: 60,
    reconnectPeriod: 15000,
    will: {
      topic: rootTopic + '/online',
      payload: '0',
      qos: 0,
      retain: true
    }
  }

  if (credentials && credentials.username && credentials.password) {
    mqttOptions.username = credentials.username
    mqttOptions.password = credentials.password
  };

  mqtt = Mqtt.connect(broker, mqttOptions)

  mqtt.on('reconnect', function () {
    log('debug', 'Reconnecting')
  })

  mqtt.on('close', function () {
    log('debug', 'Closing')
    connected = false
  })

  mqtt.on('offline', function () {
    log('debug', 'Offline')
  })

  mqtt.on('connect', function (connack) {
    log('debug', 'Connected to ' + broker)
    connected = true
    publishOnlineStatus(true)
    if (!connack.sessionPresent) {
      // only subscribe on new connections, not reconnects
      mqtt.subscribe(rootTopic + '/request', null, function (error) {
        if (error) {
          return messageCallback(error)
        }
      })
    }
  })

  mqtt.on('error', function (error) {
    log('error', error)
    return messageCallback(error)
  })

  mqtt.on('message', function (topic, message) {
    log('debug', 'Received: ' + topic + ': ' + message)
    return messageCallback(null, topic, message.toString())
  })
}

/**
 * Close the MQTT client.  Does nothing if the client is not open.
 * @param {function} callback - function() called once connection is closed.
 */
function end (callback) {
  if (mqtt) {
    publishOnlineStatus(false)
    mqtt.end(false, function () {
      mqtt = null
      rootTopic = null
      if (callback) {
        callback()
      }
    })
  }
}

/**
 * Publish XBMQ Gateway's online status to the `online` topic.
 * @param {boolean} isOnline - true for online, false for offline
 */
function publishOnlineStatus (isOnline) {
  var message = isOnline ? '1' : '0'
  var topic = rootTopic + '/online'
  mqtt.publish(topic, message, {retain: true})
  connected = isOnline
}

/**
 * Publish an XBee API frame to the `response` topic.
 * @param {Object} frame - XBee API Frame object.
 * @throws {ReferenceError} - If begin() not called or rootTopic is false.
 * @throws {ReferenceError} - If frame is invalid or has no remote64 address.
 */
function publishXBeeFrame (frame) {
  if (!isConnected()) throw new ReferenceError('MQTT not conencted.')
  if (!frame) return /* don't publish empty frames */
  var topic = rootTopic + '/response'
  var message = JSON.stringify(frame)
  log('debug', 'Sending: ' + topic + ': ' + message)
  mqtt.publish(topic, message)
}

/**
 * Publish a message to the `log` topic.
 * @param {string|Error} message
 * @throws {ReferenceError}  - If begin() not called or rootTopic is false.
 * @throws {TypeError} - If message is not an Error or a string.
 */
function publishLog (message) {
  if (!isConnected()) {
    throw new ReferenceError('MQTT not connected.')
  }
  if (!(message || message instanceof Error)) {
    throw new TypeError('Mesage must be an Error or a String.')
  }
  var topic = rootTopic + '/log'
  mqtt.publish(topic, message.message || message, {retain: true})
}
