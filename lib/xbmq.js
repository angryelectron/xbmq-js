const XBee = require('./xbee.js')
const Mqtt = require('./mqtt.js')

class Xbmq {
  /**
   * Create a new Xbmq instance.  Use {@link Xbmq#create} instead of this
   * constructor.
   * @param {XBee} xbee
   * @param {Mqtt} mqtt
   */
  constructor (xbee, mqtt, logger) {
    this.xbee = xbee
    this.mqtt = mqtt
    this.log = logger
  }

  /**
   * Create a new Xbmq instance.
   * @param {Object} xbeeConfig
   * @param {Object} mqttConfig
   * @return {Promise} Resolves with new Xbmq instance, rejects with Error
   */
  static create (xbeeConfig, mqttConfig, logger) {
    let xbmq = new Xbmq(null, null, logger)
    xbeeConfig.callback = xbmq.onXBeeEvent
    mqttConfig.callback = xbmq.onMqttEvent
    return XBee.create(xbeeConfig).then((instance) => {
      xbmq.xbee = instance
      return xbmq.xbee.getLocalNI()
    }).then((ni) => {
      ni = ni.trim()
      if (!ni || ni.length === 0) {
        this.log('error', 'Local XBEE NI not set.')
        ni = 'UNKNOWN'
      }
      mqttConfig.topic += '/' + ni
      xbmq.log('info', 'Gateway Topic: ' + mqttConfig.topic)
      xbmq.mqtt = Mqtt.create(mqttConfig)
      return Promise.resolve(xbmq)
    })
  }

  /**
   * Destroy an XBMQ instance.  Closes serial ports and mqtt connections.
   * Safe to call even if Xbee and Mqtt are not conencted.
   * @returns {Promise} Resolves once destroyed.
   */
  destroy () {
    if (this.mqtt) this.mqtt.destroy()
    if (this.xbee) return this.xbee.destroy()
    return Promise.resolve()
  }

/**
 * Handle unsolicited MQTT messages and errors.
 * @param {Error} error
 * @param {string} topic
 * @param {Object} message
 */
  onMqttEvent (error, topic, message) {
    if (error) {
      this.log('error', error.message) // mqtt errors are not published via mqtt to avoid a loop
      return
    }
    try {
      let frame = this.convertToFrame(message)
      this.xbee.sendFrame(frame)
    } catch (err) {
      this.log('error', err.message)
    }
  }

/**
 * Handle incoming XBee messages
 * @param {Error} error
 * @param {Object} frame - XBee API frame
 */
  onXBeeEvent (error, frame) {
    if (error) {
      this.log('error', error.message)
      return
    }
    try {
      this.mqtt.publishXBeeFrame(frame)
    } catch (error) {
      this.log('error', error.message)
    }
  }

/**
 * Convert an incoming XBMQ mqtt message to an XBee frame, adding required
 * missing parameters, etc.
 * @param {string} message - JSON string representation of an xbee-api frame.
 * @returns {Object} frame - xbee-api frame.
 */
  convertToFrame (message) {
    var frame = JSON.parse(message)  // will throw if message is not stringified JSON
    // type may be sent as an integer or hex string
    if (typeof frame.type === 'string') {
      frame.type = parseInt(frame.type)
    }
    // id may be sent as an integer or hex string
    if (typeof frame.id === 'string') {
      frame.id = parseInt(frame.id)
    }
    // commandParameter isn't required in the mqtt message but is for XBee
    if (!frame.commandParameter) {
      frame.commandParameter = []
    }
    return frame
  }

} // class
module.exports = Xbmq
