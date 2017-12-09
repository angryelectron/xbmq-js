/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')
chai.use(chaiAsPromised)
const expect = chai.expect

const Xbmq = require('../lib/xbmq.js')

describe('Xbmq', () => {
  let xbmq, logger
  beforeEach(() => {
    logger = sinon.stub()
    xbmq = new Xbmq({}, {}, logger)
  })
  afterEach(() => {
    logger.reset()
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
      expect(logger.called).to.be.true
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
      expect(logger.called).to.be.true
    })
    it('logs errors for unconvertable mqtt messages', () => {
      xbmq.onMqttEvent(null, 'rootTopic', 'unconvertable-message')
      expect(logger.calledWith('error', 'Unexpected token u in JSON at position 0')).to.be.true
    })
    it('logs XBee errors', () => {
      xbmq.xbee.sendFrame = sinon.stub().throws(Error('xbee error'))
      xbmq.onMqttEvent(null, 'rootTopic', '{"message": "valid"}')
      expect(logger.calledWith('error', 'xbee error'))
    })
    it('xbee-transmits frames received via mqtt', () => {

    })
  })
})
