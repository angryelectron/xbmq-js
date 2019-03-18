const SerialPort = require('serialport')
const XBeeAPI = require('xbee-api')
const EventEmitter = require('events')

/**
 * Class for sending and receiving XBee frames via locally attached XBee.
 * Provides a convenient and promise-based wrapper for xbee-api.  Not
 * specific to XBMQ.
 * TODO: describe events
 */
class XBee extends EventEmitter {
  /**
   * Create a new XBee instance using dependency injection.  You probably want to call {@link XBee.create}
   * unless you are testing.
   * @param {SerialPort} serialport - Open and initialized instance of [serialport]{@link https://www.npmjs.com/package/serialport}.
   * @param {XBeeAPI} xbeeAPI - Instance of [xbee-api]{@link https://www.npmjs.com/package/xbee-api}
   * unsolicieted incoming XBee frames.
   */
  constructor (serialport, xbeeAPI) {
    super()
    this.xbeeAPI = xbeeAPI
    this.serialport = serialport
    this.serialport.on('error', (error) => {
      this.emit('error', error)
    })
    this.serialport.pipe(this.xbeeAPI.parser)
    xbeeAPI.builder.pipe(this.serialport)
    this.xbeeAPI.parser.on('data', (frame) => {
      this.emit('xbee-msg', frame)
    })
    this.xbeeAPI.parser.on('error', (error) => {
      this.emit('error', error)
    })
  }

  /**
 * Creates a new instance of {@link XBee} from user-supplied config.  Simpler to
 * use than the constructor.
 * @param {Object} config - XBee config
 * @param {number} config.apiMode - XBee API mode [1|2]
 * @param {string} config.port - XBee serial port (COM4, /dev/ttyUSB0)
 * @param {number} config.baud - XBee serial baud rate (9600)
 * @return {Promise} Resolves with {@link XBee}, rejects with Error.
 */
  static create (config) {
    if (!config || !config.apiMode || !config.port || !config.baud) {
      return Promise.reject(TypeError('Bad or missing arguments'))
    } else if (config.apiMode !== 1 && config.apiMode !== 2) {
      return Promise.reject(TypeError('Invalid API mode (1 or 2)'))
    }
    let xbeeAPI = new XBeeAPI.XBeeAPI({ api_mode: config.apiMode })
    return new Promise((resolve, reject) => {
      let serialport = new SerialPort(config.port, { baudRate: config.baud })
      serialport.on('error', reject)
      serialport.on('open', () => {
        resolve(new XBee(serialport, xbeeAPI))
      })
    })
  }

  /**
 * Destroy the XBee instance and close the XBee serial port.
 * @return {Promise} Resolves when closed, rejects with Error
 */
  destroy () {
    return new Promise((resolve, reject) => {
      this.serialport.close(resolve) // resolve no matter what
    })
  }

  /**
 * Transmit an MQTT message over XBee network.  Does not wait for or return
 * a response.
 * @param {Object} frame - xbee-api frame.
 * @throws {Error} if frame is invalid or cannot be written
 */
  sendFrame (frame) {
    this.xbeeAPI.builder.write(frame)
  }

  /**
 * Send XBee request and wait for a response.
 * @param {Object} frame - xbee-api frame for a request that returns a response (ie. AT command)
 * @param {number} [timeout=5000] - time to wait, in milliseconds
 * @return {Promise} Resolves with an xbee-api response frame, rejects with Error
 * on tx/rx errors or on timeout.
 */
  sendAndReceiveFrame (frame, timeout) {
    if (!frame) {
      return Promise.reject(TypeError('Invalid frame.'))
    }
    timeout = timeout || 5000
    frame.id = this.xbeeAPI.nextFrameId()

    return new Promise((resolve, reject) => {
      // called on each response, resolves when a matching frame is found
      var matchFrameResponse = (receivedFrame) => {
        if (receivedFrame.id === frame.id) {
          resolve(receivedFrame)
        }
      }
      // create a one-time listener that will try to match frames
      this.xbeeAPI.parser.once('data', matchFrameResponse)

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
    return this.sendAndReceiveFrame(frame).then((sh) => {
      gw = sh.commandData.toString('hex')
      frame.command = 'SL'
      return this.sendAndReceiveFrame(frame)
    }).then((sl) => {
      gw += sl.commandData.toString('hex')
      return gw
    })
  }

  /**
 * Get Node-Identifier of Local XBee
 * @return {Promise} Resolves with NI string, rejects with Error.
 */
  getLocalNI () {
    var frame = {
      type: 0x08,
      command: 'NI',
      commandParameter: []
    }
    return this.sendAndReceiveFrame(frame).then((ni) => {
      return ni.commandData.toString()
    })
  }
} // class

module.exports = XBee
