const MqttClient = require('mqtt')
const log = require('./logger.js')

/**
 * Mqtt class.  Subscribes to XBMQ topics and publishes XBMQ topics and messages.
 */
class Mqtt {
  /**
   * Create an Mqtt instance.  You probably want to use {@link Mqtt.create} instead
   * of this constructor  unless you are testing.
   * @param {Object} mqttClient - A connected [mqtt client]{@link https://www.npmjs.com/package/mqtt#client}
   * @param {string} rootTopic - Root MQTT topic.  XBMQ-specific topics will be children of this topic.
   * @param {callback} messageCallback - (error, string) Called on errors or
   * unsolicited incoming mqtt messages.
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
 * @param {Object} credentials - Use null or false if broker doesn't require login.
 * @param {string} credentials.username - Broker username
 * @param {string} credentials.password - Broker password
 * @param {string} topic - MQTT root topic
 * @param {callback} messageCallback - (error, topic, message) Called on errors
 * or unsolicited incoming mqtt messages.
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
  destroy () {
    if (this.client.connected) {
      this.publishOnlineStatus(false)
    }
    this.client.end(false, this.messageCallback)
  }

/**
 * Publish XBMQ Gateway's online status to the `online` topic.  Retained.
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
 * Publish a message to the `log` topic.  Retained.  Calls messageCallback on
 * error.
 * @param {string|Error} message - Error or message to publish.
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

module.exports = Mqtt
