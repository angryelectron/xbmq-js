/**
 * XBMQ XBee Class.  Don't call directly, use {@XBee#create} instead.
 * @class
 */
module.exports = class XBee {
  /**
   * @constructor
   * @param {SerialPort} serialport - Instance of SerialPort
   * @param {XBeeAPI} xbeeAPI - Instance of XBeeAPI
   */
  constructor (serialport, xbeeAPI) {
    this.serialport = serialport
    this.xbeeAPI = xbeeAPI
  }

/**
 * XBMQ XBee Factory.  Creates a new instance of {@link XBee}
 * @param {SerialPort} SerialPort - SerialPort module (uninitialized)
 * @param {XBeeAPI} XBeeAPI - XBeeAPI module (uninitialized)
 * @param {Object} options - XBee options
 * @param {number} options.apiMode - XBee API mode [1|2]
 * @param {string} options.port - XBee serial port (COM4, /dev/ttyUSB0)
 * @param {number} options.baud - XBee serial baud rate (9600)
 * @param {callback} options.callback - An error first callback for handling XBee data
 * @return {Promise} Resolves with XBee instance, rejects with Error
 */
  static create (SerialPort, XBeeAPI, options) {
    if (!SerialPort || !XBeeAPI || !options || !options.apiMode || !options.port || !options.baud) {
      return Promise.reject(Error('Bad or missing arguments'))
    } else if (options.apiMode !== 1 && options.apiMode !== 2) {
      return Promise.reject(TypeError('Invalid API mode (1 or 2)'))
    } else if (!options.callback || options.callback.length !== 2) {
      return Promise.reject(TypeError('Bad or missing callback.'))
    }
    let xbeeAPI = new XBeeAPI.XBeeAPI({
      api_mode: options.apiMode
    })
    xbeeAPI.parser.on('data', (frame) => {
      options.callback(null, frame)
    })
    xbeeAPI.parser.on('error', (error) => {
      options.callback(error, null)
    })
    return new Promise((resolve, reject) => {
      let serialport
      try {
        serialport = new SerialPort(options.port, {baudRate: options.baud})
      } catch (error) {
        reject(error)
      }
      serialport.pipe(xbeeAPI.parser)
      xbeeAPI.builder.pipe(serialport)
      serialport.on('open', () => {
        resolve(new XBee(serialport, xbeeAPI))
      })
      serialport.on('error', (error) => {
        reject(error)
      })
    })
  }

/**
 * Close XBee connection.
 * @return {Promise} Resolves when closed, rejects with Error
 */
  end () {
    return new Promise((resolve, reject) => {
      this.serialport.close((err) => {
        return err ? reject(err) : resolve()
      })
    })
  }

/**
 * Transmit an MQTT message over XBee network.
 * @param {string} message - Stringified XBee API command frame
 * @return {Promise} Resolves on success, rejects with Error
 */
  transmitMqttMessage (message) {
    try {
      var frame = JSON.parse(message)  // will throw if message is not stringified JSON
    } catch (err) {
      return Promise.reject(err)
    }
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
    return new Promise((resolve, reject) => {
      try {
        this.xbeeAPI.builder.write(frame, resolve)
      } catch (err) {
        reject(err)
      }
    })
  }

/**
 * Send an XBee request and return a promise fulfilled with the response.
 * @param {Object} frame - XBee API request frame.
 * @param {number} timeout - timeout in milliseconds.  Optional.  Default is 5s.
 * @return {Promise} Resolves with an XBee API response frame, rejects with Error
 * on tx/rx errors or on timeout.
 */
  transmitFrame (frame, timeout) {
    if (!frame) {
      return Promise.reject(TypeError('Invalid frame.'))
    }
    timeout = timeout || 5000
    frame.id = this.xbeeAPI.nextFrameId()

    return new Promise((resolve, reject) => {
    // called on each response, resolves when a matching frame is found
      var matchFrameResponse = (receivedFrame) => {
        if (receivedFrame.id === frame.id) {
          this.xbeeAPI.parser.removeListener('data', matchFrameResponse)
          resolve(receivedFrame)
        }
      }
    // create a listener that will try to match frames
    // need to make sure this listener gets removed regardless of how this
    // call completes
      this.xbeeAPI.parser.on('data', matchFrameResponse)

    // send the request
      try {
        this.xbeeAPI.builder.write(frame)
        setTimeout(() => {
          this.xbeeAPI.parser.removeListener('data', matchFrameResponse)
          reject(Error('Timeout waiting for XBee response.'))
        }, timeout)
      } catch (err) {
        this.xbeeAPI.parser.removeListener('data', matchFrameResponse)
        reject(err)
      }
    })
  }

/**
 * Get 64-bit address of local XBee
 * @return {Promise} Resolves with 64-bit address string, rejects with Error
 */
  getLocalAddress () {
    var gw = null
    var frame = {
      type: 0x08, // AT command
      command: 'SH',
      commandParameter: []
    }
    return this.transmit(frame).then((sh) => {
      gw = sh.commandData.toString('hex')
      frame.command = 'SL'
      return this.transmit(frame)
    }).then((sl) => {
      gw += sl.commandData.toString('hex')
      return gw
    })
  }

/**
 * Get Node-Identifier of Local XBee
 * @return {Promise}
 * @resolve {string} NI
 * @reject {Error}
 */
  getLocalNI () {
    var frame = {
      type: 0x08,
      command: 'NI',
      commandParameter: []
    }
    return this.transmit(frame).then((ni) => {
      return ni.commandData.toString()
    })
  }
} // class
