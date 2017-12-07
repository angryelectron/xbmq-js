const MqttClient = require('mqtt')
const log = require('./logger.js')

/**
 * XBMQ Mqtt class
 * @class
 */
module.exports = class Mqtt {
  /**
   * @constructor
   * @param {Object} mqttClient - A connected mqtt#client
   * @param {string} rootTopic - Root MQTT topic
   * @param {callback} messageCallback - (error, string) Called on errors or
   * incoming mqtt messages
   */
  constructor (mqttClient, rootTopic, messageCallback) {
    if (!(mqttClient && rootTopic && messageCallback)) throw TypeError('Bad or missing arguments')
    this.client = mqttClient
    this.responseTopic = rootTopic + '/response'
    this.requestTopic = rootTopic + '/request'
    this.onlineTopic = rootTopic + '/online'
    this.logTopic = rootTopic + '/log'
    this.messageCallback = messageCallback
    this.client.on('reconnect', () => {
      log('debug', 'Reconnecting')
    })
    this.client.on('close', () => {
      log('debug', 'Closing')
    })
    this.client.on('offline', () => {
      log('debug', 'Offline')
    })
    this.client.on('connect', (connack) => {
      log('debug', 'Connected to broker')
      this.publishOnlineStatus(true)
      if (!connack.sessionPresent) {
      // only subscribe on new connections, not reconnects
        this.client.subscribe(this.requestTopic, null, this.messageCallback)
      }
    })
    this.client.on('error', (error) => {
      log('error', error)
      return messageCallback(error)
    })
    this.client.on('message', (topic, message) => {
      log('debug', 'Received: ' + topic + ': ' + message)
      return messageCallback(null, topic, message.toString())
    })
  }

/**
 * Create the MQTT client, establish LWT, subscribe to the request topic,
 * and listen for incoming messages.
 * @param {string} broker - eg. mqtt://host
 * @param {Object} credentials
 * @param {string} credentials.username - Broker username
 * @param {string} credentials.password - Broker password
 * @param {string} topic - MQTT topic, eg. location/xbeeNI
 * @param {callback} messageCallback - function(error, topic, message)
 */
  static create (broker, credentials, topic, messageCallback) {
    if (!(broker && credentials && topic && messageCallback)) {
      throw TypeError('Bad/missing arguments')
    }
    let mqttOptions = {
      clientId: 'xbmq-' + Math.random().toString(16).substr(2, 8),
      clean: false,
      keepalive: 60,
      reconnectPeriod: 15000,
      will: {
        topic: topic + '/online',
        payload: '0',
        qos: 0,
        retain: true
      }
    }
    if (credentials && credentials.username && credentials.password) {
      mqttOptions.username = credentials.username
      mqttOptions.password = credentials.password
    };
    let client = MqttClient.connect(broker, mqttOptions)
    return new Mqtt(client, topic, messageCallback)
  }

/**
 * Close the MQTT client.  Does nothing if the client is not open, calls
 * messageCallback on error.
 */
  end () {
    if (this.client.connected) {
      this.publishOnlineStatus(false)
    }
    this.client.end(false, this.messageCallback)
  }

/**
 * Publish XBMQ Gateway's online status to the `online` topic.
 * @param {boolean} isOnline - true for online, false for offline
 */
  publishOnlineStatus (isOnline) {
    var message = isOnline ? '1' : '0'
    this.client.publish(this.onlineTopic, message, {retain: true}, this.messageCallback)
  }

/**
 * Publish an XBee API frame to the `response` topic.
 * @param {Object} frame - XBee API Frame object.
 */
  publishXBeeFrame (frame) {
    if (!this.client.connected) {
      this.messageCallback(ReferenceError('MQTT not conencted, cannot publish frame.'))
    } else if (frame) {
      let message = JSON.stringify(frame)
      log('debug', 'Sending: ' + this.responseTopic + ': ' + message)
      this.client.publish(this.responseTopic, message, null, this.messageCallback)
    }
  }

/**
 * Publish a message to the `log` topic.
 * @param {string|Error} message
 */
  publishLog (message) {
    if (!(typeof message === 'string' || message instanceof Error)) {
      throw new TypeError('Mesage must be an Error or a String.')
    }
    if (!this.client.connected) {
      this.messageCallback(ReferenceError('MQTT not connected, cannot publish log.'))
    } else {
      this.client.publish(this.logTopic, message.message || message, {retain: true}, this.messageCallback)
    }
  }
} // class
