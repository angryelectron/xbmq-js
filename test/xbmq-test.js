/* eslint-env jest */
const EventEmitter = require('events')
const Xbmq = require('../lib/xbmq.js')

describe('Xbmq', () => {
  let xbmq, mockLogger, mockXBee, mockMqtt
  beforeEach(() => {
    mockLogger = jest.fn()
    mockXBee = new EventEmitter()
    mockMqtt = new EventEmitter()
    xbmq = new Xbmq(mockXBee, mockMqtt, mockLogger)
  })
  describe('Xbmq#constructor', () => {
    it('handles mqtt messages', () => {
      xbmq.onMqttEvent = jest.fn()
      mockMqtt.emit('mqtt-msg', 'rootTopic', 'mqtt test')
      expect(xbmq.onMqttEvent).toHaveBeenCalledWith(null, 'rootTopic', 'mqtt test')
    })
    it('handles mqtt errors', () => {
      xbmq.onMqttEvent = jest.fn()
      const error = Error('test-error')
      mockMqtt.emit('error', error)
      expect(xbmq.onMqttEvent).toHaveBeenCalledWith(error)
    })
    it('handles mqtt debug messages', () => {
      mockMqtt.emit('debug', 'mqtt test')
      expect(mockLogger).toHaveBeenCalledWith('debug', 'mqtt test')
    })
    it('handles xbee messages', () => {
      xbmq.onXBeeEvent = jest.fn()
      mockXBee.emit('xbee-msg', 'test-frame')
      expect(xbmq.onXBeeEvent).toHaveBeenCalledWith(null, 'test-frame')
    })
    it('handles xbee errors', () => {
      xbmq.onXBeeEvent = jest.fn()
      const error = Error('xbee-error')
      mockXBee.emit('error', error)
      expect(xbmq.onXBeeEvent).toHaveBeenCalledWith(error)
    })
  })
  describe('Xbmq#convertToFrame', () => {
    it('throws if not a JSON string', () => {
      expect(() => {
        xbmq.convertToFrame('this is not JSON')
      }).toThrow('Unexpected token')
    })
    it('adds commandParameter if missing', () => {
      let message = '{}'
      let frame = xbmq.convertToFrame(message)
      expect(frame).toHaveProperty('commandParameter')
      expect(frame.commandParameter).toHaveProperty('length', 0)
      message = '{"commandParameter": ["one", "two"]}'
      frame = xbmq.convertToFrame(message)
      expect(frame.commandParameter).toEqual(['one', 'two'])
    })
    it('converts type strings to integers', () => {
      let message = '{"type": "0xdeadbeef"}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('type', 0xdeadbeef)
      message = '{"type": "deadbeef"}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('type', NaN)
      message = '{"type": 1234}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('type', 1234)
      message = '{"type": "1234"}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('type', 1234)
    })
    it('converts id strings to integers', () => {
      let message = '{"id": "0xdeadbeef"}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('id', 0xdeadbeef)
      message = '{"id": "deadbeef"}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('id', NaN)
      message = '{"id": 1234}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('id', 1234)
      message = '{"id": "1234"}'
      expect(xbmq.convertToFrame(message)).toHaveProperty('id', 1234)
    })
  })
  describe('Xbmq#onXBeeEvent', () => {
    it('mqtt-publishes xbee errors', () => {
      xbmq.onXBeeEvent(Error('test-error'))
      expect(mockLogger).toHaveBeenCalled()
    })
    it('mqtt-publishes XBee frames', () => {
      xbmq.mqtt.publishXBeeFrame = jest.fn()
      xbmq.onXBeeEvent(null, 'frame')
      expect(xbmq.mqtt.publishXBeeFrame).toHaveBeenCalledWith('frame')
    })
  })
  describe('Xbmq#onMqttEvent', () => {
    it('logs errors', () => {
      xbmq.onMqttEvent(Error('test-error'))
      expect(mockLogger).toHaveBeenCalled()
    })
    it('logs errors for unconvertable mqtt messages', () => {
      xbmq.onMqttEvent(null, 'rootTopic', 'unconvertable-message')
      expect(mockLogger).toHaveBeenCalledWith('error', expect.anything())
    })
    it('logs XBee errors', () => {
      xbmq.xbee.sendFrame = jest.fn().mockImplementation(() => { throw new Error('xbee error') })
      xbmq.onMqttEvent(null, 'rootTopic', '{"message": "valid"}')
      expect(mockLogger).toHaveBeenCalledWith('error', 'xbee error')
    })
  })
})
