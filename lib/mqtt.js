const MqttClient = require('mqtt')
const EventEmitter = require('events')

/**
 * Mqtt class.  Subscribes to XBMQ topics and publishes XBMQ topics and messages.
 * TODO: document events emitted
 */
class Mqtt extends EventEmitter {
  /**
   * Create an Mqtt instance.  You probably want to use {@link Mqtt.create} instead
   * of this constructor  unless you are testing.
   * @param {Object} mqttClient - A connected [mqtt client]{@link https://www.npmjs.com/package/mqtt#client}
   * @param {string} rootTopic - Root MQTT topic.  XBMQ-specific topics will be children of this topic.
   * unsolicited incoming mqtt messages.
   */
  constructor (mqttClient, rootTopic) {
    super()
    if (!(mqttClient && rootTopic)) throw TypeError('Bad or missing arguments')
    this.client = mqttClient
    this.responseTopic = rootTopic + '/response'
    this.requestTopic = rootTopic + '/request'
    this.onlineTopic = rootTopic + '/online'
    this.logTopic = rootTopic + '/log'
    this.client.on('reconnect', () => {
      this.emit('debug', 'mqtt reconnecting')
    })
    this.client.on('close', () => {
      this.emit('debug', 'mqtt closing')
    })
    this.client.on('offline', () => {
      this.emit('debug', 'mqtt offline')
    })
    this.client.on('connect', (connack) => {
      this.emit('debug', 'mqtt connected to broker')
      this.publishOnlineStatus(true)
      if (!connack.sessionPresent) {
      // only subscribe on new connections, not reconnects
        this.client.subscribe(this.requestTopic, null, this.messageCallback)
      }
    })
    this.client.on('error', (error) => {
      this.emit('error', error)
    })
    this.client.on('message', (topic, message) => {
      this.emit('mqtt-msg', topic, message.toString())
    })
  }

  /**
 * Create the MQTT client, establish LWT, subscribe to the request topic,
 * and listen for incoming messages.
 * @param {Object} config
 * @param {string} config.broker - eg. mqtt://host
 * @param {Object} [config.credentials]
 * @param {string} config.credentials.username - Broker username
 * @param {string} config.credentials.password - Broker password
 * @param {string} config.topic - MQTT root topic
 */
  static create (config) {
    if (!(config.broker && config.topic)) {
      throw TypeError('Bad/missing broker or root topic.')
    }
    const mqttOptions = {
      clientId: 'xbmq-' + Math.random().toString(16).substr(2, 8),
      clean: false,
      keepalive: 60,
      reconnectPeriod: 15000,
      will: {
        topic: config.topic + '/online',
        payload: '0',
        qos: 0,
        retain: true
      }
    }
    if (config.credentials && config.credentials.username && config.credentials.password) {
      mqttOptions.username = config.credentials.username
      mqttOptions.password = config.credentials.password
    };
    const client = MqttClient.connect(config.broker, mqttOptions)
    return new Mqtt(client, config.topic, config.callback)
  }

  /**
 * Close the MQTT client
 */
  destroy () {
    if (this.client.connected) {
      this.publishOnlineStatus(false)
    }
    this.client.end(false)
  }

  /**
 * Publish XBMQ Gateway's online status to the `online` topic.  Retained.
 * @param {boolean} isOnline - true for online, false for offline
 */
  publishOnlineStatus (isOnline) {
    const message = isOnline ? '1' : '0'
    this.client.publish(this.onlineTopic, message, { retain: true }, (err) => {
      if (err) this.emit('error', err)
    })
  }

  /**
 * Publish an XBee API frame to the `response` topic.
 * @param {Object} frame - XBee API Frame object.
 */
  publishXBeeFrame (frame) {
    if (!this.client.connected) {
      this.emit('error', ReferenceError('MQTT not conencted, cannot publish frame.'))
    } else if (frame) {
      const message = JSON.stringify(frame)
      this.emit('debug', 'Sending: ' + this.responseTopic + ': ' + message)
      this.client.publish(this.responseTopic, message, null, (err) => {
        if (err) this.emit('error', err)
      })
    }
  }

  /**
 * Publish a message to the `log` topic.  Retained.
 * @param {string|Error} message - Error or message to publish.
 */
  publishLog (message) {
    if (!(typeof message === 'string' || message instanceof Error)) {
      throw new TypeError('Mesage must be an Error or a String.')
    }
    if (!this.client.connected) {
      this.emit('error', ReferenceError('MQTT not connected, cannot publish log.'))
    } else {
      this.client.publish(this.logTopic, message.message || message, { retain: true }, (err) => {
        this.emit('error', err)
      })
    }
  }
} // class

module.exports = Mqtt
