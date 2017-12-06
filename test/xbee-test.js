/* eslint-env mocha */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
chai.use(chaiAsPromised)
const expect = chai.expect

let XBee = require('../lib/xbee.js')
let SerialPort = require('serialport')
let VirtualSerialPort = require('serialport/test')
let XBeeAPI = require('xbee-api')

describe('XBee', () => {
  let xbee, options
  let callback = (e, m) => {}
  beforeEach(() => {
    SerialPort.Binding.createPort('/dev/TEST')
    options = {
      apiMode: 2,
      port: '/dev/TEST',
      baud: 9600,
      callback: callback
    }
    return XBee.create(VirtualSerialPort, XBeeAPI, options).then((instance) => {
      xbee = instance
    })
  })

  afterEach(() => {
    xbee.end()
  })

  describe('XBee#create', () => {
    it('rejects if port is invalid', () => {
      options.port = null
      return expect(XBee.create(SerialPort, XBeeAPI, options))
      .to.eventually.be.rejectedWith('Bad or missing arguments')
    })

    it('rejects if baud is invalid', () => {
      options.baud = 'invalid'
      return expect(XBee.create(SerialPort, XBeeAPI, options))
      .to.eventually.be.rejectedWith('must be a number')
    })

    it('rejects if apiMode is invalid', () => {
      options.apiMode = 'invalid'
      return expect(XBee.create(SerialPort, XBeeAPI, options))
      .to.eventually.be.rejectedWith('Invalid API mode')
    })

    it('rejects if callback is invalid', () => {
      options.callback = null
      return expect(XBee.create(SerialPort, XBeeAPI, options))
      .to.eventually.be.rejectedWith('Bad or missing callback')
    })

    it('creates an instance of XBee', () => {
      expect(xbee).to.be.instanceof(XBee)
    })

    it('rejects if serial port is already open', () => {
      return expect(XBee.create(SerialPort, XBeeAPI, options))
      .to.eventually.be.rejectedWith('Port is locked cannot open')
    })

    it('calls callback with Error on XBee error', function (done) {
      options.callback = (error, message) => {
        expect(error).to.be.instanceof(Error)
        expect(error).to.have.property('message', 'test')
        done()
      }
      xbee.xbeeAPI.parser.emit('error', Error('test'))
    })

    it('calls messageCallback with XBee frame', (done) => {
      options.callback = function (error, frame) {
        expect(error).to.equal(null)
        expect(frame).to.equal('test-frame')
        done()
      }
      xbee.xbeeAPI.parser.emit('data', 'test-frame')
    })
  })

  describe('XBee#transmitMqttMessage', () => {
    it('rejects if message is not JSON', () => {
      return expect(xbee.transmitMqttMessage('this-is-not-json'))
      .to.eventually.be.rejectedWith('Unexpected token')
    })

    it('rejects if message is not an API frame', () => {
      var badFrame = '{"type": "invalid"}'
      return expect(xbee.transmitMqttMessage(badFrame))
      .to.eventually.be.rejectedWith('does not implement building')
    })

    it('should accept valid xbee-api frames', () => {
      var standardFrame = '{"type":9, "id":1, "command":"BD", "commandParameter":[7]}'
      var typeHex = '{"type":"0x09", "id":1, "command":"BD", "commandParameter":[7]}'
      var idHex = '{"type":9, "id":"0x01", "command":"BD", "commandParameter":[7]}'
      var noCP = '{"type":9, "id":1, "command":"BD"}'
      return Promise.all([
        xbee.transmitMqttMessage(standardFrame),
        xbee.transmitMqttMessage(typeHex),
        xbee.transmitMqttMessage(idHex),
        xbee.transmitMqttMessage(noCP)
      ])
    })
  })

  describe('XBee#transmitFrame', () => {
    it('should reject if frame is invalid', () => {
      return expect(xbee.transmitFrame({type: 'invalid'}, 1)).to.eventually.be.rejectedWith('does not implement')
    })

    it('resolves with a response', () => {
      const testFrame = {
        type: 0x08,
        command: 'ID',
        commandParameter: []
      }
      // keep track of event listeners and handlers
      let addSpy = sinon.spy(xbee.xbeeAPI.parser, 'on')
      let removeSpy = sinon.spy(xbee.xbeeAPI.parser, 'removeListener')
      // short circuit the serial port pipe
      sinon.stub(xbee.xbeeAPI.builder, 'write').callsFake(() => {
        xbee.xbeeAPI.parser.emit('data', testFrame)
      })
      return xbee.transmitFrame(testFrame, 1000).then((responseFrame) => {
        expect(responseFrame).to.eql(testFrame)
        // ensure any added listeners are removed
        expect(addSpy.calledOnce).to.equal(true)
        expect(removeSpy.calledOnce).to.equal(true)
        expect(addSpy.calledWith('data'))
      })
    })

    it('should reject on timeout', () => {
      var testFrame = {
        type: 0x08,
        command: 'ID',
        commandParameter: []
      }
      return expect(xbee.transmitFrame(testFrame, 10)).to.eventually.be.rejectedWith('Timeout waiting for XBee')
    })
  })

  describe('xbee.getLocalAddress()', () => {
    xit('should resolve with an address string', () => {

    })

    xit('reject on error', () => {

    })
  })

  describe('xbee.getLocalNI()', () => {
    xit('should resolve with a node-identifier string', () => {

    })

    xit('should reject on error', () => {

    })
  })
})
