/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
chai.use(chaiAsPromised)
const expect = chai.expect
const EventEmitter = require('events')
const Xbmq = require('../lib/xbmq.js')

describe('Xbmq', () => {
  let xbmq, mockLogger, mockXBee, mockMqtt
  beforeEach(() => {
    mockLogger = sinon.stub()
    mockXBee = new EventEmitter()
    mockMqtt = new EventEmitter()
    xbmq = new Xbmq(mockXBee, mockMqtt, mockLogger)
  })
  describe('Xbmq#constructor', () => {
    it('handles mqtt messages', () => {
      const handlerStub = sinon.stub(xbmq, 'onMqttEvent')
      mockMqtt.emit('mqtt-msg', 'rootTopic', 'mqtt test')
      expect(handlerStub.calledWith(null, 'rootTopic', 'mqtt test')).to.be.true
    })
    it('handles mqtt errors', () => {
      const handlerStub = sinon.stub(xbmq, 'onMqttEvent')
      const error = Error('test-error')
      mockMqtt.emit('error', error)
      expect(handlerStub.calledWith(error)).to.be.true
    })
    it('handles mqtt debug messages', () => {
      mockMqtt.emit('debug', 'mqtt test')
      expect(mockLogger.calledWith('debug', 'mqtt test')).to.be.true
    })
    it('handles xbee messages', () => {
      const handlerStub = sinon.stub(xbmq, 'onXBeeEvent')
      mockXBee.emit('xbee-msg', 'test-frame')
      expect(handlerStub.calledWith(null, 'test-frame')).to.be.true
    })
    it('handles xbee errors', () => {
      const handlerStub = sinon.stub(xbmq, 'onXBeeEvent')
      const error = Error('xbee-error')
      mockXBee.emit('error', error)
      expect(handlerStub.calledWith(error)).to.be.true
    })
  })
  describe('Xbmq#convertToFrame', () => {
    it('throws if not a JSON string', () => {
      expect(() => {
        xbmq.convertToFrame('this is not JSON')
      }).to.throw('Unexpected token')
    })
    it('adds commandParameter if missing', () => {
      let message = '{}'
      let frame = xbmq.convertToFrame(message)
      expect(frame).to.have.property('commandParameter')
      expect(frame.commandParameter).to.have.property('length', 0)
      message = '{"commandParameter": ["one", "two"]}'
      frame = xbmq.convertToFrame(message)
      expect(frame.commandParameter).to.eql(['one', 'two'])
    })
    it('converts type strings to integers', () => {
      let message = '{"type": "0xdeadbeef"}'
      expect(xbmq.convertToFrame(message)).to.have.property('type', 0xdeadbeef)
      message = '{"type": "deadbeef"}'
      expect(xbmq.convertToFrame(message)).to.have.property('type').and.to.be.NaN
      message = '{"type": 1234}'
      expect(xbmq.convertToFrame(message)).to.have.property('type', 1234)
      message = '{"type": "1234"}'
      expect(xbmq.convertToFrame(message)).to.have.property('type', 1234)
    })
    it('converts id strings to integers', () => {
      let message = '{"id": "0xdeadbeef"}'
      expect(xbmq.convertToFrame(message)).to.have.property('id', 0xdeadbeef)
      message = '{"id": "deadbeef"}'
      expect(xbmq.convertToFrame(message)).to.have.property('id').and.to.be.NaN
      message = '{"id": 1234}'
      expect(xbmq.convertToFrame(message)).to.have.property('id', 1234)
      message = '{"id": "1234"}'
      expect(xbmq.convertToFrame(message)).to.have.property('id', 1234)
    })
  })
  describe('Xbmq#onXBeeEvent', () => {
    it('mqtt-publishes xbee errors', () => {
      xbmq.onXBeeEvent(Error('test-error'))
      expect(mockLogger.called).to.be.true
    })
    it('mqtt-publishes XBee frames', () => {
      xbmq.mqtt.publishXBeeFrame = sinon.stub()
      xbmq.onXBeeEvent(null, 'frame')
      expect(xbmq.mqtt.publishXBeeFrame.calledWith('frame')).to.be.true
    })
  })
  describe('Xbmq#onMqttEvent', () => {
    it('logs errors', () => {
      xbmq.onMqttEvent(Error('test-error'))
      expect(mockLogger.called).to.be.true
    })
    it('logs errors for unconvertable mqtt messages', () => {
      xbmq.onMqttEvent(null, 'rootTopic', 'unconvertable-message')
      sinon.assert.calledWith(mockLogger, 'error')
    })
    it('logs XBee errors', () => {
      xbmq.xbee.sendFrame = sinon.stub().throws(Error('xbee error'))
      xbmq.onMqttEvent(null, 'rootTopic', '{"message": "valid"}')
      expect(mockLogger.calledWith('error', 'xbee error'))
    })
    it('xbee-transmits frames received via mqtt', () => {

    })
  })
})
