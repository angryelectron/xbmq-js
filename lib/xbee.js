var q = require('q')
var log = require('./logger.js')

module.exports = XBee

var self

function XBee (serialport, xbeeAPI) {
  this.serialport = serialport
  this.xbeeAPI = xbeeAPI
  self = this
}

XBee.create = function (SerialPort, XBeeAPI, options) {
  if (!SerialPort || !XBee || !options || !options.apiMode || !options.port || !options.baud) {
    return q.reject(Error('Bad or missing arguments'))
  } else if (options.apiMode !== 1 && options.apiMode !== 2) {
    return q.reject(TypeError('Invalid API mode (1 or 2)'))
  } else if (!options.callback || options.callback.length !== 2) {
    return q.reject(TypeError('Bad or missing callback.'))
  }
  var deferred = q.defer()
  var xbeeAPI = new XBeeAPI.XBeeAPI({
    api_mode: options.apiMode
  })
  try {
    var serialport = new SerialPort(
    options.port, {
      baudrate: options.baud,
      parser: xbeeAPI.rawParser()
    }
  )
  } catch (error) {
    return q.reject(error)
  }
  serialport.on('open', function () {
    deferred.resolve(new XBee(serialport, xbeeAPI))
  })
  serialport.on('error', function (error) {
    deferred.reject(error)
  })

  xbeeAPI.on('frame_object', function (frame) {
    options.callback(null, frame)
  })

  xbeeAPI.on('error', function (error) {
    options.callback(error, null)
  })
  return deferred.promise
}

/**
 * Close XBee connection.
 * @return {Promise}
 * @resolves When closed
 */
XBee.prototype.end = function (callback) {
  var deferred = q.defer()
  self.serialport.close(function () {
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
XBee.prototype.transmitMqttMessage = function (message) {
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
  self.serialport.write(self.xbeeAPI.buildFrame(frame), function () {
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
XBee.prototype.transmit = function (frame) {
  var timeout = 5000
  frame.id = self.xbeeAPI.nextFrameId()
  var deferred = q.defer()

  // if response matches request, resolve with response
  var callback = function (receivedFrame) {
    if (receivedFrame.id === frame.id) {
      deferred.resolve(receivedFrame)
    }
  }

  // create a response listener
  self.xbeeAPI.on('frame_object', callback)

  // remove the response listener once the timeout has elapsed
  setTimeout(function () {
    self.xbeeAPI.removeListener('frame_object', callback)
  }, timeout + 1000)

  // send the request
  self.serialport.write(self.xbeeAPI.buildFrame(frame))

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
XBee.prototype.getLocalAddress = function () {
  var gw = null
  var frame = {
    type: 0x08, // AT command
    command: 'SH',
    commandParameter: []
  }
  return self.transmit(frame).then(function (sh) {
    gw = sh.commandData.toString('hex')
    frame.command = 'SL'
    return self.transmit(frame)
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
XBee.prototype.getLocalNI = function () {
  var frame = {
    type: 0x08,
    command: 'NI',
    commandParameter: []
  }
  return self.transmit(frame).then(function (ni) {
    return ni.commandData.toString()
  })
}
