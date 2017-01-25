var q = require('q')
var SerialPort = require('serialport')
var xbee = require('xbee-api')
var log = require('./logger.js')

module.exports = {
  begin: begin,
  end: end,
  getLocalAddress: getLocalAddress,
  getLocalNI: getLocalNI,
  transmitMqttMessage: transmitMqttMessage
}

var serialport
var C = xbee.constants
var xbeeAPI

/**
 * Start a connection with the local XBee.
 * @param {string} port - XBee serial port, eg. COM1, /dev/ttyUSB0
 * @param {number} baud - XBee baud rate, typically 9600
 * @param {number} apiMode - 1 or 2
 * @param {function} readyCallback - function() called when XBee connection is ready.
 * @param {function} messageCallback - function(error, frame) called when an XBee frame
 * is received or there is an error.
 */
function begin (port, baud, apiMode, readyCallback, messageCallback) {
  if (!readyCallback || readyCallback.length !== 0) {
    throw new TypeError('Bad or missing readyCallback.')
  }

  if (!messageCallback || messageCallback.length !== 2) {
    throw new TypeError('Bad or missing messageCallback.')
  }

  if (!apiMode || apiMode !== 1 || apiMode !== 2) {
    throw new TypeError('Invalid API mode (1 or 2)')
  }

  xbeeAPI = new xbee.XBeeAPI({api_mode: apiMode})

  serialport = new SerialPort(port, {
    baudrate: baud,
    parser: xbeeAPI.rawParser()
  })

  serialport.on('open', function () {
    log('debug', 'Serial Port Open')
    readyCallback()
  })

  serialport.on('error', function (error) {
    log('error', error)
    messageCallback(error, null)
  })

  xbeeAPI.on('frame_object', function (frame) {
    messageCallback(null, frame)
  })

  xbeeAPI.on('error', function (error) {
    log('error', error)
    messageCallback(error, null)
  })
}

/**
 * Close XBee connection.
 * @param {function} callback - function() called once XBee is closed.
 */
function end (callback) {
  serialport.close(callback)
}

/**
 * Transmit an MQTT message over XBee network.  Does not wait for response.
 *  @param {string} message - Stringified XBee API command frame
 * @throws {Error}
 */
function transmitMqttMessage (message) {
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

  serialport.write(xbeeAPI.buildFrame(frame))
}

/**
 * Send an XBee request and return a promise fulfilled with the response.
 * @param {Object} frame - XBee API request frame.
 * @return {Promise}
 * @resolve {Object} XBee API response frame.
 * @reject {Error} on frame errors, tx/rx errors, or timeout (5s)
 */
function transmit (frame) {
  var timeout = 5000
  frame.id = xbeeAPI.nextFrameId()
  var deferred = q.defer()

  // if response matches request, resolve with response
  var callback = function (receivedFrame) {
    if (receivedFrame.id === frame.id) {
      deferred.resolve(receivedFrame)
    }
  }

  // create a response listener
  xbeeAPI.on('frame_object', callback)

  // remove the response listener once the timeout has elapsed
  setTimeout(function () {
    xbeeAPI.removeListener('frame_object', callback)
  }, timeout + 1000)

  // send the request
  serialport.write(xbeeAPI.buildFrame(frame))

  // return the response if the promise resolves, reject with message on timeout
  return deferred.promise.timeout(timeout, 'XBee not responding.').then(function (response) {
    return response
  }, function (timeout) {
    log('error', timeout.message)
  })
}

/**
 * Get 64-bit address of local XBee
 * @return {Promise}
 * @resolve {string} 64-bit address string
 * @reject {Error}
 */
function getLocalAddress () {
  var gw = null
  var frame = {
    type: C.FRAME_TYPE.AT_COMMAND,
    command: 'SH',
    commandParameter: []
  }
  return transmit(frame).then(function (sh) {
    gw = sh.commandData.toString('hex')
    frame.command = 'SL'
    return transmit(frame)
  }).then(function (sl) {
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
function getLocalNI () {
  var frame = {
    type: C.FRAME_TYPE.AT_COMMAND,
    command: 'NI',
    commandParameter: []
  }
  return transmit(frame).then(function (ni) {
    return ni.commandData.toString()
  })
}
