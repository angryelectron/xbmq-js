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
 * @param {function} messageCallback - function(error, frame) called when an XBee frame
 * @return {Promise}
 * @resolves once XBee connection is established
 * @rejects {Error} if XBee connection fails
 */
function begin (port, baud, apiMode, messageCallback) {
  var deferred = q.defer()

  if (!messageCallback || messageCallback.length !== 2) {
    return q.reject(TypeError('Bad or missing messageCallback.'))
  } else if (apiMode !== 1 && apiMode !== 2) {
    return q.reject(TypeError('Invalid API mode (1 or 2)'))
  }

  xbeeAPI = new xbee.XBeeAPI({api_mode: apiMode})

  try {
    serialport = new SerialPort(port, {
      baudrate: baud,
      parser: xbeeAPI.rawParser()
    })
  } catch (err) {
    return q.reject(err)
  }

  serialport.on('open', function () {
    deferred.resolve()
  })
  serialport.on('error', function (error) {
    deferred.reject(error)
  })

  xbeeAPI.on('frame_object', function (frame) {
    messageCallback(null, frame)
  })

  xbeeAPI.on('error', function (error) {
    messageCallback(error, null)
  })

  return deferred.promise
}

/**
 * Close XBee connection.
 * @return {Promise}
 * @resolves When closed
 */
function end (callback) {
  var deferred = q.defer()
  serialport.close(function () {
    deferred.resolve()
  })
  return deferred.promise
}

/**
 * Transmit an MQTT message over XBee network.
 * @param {string} message - Stringified XBee API command frame
 * @return {Promise}
 * @resolve on success
 * @reject {Error}
 */
function transmitMqttMessage (message) {
  var deferred = q.defer()
  try {
    var frame = JSON.parse(message)  // will throw if message is not stringified JSON
  } catch (err) {
    q.reject(err)
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
  serialport.write(xbeeAPI.buildFrame(frame), function () {
    deferred.resolve()
  })

  return deferred.promise
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
