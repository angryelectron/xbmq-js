/* global describe it xit */
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = chai.expect

var xbee = require('../lib/xbee.js')

describe('xbee', function () {
  describe('xbee.begin()', function () {
    it('should reject if port is invalid', function () {
      return expect(xbee.begin('/dev/null', 9600, 2, function (e, m) {}))
        .to.eventually.be.rejectedWith(Error)
    })

    it('should reject if baud is invalid', function () {
      return expect(xbee.begin('/dev/null', 'badbaud', 2, function (e, m) {}))
      .to.eventually.be.rejectedWith('Invalid "baudRate"')
    })

    it('should reject if apiMode is invalid', function () {
      return expect(xbee.begin('/dev/null', 9600, 'bad', function (e, m) {}))
      .to.eventually.be.rejectedWith('Invalid API mode')
    })

    it('should reject if callback is invalid', function () {
      return expect(xbee.begin('/dev/null', 9600, 2))
      .to.eventually.be.rejectedWith('Bad or missing messageCallback')
    })

    xit('should reject if serial port cannot be opened', function () {

    })

    xit('should open the serial port', function (done) {

    })

    xit('should call messageCallback with Error on XBee error', function (done) {

    })

    xit('should call messageCallback with XBee frame', function () {

    })
  })

  describe('xbee.end()', function () {
    xit('should resolve once the serial port is closed', function () {

    })

    xit('should resolve even if serialport is not open', function () {

    })
  })

  describe('xbee.transmitMqttMessage()', function () {
    it('should accept valid xbee-api frames', function () {
      var standardFrame = '{"type":9, "id":1, "command":"BD", "commandParameter":[7]}'
      var typeHex = '{"type":"0x09", "id":1, "command":"BD", "commandParameter":[7]}'
      var idHex = '{"type":9, "id":"0x01", "command":"BD", "commandParameter":[7]}'
      var noCP = '{"type":9, "id":1, "command":"BD"}'
      xbee.transmitMqttMessage(standardFrame)
      xbee.transmitMqttMessage(typeHex)
      xbee.transmitMqttMessage(idHex)
      xbee.transmitMqttMessage(noCP)
    })

    xit('should reject if frame is invalid', function () {

    })
  })

  describe('xbee.transmit', function () {
    xit('should reject if frame is invalid', function () {

    })

    xit('should resolve with a valid frame response', function () {

    })

    xit('should reject on timeout', function () {

    })

    xit('should reject on serial port error', function () {

    })
  })

  describe('xbee.getLocalAddress()', function () {
    xit('should resolve with an address string', function () {

    })

    xit('reject on error', function () {

    })
  })

  describe('xbee.getLocalNI()', function () {
    xit('should resolve with a node-identifier string', function () {

    })

    xit('should reject on error', function () {

    })
  })
})
